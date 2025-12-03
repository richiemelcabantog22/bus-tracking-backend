// server(november26)-A8.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --------------------------
// DATABASE
// --------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
  { id: "BUS-002", lat: 14.415655, lng: 121.046180, passengers: 20 },
];
//---------------------------------------------------------

// --------------------------
// OSRM FETCH HELPERS
// --------------------------

// ---------------------------
// OSRM Route Fetcher (no node-fetch)
// ---------------------------
const https = require("https");

// OSRM route fetcher (no node-fetch)
function getOSRMRoute(startLat, startLng, endLat, endLng) {
  return new Promise((resolve) => {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    https.get(url, (res) => {
      let raw = "";

      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(raw);
          if (!json.routes || !json.routes[0])
            return resolve(null);

          const r = json.routes[0];

          const coords = r.geometry.coordinates.map((c) => ({
            lat: c[1],
            lng: c[0],
          }));

          resolve({
            polyline: coords,
            duration: r.duration,  // seconds
            distance: r.distance,  // meters
          });
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}


// --------------------------
// movementMonitoring (unchanged from your file)
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

// --------------------------
// predictPassengers (unchanged)
// --------------------------
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
    bus.lat >= 14.410 && bus.lat <= 14.420 &&
    bus.lng >= 121.035 && bus.lng <= 121.048;

  const terminalBoost = nearTerminal ? 1.25 : 1.0;
  const prediction = Math.round(current * rushFactor * terminalBoost);
  return Math.min(prediction, 40);
}

// --------------------------
// predictCrowdFlow (unchanged)
// --------------------------
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

// -------------------------------------------------

function explainCrowdChange(bus) {
  const history = bus.history || [];
  if (history.length < 3) return "Insufficient data";

  const last = history[history.length - 1].passengers;
  const prev = history[history.length - 2].passengers;
  const diff = last - prev;

  // Trend
  if (diff > 5) {
    return "Crowd rising — bus likely approaching a busy stop.";
  }
  if (diff < -5) {
    return "Crowd dropping — passengers recently got off at a stop.";
  }

  // Stop proximity pattern
  if (bus.nearStop) {
    if (diff > 0) return `Passengers boarding at ${bus.nearStop}`;
    if (diff < 0) return `Passengers alighting at ${bus.nearStop}`;
  }

  // Movement-based reasoning
  if (bus.movement === "slow") {
    return "Slow movement — may be picking up more passengers.";
  }

  if (bus.movement === "stopped") {
    return "Stopped — possible passenger loading/unloading.";
  }

  return "Stable passenger flow";
}


// --------------------------
// detectAnomalies (unchanged structure)
// --------------------------
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

// --------------------------
// Forecast helpers (A-8 added)
// --------------------------

// Save a timestamped history record (call when updating)
function pushHistoryRecord(bus) {
  // --- HISTORY RECORDING (anti-duplicate) ---
if (bus.passengers !== bus._lastHistoryValue) {
  bus._historyRecords.push({
    t: Date.now(),
    p: bus.passengers,
  });

  // keep last 30 only (avoid memory bloating)
  if (bus._historyRecords.length > 30) {
    bus._historyRecords = bus._historyRecords.slice(-30);
  }

  bus._lastHistoryValue = bus.passengers;  // update last record
}
}

// Forecast passengers by linear extrapolation from recent history
// minutes: number (e.g., 5 or 10)
function forecastPassengers(bus, minutes) {
  // If we don't have fine-grained history, fallback to predictPassengers()
  const rec = bus._historyRecords || [];

  // If no history, use AI prediction as baseline
  if (rec.length < 2) {
    const base = predictPassengers(bus);
    return { predicted: base, confidence: 0.5 };
  }

  // Use the last two records to compute rate (passengers per second)
  const last = rec[rec.length - 1];
  // find a previous record that's not identical timestamp
  let prev = rec[rec.length - 2];
  // compute rate
  const dt = (last.t - prev.t) / 1000; // seconds
  const dp = last.p - prev.p;
  const ratePerSec = dt === 0 ? 0 : dp / dt;

  // project
  const secondsAhead = minutes * 60;
  let predicted = last.p + ratePerSec * secondsAhead;

  // smooth with predictPassengers baseline (blend)
  const baseline = predictPassengers(bus);
  // compute a simple weight based on rec length
  const weight = Math.min(0.6, 0.1 * rec.length); // more records -> more trust
  predicted = Math.round(baseline * (1 - weight) + predicted * weight);

  // clamp
  if (predicted < 0) predicted = 0;
  if (predicted > 40) predicted = 40;

  // confidence roughly
  const confidence = Math.min(0.95, 0.4 + 0.12 * rec.length);

  return { predicted, confidence };
}

function riskLevelFromCount(count) {
  if (count >= 36) return "critical";
  if (count >= 30) return "warning";
  return "normal";
}
// -----------------------------------------------

function updateHistory(bus) {
  if (!Array.isArray(bus._history)) bus._history = [];

  const MAX = 5;

  // Only push if NEW value, avoid duplicates
  if (bus._history[0] !== bus.passengers) {
    bus._history.unshift(bus.passengers);
  }

  // Limit to last 5 samples
  if (bus._history.length > MAX) {
    bus._history = bus._history.slice(0, MAX);
  }
}


// --------------------------
// Build enriched bus data (includes forecasts)
// --------------------------
function buildEnriched() {
  return buses.map(b => {
    
    // ensure historyRecords exist
    if (!b._historyRecords) b._historyRecords = [];
    // compute base fields
    const anomalies = detectAnomalies(b);
    const first = anomalies[0];
    const predicted = predictPassengers(b);
    const movement = movementMonitoring(b);
    const crowdFlow = predictCrowdFlow(b);

    // forecasts
    const f5 = forecastPassengers(b, 5);
    const f10 = forecastPassengers(b, 10);
    const predicted5min = f5.predicted;
    const predicted10min = f10.predicted;

    const risk5min = riskLevelFromCount(predicted5min);
    const risk10min = riskLevelFromCount(predicted10min);
    // -----------------------------
// A-14 Delay Detection (clean version)
// -----------------------------
let delayState = "unknown";

if (b.etaSeconds !== null && typeof b.etaSeconds === "number") {
  const eta = b.etaSeconds;

  if (eta > 1200) delayState = "late";        // more than 20 min
  else if (eta < 240) delayState = "ahead";   // less than 4 min
  else delayState = "on-time";                // normal
}
    return {
      ...b,
      predicted,
      anomalies,
      alertLevel: first?.level || "normal",
      alertMessage: first?.message || "",
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
      delayState,
    };
  });
}

// --------------------------
// Routes
// --------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend with AI & Multi-Bus Forecast (A-8) running!");
});

app.get("/api/buses", (req, res) => {
  res.json(buildEnriched());
});

// Update route — stores a history record and broadcasts enriched data
app.post("/api/buses/:id/update", async (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find(b => b.id === id);
  if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });

  // Validate
  if (lat === undefined || lng === undefined || passengers === undefined) {
    return res.status(400).json({ ok: false, message: "Missing lat, lng, or passengers" });
  }

  // Read target station if provided
  if (req.body.targetStation) {
  bus.targetStation = req.body.targetStation;

  // ---- STATION LOOKUP TABLE ----
  const stations = {
    "VTX - Vista Terminal Exchange Alabang": { lat: 14.415655, lng: 121.046180 },
    "HM Bus Terminal - Laguna":     { lat: 14.265278, lng: 121.428961 },
    "HM BUS Terminal - Calamba":     { lat: 14.204603, lng: 121.156868 },
    "HM Transport Inc. Quezon City": { lat: 14.623390644859652, lng: 121.04877752268187 },
  };

  const dest = stations[bus.targetStation];

  if (dest) {
    console.log(`🛰 Generating route to ${bus.targetStation}`);

    // REQUEST OSRM ROUTE
    const osrm = await getOSRMRoute(bus.lat, bus.lng, dest.lat, dest.lng);

if (osrm) {
  bus.route = osrm.polyline;

  // -------- ETA FIX --------
  bus.etaSeconds = Math.round(osrm.duration);
  bus.etaText = `${Math.max(1, Math.round(osrm.duration / 60))} min`;
} else {
  bus.route = null;
  bus.etaSeconds = null;
  bus.etaText = null;
}

io.emit("buses_update", buildEnriched());
  }
}

  // Update
  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;
  
  // push history record for forecasting
  if (!bus._lastHistoryValue) bus._lastHistoryValue = bus.passengers;
  updateHistory(bus);
  pushHistoryRecord(bus);

  // ------------------------------
// OSRM ROUTE UPDATE (if station selected)
// ------------------------------
if (bus.targetStation && bus.stationLat && bus.stationLng) {
  bus.route = await getOSRMRoute(
    bus.lat,
    bus.lng,
    bus.stationLat,
    bus.stationLng
  );
}

  // update derived fields (movement and crowdFlow are updated inside buildEnriched, but we can precompute)
  bus.movement = movementMonitoring(bus);
  bus.crowdFlow = predictCrowdFlow(bus);

  // Broadcast enriched snapshot
  try {
    io.emit("buses_update", buildEnriched());
  } catch (err) {
    console.error("Socket emit error:", err);
  }

  try {
  bus.crowdExplanation = explainCrowdChange(bus);
} catch (e) {
  bus.crowdExplanation = "No explanation available";
}


  // ----------------------------------------------
// FIXED PASSENGER HISTORY LOGIC (A-8 important)
// ----------------------------------------------
if (!Array.isArray(bus._history)) {
  bus._history = [];
}

// Only record if changed (prevents 40,40,40,40,40)


  return res.json({ ok: true, bus });
});

// --------------------------
// Socket.io
// --------------------------
io.on("connection", socket => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buildEnriched());
});

// --------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

















