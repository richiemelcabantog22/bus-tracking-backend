// server.js
// AI-Driven Smart Public Transport Tracker Backend (Driver-ready with JWT, Headways)

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const https = require("https");
const jwt = require("jsonwebtoken");

// If you already have an auth router for /api/auth/login
const authRouter = require("./auth");

// --------------------------
// ENV + APP
// --------------------------
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_jwt";
const REQUIRE_AUTH = (process.env.REQUIRE_AUTH || "true").toLowerCase() === "true";

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Mount auth routes (login should return { token, capacity? })
app.use("/api/auth", authRouter);

// --------------------------
// In-memory DB
// --------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
  { id: "BUS-002", lat: 14.415655, lng: 121.04618, passengers: 20, targetStation: "HM Bus Terminal - Laguna" },
  { id: "BUS-003", lat: 14.415655, lng: 121.04618, passengers: 35, targetStation: "HM BUS Terminal - Calamba" },
  { id: "BUS-004", lat: 14.415655, lng: 121.04618, passengers: 10, targetStation: "HM Transport Inc. Quezon City" },
  { id: "BUS-005", lat: 14.265278, lng: 121.428961, passengers: 14, targetStation: "VTX - Vista Terminal Exchange Alabang" },
  { id: "BUS-006", lat: 14.204603, lng: 121.156868, passengers: 30, targetStation: "VTX - Vista Terminal Exchange Alabang" },
  { id: "BUS-007", lat: 14.623390644859652, lng: 121.04877752268187, passengers: 31, targetStation: "VTX - Vista Terminal Exchange Alabang" },
];

// Ensure targetStation exists
for (const b of buses) {
  if (!b.targetStation) b.targetStation = "Unknown";
}

// Track simple incidents in-memory (optional)
const incidents = [];

// --------------------------
// Stations
// --------------------------
const STATION = {
  VTX: {
    name: "VTX - Vista Terminal Exchange Alabang",
    lat: 14.415655,
    lng: 121.04618,
    radius: 50,
  },
  "HM-Laguna": {
    name: "HM Bus Terminal - Laguna",
    lat: 14.265278,
    lng: 121.428961,
    radius: 50,
  },
  "HM-Calamba": {
    name: "HM BUS Terminal - Calamba",
    lat: 14.204603,
    lng: 121.156868,
    radius: 50,
  },
  "HM-Quezon": {
    name: "HM Transport Inc. Quezon City",
    lat: 14.623390644859652,
    lng: 121.04877752268187,
    radius: 50,
  },
};

// --------------------------
// Helpers
// --------------------------
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function detectStation(bus) {
  for (const key of Object.keys(STATION)) {
    const s = STATION[key];
    const d = distanceMeters(bus.lat, bus.lng, s.lat, s.lng);
    if (d <= s.radius) {
      bus.isAtStation = true;
      bus.currentStation = s.name;
      return;
    }
  }
  bus.isAtStation = false;
  bus.currentStation = null;
}

// OSRM route fetcher (HTTPS, no node-fetch)
function getOSRMRoute(startLat, startLng, endLat, endLng) {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    https
      .get(url, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            if (!json.routes || !json.routes[0]) return resolve(null);
            const r = json.routes[0];
            const coords = r.geometry.coordinates.map((c) => ({ lat: c[1], lng: c[0] }));
            resolve({
              polyline: coords,
              duration: r.duration, // seconds
              distance: r.distance, // meters
            });
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

// --------------------------
// AI-ish analytics helpers
// --------------------------
function movementMonitoring(bus) {
  const now = Date.now();
  if (!bus._lastLat || !bus._lastLng) {
    bus._lastLat = bus.lat;
    bus._lastLng = bus.lng;
    bus._lastMoveTime = now;
    bus.movement = "stable";
    return bus.movement;
  }
  const dist = Math.abs(bus.lat - bus._lastLat) + Math.abs(bus.lng - bus._lastLng);
  const meters = dist * 111000;
  const timeDiff = (now - (bus._lastMoveTime || now)) / 1000;
  const speed = meters / (timeDiff === 0 ? 1 : timeDiff);

  if (meters > 200) {
    bus.movement = "teleport";
  } else if (speed < 1) {
    if (now - (bus._lastMoveTime || now) > 20000) {
      bus.movement = "idle";
    } else {
      bus.movement = "stable";
    }
  } else if (speed < 4) {
    bus.movement = "slowdown";
  } else {
    bus.movement = "stable";
  }

  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;
  bus._lastMoveTime = now;

  return bus.movement;
}

function predictPassengers(bus) {
  const current = bus.passengers;
  const hour = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    hour12: false,
  });
  let rushFactor = 1.0;
  if (hour >= 6 && hour <= 9) rushFactor = 1.35;
  if (hour >= 17 && hour <= 20) rushFactor = 1.5;

  const nearTerminal =
    bus.lat >= 14.410 &&
    bus.lat <= 14.420 &&
    bus.lng >= 121.035 &&
    bus.lng <= 121.048;

  const terminalBoost = nearTerminal ? 1.25 : 1.0;
  const prediction = Math.round(current * rushFactor * terminalBoost);
  return Math.min(prediction, 40);
}

function predictCrowdFlow(bus) {
  if (!bus._history) bus._history = [];
  if (bus._history.length > 5) bus._history.shift();
  if (bus._history.length < 3) return "stable";

  const a = bus._history[bus._history.length - 3];
  const b = bus._history[bus._history.length - 2];
  const c = bus._history[bus._history.length - 1];
  const delta1 = b - a;
  const delta2 = c - b;

  if (delta1 > 5 && delta2 > 5) return "spike";
  if (delta1 < -5 && delta2 < -5) return "drop";
  if (delta2 > 2) return "increasing";
  if (delta2 < -2) return "decreasing";
  return "stable";
}

function explainCrowdChange(bus) {
  const history = bus.history || [];
  if (history.length < 3) return "Insufficient data";

  const last = history[history.length - 1].passengers;
  const prev = history[history.length - 2].passengers;
  const diff = last - prev;

  if (diff > 5) return "Crowd rising — bus likely approaching a busy stop.";
  if (diff < -5) return "Crowd dropping — passengers recently got off at a stop.";

  if (bus.nearStop) {
    if (diff > 0) return `Passengers boarding at ${bus.nearStop}`;
    if (diff < 0) return `Passengers alighting at ${bus.nearStop}`;
  }

  if (bus.movement === "slow") return "Slow movement — may be picking up more passengers.";
  if (bus.movement === "stopped") return "Stopped — possible passenger loading/unloading.";

  return "Stable passenger flow";
}

function classifyDrivePattern(bus) {
  if (!bus._speedHistory) bus._speedHistory = [];

  const now = Date.now();
  const lastLat = bus._speedLat ?? bus.lat;
  const lastLng = bus._speedLng ?? bus.lng;
  const dt = ((now - (bus._speedTime || now)) / 1000) || 1;

  const dist = Math.abs(bus.lat - lastLat) + Math.abs(bus.lng - lastLng);
  const meters = dist * 111000;
  const speed = meters / dt;

  bus._speedHistory.push(speed);
  if (bus._speedHistory.length > 10) bus._speedHistory.shift();

  bus._speedLat = bus.lat;
  bus._speedLng = bus.lng;
  bus._speedTime = now;

  if (bus._speedHistory.length < 4) return "unknown";

  const avg = bus._speedHistory.reduce((a, b) => a + b) / bus._speedHistory.length;
  const variance =
    bus._speedHistory.map((v) => Math.abs(v - avg)).reduce((a, b) => a + b) /
    bus._speedHistory.length;

  if (variance < 0.4 && avg > 4) return "Smooth";
  if (variance > 2.2) return "Aggressive";
  if (avg < 0.5 && variance < 0.3) return "Idle-too-long";
  if (avg > 0.5 && avg < 2 && variance > 0.8) return "Stop-and-go";
  if (avg < 0.8 && variance > 1.0) return "Drifting";

  return "Smooth";
}

function detectAnomalies(bus) {
  const anomalies = [];
  const add = (code, message, level) => anomalies.push({ code, message, level });

  if (bus.passengers >= 38) add("overcrowding", "Bus is overcrowded", "high");

  if (!bus._lastPassengers) bus._lastPassengers = bus.passengers;
  const diff = Math.abs(bus.passengers - bus._lastPassengers);
  if (diff >= 15) add("spike", "Passenger spike detected", "medium");
  bus._lastPassengers = bus.passengers;

  if (!bus._lastLat) {
    bus._lastLat = bus.lat;
    bus._lastLng = bus.lng;
  }
  const jump = Math.abs(bus.lat - bus._lastLat) + Math.abs(bus.lng - bus._lastLng);
  if (jump > 0.003) add("gps_jump", "Abnormal GPS movement", "medium");
  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;

  if (bus.passengers <= 2) add("low", "Bus is unusually empty", "low");
  return anomalies;
}

function pushHistoryRecord(bus) {
  if (!bus._historyRecords) bus._historyRecords = [];
  if (bus.passengers !== bus._lastHistoryValue) {
    bus._historyRecords.push({
      t: Date.now(),
      p: bus.passengers,
    });
    if (bus._historyRecords.length > 30) {
      bus._historyRecords = bus._historyRecords.slice(-30);
    }
    bus._lastHistoryValue = bus.passengers;
  }
}

function forecastPassengers(bus, minutes) {
  const rec = bus._historyRecords || [];
  if (rec.length < 2) {
    const base = predictPassengers(bus);
    return { predicted: base, confidence: 0.5 };
  }

  const last = rec[rec.length - 1];
  const prev = rec[rec.length - 2];
  const dt = (last.t - prev.t) / 1000; // seconds
  const dp = last.p - prev.p;
  const ratePerSec = dt === 0 ? 0 : dp / dt;

  const secondsAhead = minutes * 60;
  let predicted = last.p + ratePerSec * secondsAhead;

  const baseline = predictPassengers(bus);
  const weight = Math.min(0.6, 0.1 * rec.length);
  predicted = Math.round(baseline * (1 - weight) + predicted * weight);

  if (predicted < 0) predicted = 0;
  if (predicted > 40) predicted = 40;

  const confidence = Math.min(0.95, 0.4 + 0.12 * rec.length);
  return { predicted, confidence };
}

function riskLevelFromCount(count) {
  if (count >= 36) return "Critical";
  if (count >= 30) return "Warning";
  return "Normal";
}

function updateHistory(bus) {
  if (!Array.isArray(bus._history)) bus._history = [];
  const MAX = 5;
  if (bus._history[0] !== bus.passengers) {
    bus._history.unshift(bus.passengers);
  }
  if (bus._history.length > MAX) {
    bus._history = bus._history.slice(0, MAX);
  }
}

function delayReasonAI(bus) {
  if (!bus.etaSeconds || !bus.targetStation) {
    return "Unknown – no route or ETA";
  }
  const eta = bus.etaSeconds;
  const crowd = bus.passengers;
  const move = bus.movement || "stable";

  if (crowd >= 32) return "Delay due to high passenger load";

  const hour = new Date().getHours();
  if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) {
    if (eta > 900) return "Heavy rush-hour traffic";
  }

  if (move === "idle") return "Possible stopover or traffic jam";
  if (move === "slowdown") return "Slow traffic conditions";

  if (bus.anomalies && bus.anomalies.find((a) => a.code === "gps_jump")) {
    return "GPS instability affecting ETA";
  }

  if (bus._historyRecords && bus._historyRecords.length >= 2) {
    const last = bus._historyRecords.at(-1).p;
    const prev = bus._historyRecords.at(-2).p;
    if (last - prev >= 8) return "Passenger loading delay";
  }

  return "Normal conditions";
}

function computeDriverSafetyScore(bus) {
  let score = 100;
  const notes = [];

  const dp = (bus.drivePattern || "unknown").toLowerCase();

  if (dp.includes("aggressive")) {
    score -= 25;
    notes.push("Aggressive driving pattern");
  } else if (dp.includes("stop-and-go")) {
    score -= 15;
    notes.push("Frequent stop-and-go driving");
  } else if (dp.includes("idle-too-long")) {
    score -= 10;
    notes.push("Idling too long");
  } else if (dp.includes("drifting")) {
    score -= 10;
    notes.push("Drifting pattern");
  } else if (dp.includes("smooth")) {
    notes.push("Smooth driving");
  }

  if (bus.anomalies && bus.anomalies.length > 0) {
    for (const a of bus.anomalies) {
      if (a.code === "gps_jump") {
        score -= 10;
        notes.push("Irregular GPS movement");
      }
      if (a.code === "spike") {
        score -= 10;
        notes.push("Passenger spike event");
      }
      if (a.code === "overcrowding") {
        score -= 5;
        notes.push("Overcrowding detected");
      }
    }
  }

  if (bus.crowdFlow === "spike") {
    score -= 5;
    notes.push("Sudden passenger increase");
  }
  if (bus.crowdFlow === "drop") {
    score -= 3;
    notes.push("Abrupt off-boarding");
  }

  score = Math.max(0, Math.min(100, score));

  let rating = "Good";
  if (score >= 90) rating = "Excellent";
  else if (score >= 75) rating = "Good";
  else if (score >= 55) rating = "Fair";
  else rating = "Poor";

  return {
    safetyScore: score,
    safetyRating: rating,
    safetyNotes: notes,
  };
}

// --------------------------
// Headway computation
// --------------------------
function computeHeadways(arr) {
  const groups = new Map();
  for (const b of arr) {
    const key = b.targetStation || "UNKNOWN";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }

  for (const [, list] of groups) {
    for (const b of list) {
      const station = Object.values(STATION).find((s) => s.name === b.targetStation);
      if (station) {
        b._distToDest = distanceMeters(b.lat, b.lng, station.lat, station.lng);
      } else {
        b._distToDest = Infinity;
      }
    }

    list.sort((a, b) => (a._distToDest || Infinity) - (b._distToDest || Infinity));

    for (let i = 0; i < list.length; i++) {
      const bus = list[i];
      if (i === 0) {
        bus.headwayMeters = null;
        bus.headwayAheadId = null;
        bus.headwayEtaSeconds = null;
      } else {
        const ahead = list[i - 1];
        const gapMeters = Math.max(0, (bus._distToDest || 0) - (ahead._distToDest || 0));
        const estSeconds = Math.round(gapMeters / 10); // ~36km/h
        bus.headwayMeters = Math.round(gapMeters);
        bus.headwayAheadId = ahead.id;
        bus.headwayEtaSeconds = estSeconds;
      }
    }
  }

  for (const b of arr) delete b._distToDest;
}

// --------------------------
// Auth middlewares (optional: enabled if REQUIRE_AUTH=true)
// --------------------------
function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, message: "Missing token" });
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.busId && req.params.id && payload.busId !== req.params.id) {
      return res.status(403).json({ ok: false, message: "Bus mismatch" });
    }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

io.use((socket, next) => {
  if (!REQUIRE_AUTH) return next();
  try {
    const authToken =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.headers && (socket.handshake.headers.authorization || "").replace("Bearer ", ""));
    if (!authToken) return next(new Error("Unauthorized"));
    const payload = jwt.verify(authToken, JWT_SECRET);
    socket.data.user = payload;
    next();
  } catch (e) {
    next(new Error("Unauthorized"));
  }
});

// --------------------------
// Enrichment pipeline
// --------------------------
function buildEnriched() {
  const enriched = buses.map((b) => {
    detectStation(b);
    if (!b._historyRecords) b._historyRecords = [];

    const anomalies = detectAnomalies(b);
    const predicted = predictPassengers(b);
    const movement = movementMonitoring(b);
    const crowdFlow = predictCrowdFlow(b);
    const drivePattern = classifyDrivePattern(b);

    const f5 = forecastPassengers(b, 5);
    const f10 = forecastPassengers(b, 10);
    const predicted5min = f5.predicted;
    const predicted10min = f10.predicted;

    const safety = computeDriverSafetyScore(b);
    const risk5min = riskLevelFromCount(predicted5min);
    const risk10min = riskLevelFromCount(predicted10min);

    let delayState = "unknown";
    if (b.etaSeconds !== null && typeof b.etaSeconds === "number") {
      const eta = b.etaSeconds;
      if (eta > 1200) delayState = "late";
      else if (eta < 240) delayState = "ahead";
      else delayState = "on-time";
    }

    return {
      ...b,
      predicted,
      anomalies,
      alertLevel: anomalies[0]?.level || "normal",
      alertMessage: anomalies[0]?.message || "",
      movement,
      crowdFlow,
      predicted5min,
      predicted10min,
      risk5min,
      risk10min,
      delayState,
      forecastConfidence: Math.min(1, ((f5.confidence + f10.confidence) / 2) || 0.5),
      crowdExplanation: b.crowdExplanation || "Stable",
      targetStation: b.targetStation || null,
      route: b.route || null,
      etaSeconds: b.etaSeconds || null,
      etaText: b.etaText || null,
      delayReason: delayReasonAI(b),
      drivePattern,
      safetyScore: safety.safetyScore,
      safetyRating: safety.safetyRating,
      safetyNotes: safety.safetyNotes,
      isAtStation: b.isAtStation || false,
      currentStation: b.currentStation || null,
      headwayMeters: b.headwayMeters || null,
      headwayAheadId: b.headwayAheadId || null,
      headwayEtaSeconds: b.headwayEtaSeconds || null,
    };
  });

  computeHeadways(enriched);

  for (const b of enriched) {
    if (typeof b.headwayMeters === "number") {
      const km = (b.headwayMeters / 1000).toFixed(b.headwayMeters >= 1000 ? 1 : 2);
      const t = b.headwayEtaSeconds != null ? Math.max(1, Math.round(b.headwayEtaSeconds / 60)) + " min" : "—";
      b.headwayText = `${km} km · ${t}`;
    } else {
      b.headwayText = "—";
    }
  }

  return enriched;
}

// --------------------------
// Routes
// --------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend with AI, JWT & Headways running!");
});

app.get("/api/buses", (req, res) => {
  res.json(buildEnriched());
});

app.post("/api/incidents", (req, res) => {
  const { busId, category, details, lat, lng, timestamp } = req.body || {};
  if (!busId || !category) {
    return res.status(400).json({ ok: false, message: "Missing busId or category" });
  }
  incidents.push({
    id: `INC-${incidents.length + 1}`,
    busId,
    category,
    details: details || "",
    lat: lat ?? null,
    lng: lng ?? null,
    timestamp: timestamp || new Date().toISOString(),
  });
  io.emit("incident", incidents[incidents.length - 1]);
  res.status(201).json({ ok: true });
});

// Update bus location/route
app.post("/api/buses/:id/update", requireAuth, async (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers, targetStation, route } = req.body || {};

  const bus = buses.find((b) => b.id === id);
  if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });

  if (lat === undefined || lng === undefined || passengers === undefined) {
    return res.status(400).json({ ok: false, message: "Missing lat, lng, or passengers" });
  }

  // Update base fields
  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

  // Persist client route if provided
  if (Array.isArray(route) && route.length >= 2) {
    bus.route = route.map((p) => ({ lat: p.lat, lng: p.lng }));
  }

  // Handle target station update
  if (targetStation) {
    bus.targetStation = targetStation;

    const stations = {
      "VTX - Vista Terminal Exchange Alabang": { lat: 14.415655, lng: 121.04618 },
      "HM Bus Terminal - Laguna": { lat: 14.265278, lng: 121.428961 },
      "HM BUS Terminal - Calamba": { lat: 14.204603, lng: 121.156868 },
      "HM Transport Inc. Quezon City": { lat: 14.623390644859652, lng: 121.04877752268187 },
    };

    const dest = stations[bus.targetStation];
    if (dest) {
      const osrm = await getOSRMRoute(bus.lat, bus.lng, dest.lat, dest.lng);
      if (osrm) {
        bus.route = osrm.polyline;
        bus.etaSeconds = Math.round(osrm.duration);
        bus.etaText = `${Math.max(1, Math.round(osrm.duration / 60))} min`;
      } else {
        bus.route = null;
        bus.etaSeconds = null;
        bus.etaText = null;
      }
    }
  }

  // History updates
  if (!bus._lastHistoryValue) bus._lastHistoryValue = bus.passengers;
  updateHistory(bus);
  pushHistoryRecord(bus);

  // Movement + crowdFlow cache (still recomputed in buildEnriched)
  bus.movement = movementMonitoring(bus);
  bus.crowdFlow = predictCrowdFlow(bus);

  // Crowd explanation safe call
  try {
    bus.crowdExplanation = explainCrowdChange(bus);
  } catch {
    bus.crowdExplanation = "No explanation available";
  }

  // Broadcast enriched snapshot
  try {
    io.emit("buses_update", buildEnriched());
  } catch (err) {
    console.error("Socket emit error:", err);
  }

  return res.json({ ok: true, bus });
});

// --------------------------
// Socket.io
// --------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buildEnriched());

  socket.on("driver_join", (payload) => {
    try {
      const { busId } = payload || {};
      if (busId) {
        socket.join(busId);
        console.log(`Socket ${socket.id} joined room ${busId}`);
      }
    } catch (e) {
      console.warn("driver_join error:", e);
    }
  });

  socket.on("disconnect", () => {
    // cleanup if needed
  });
});

// --------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
