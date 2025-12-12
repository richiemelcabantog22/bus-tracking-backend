// server.js
// AI-Driven Smart Public Transport Tracker Backend
// ESM-ready, AdminJS v7 + @adminjs/express v6 (sessionless), @adminjs/mongoose v4

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import https from "https";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import { Database, Resource } from "@adminjs/mongoose";
import Bus from "./models/Bus.js";
import Driver from "./models/Driver.js";
import User from "./models/User.js";
import Incident from "./models/Incident.js";
import dotenv from "dotenv";
dotenv.config();


import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// --------------------------
// ENV
// --------------------------
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/transtrack";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_jwt";
const REQUIRE_AUTH = (process.env.REQUIRE_AUTH || "true").toLowerCase() === "true";
const ADMIN_KEY = process.env.ADMIN_KEY || "dev_admin_key";

// --------------------------
// APP + SOCKET
// --------------------------
const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --------------------------
// MongoDB Models
// --------------------------
mongoose.set("strictQuery", true);

async function connectAndSeed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
    await seedDefaults();
  } catch (e) {
    console.error("MongoDB connection error:", e);
    // do not exit — allow server to start in some environments
  }
}

// Schemas


// --------------------------
// Seed defaults (DEV)
// --------------------------
async function seedDefaults() {
  try {
    // --------- Drivers ---------
    const countDrivers = await Driver.countDocuments();
    if (countDrivers === 0) {
      const defaults = [
        "BUS-001",
        "BUS-002",
        "BUS-003",
        "BUS-004",
        "BUS-005",
        "BUS-006",
        "BUS-007",
      ];
      for (let i = 0; i < defaults.length; i++) {
        const busId = defaults[i];
        const pin = String(1000 + i);
        const pinHash = await bcrypt.hash(pin, 10);
        await Driver.create({ busId, pinHash, capacity: 40 });
        console.log(`Seeded driver ${busId} with PIN ${pin} (DEV)`);
      }
    }

    // --------- Buses ---------
    const countBuses = await Bus.countDocuments();
    if (countBuses === 0) {
      const seedBuses = [
        { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
        { id: "BUS-002", lat: 14.415655, lng: 121.04618, passengers: 20, targetStation: "HM Bus Terminal - Laguna" },
        { id: "BUS-003", lat: 14.415655, lng: 121.04618, passengers: 35, targetStation: "HM BUS Terminal - Calamba" },
        { id: "BUS-004", lat: 14.415655, lng: 121.04618, passengers: 10, targetStation: "HM Transport Inc. Quezon City" },
        { id: "BUS-005", lat: 14.265278, lng: 121.428961, passengers: 14, targetStation: "VTX - Vista Terminal Exchange Alabang" },
        { id: "BUS-006", lat: 14.204603, lng: 121.156868, passengers: 30, targetStation: "VTX - Vista Terminal Exchange Alabang" },
        { id: "BUS-007", lat: 14.623390644859652, lng: 121.04877752268187, passengers: 31, targetStation: "VTX - Vista Terminal Exchange Alabang" },
      ];
      await Bus.insertMany(seedBuses);
      console.log("Seeded buses collection (DEV)");
    }

    // --------- Users ---------
    const countUsers = await User.countDocuments();
    if (countUsers === 0) {
      const seedUsers = [
        { name: "Alice", email: "alice@example.com", passwordHash: await bcrypt.hash("password", 10) },
        { name: "Bob", email: "bob@example.com", passwordHash: await bcrypt.hash("password", 10) },
        { name: "Charlie", email: "charlie@example.com", passwordHash: await bcrypt.hash("password", 10) },
      ];
      await User.insertMany(seedUsers);
      console.log("Seeded users collection (DEV)");
    }

    // --------- Incidents ---------
    const countIncidents = await Incident.countDocuments();
    if (countIncidents === 0) {
      const seedIncidents = [
        { busId: "BUS-001", category: "accident", details: "Minor collision", lat: 14.4096, lng: 121.039 },
        { busId: "BUS-003", category: "traffic", details: "Heavy congestion", lat: 14.415655, lng: 121.04618 },
      ];
      await Incident.insertMany(seedIncidents);
      console.log("Seeded incidents collection (DEV)");
    }
  } catch (e) {
    console.error("seedDefaults error:", e);
  }
}




// --------------------------
// AdminJS Setup (v7 + @adminjs/mongoose v4)
// --------------------------
AdminJS.registerAdapter({ Database, Resource });
//--------------------------------------

// --------------------------------------------
// AdminJS Setup (v7) -- FIXED VERSION
// --------------------------------------------
import { ComponentLoader } from "adminjs";


// Component loader (v7 requirement)
const componentLoader = new ComponentLoader();

// AdminJS Instance
const Components = {
  Dashboard: componentLoader.add("Dashboard", "./admin-components/Dashboard"),
};

const adminJs = new AdminJS({
  resources: [Bus, Driver, User, Incident],
  rootPath: "/admin",
  componentLoader,
  branding: { companyName: "TransTrack Admin" },
  dashboard: { component: Components.Dashboard }, // no handler needed
});


// Build router from @adminjs/express (this returns an express.Router)
const adminBaseRouter = AdminJSExpress.buildRouter(adminJs);

// Lightweight sessionless protection middleware for Admin UI
function adminAuthMiddleware(req, res, next) {
  // Allow disabling protection for dev
  if (!REQUIRE_AUTH) return next();
  const key = req.headers["x-admin-key"] || req.query.admin_key || req.cookies?.admin_key;
  if (key && key === ADMIN_KEY) return next();
  // For UI assets or initial page requests, respond with 401 so user can't access Admin UI
  res.status(401).send("Unauthorized - missing or invalid admin key");
}

// Mount admin UI behind adminAuthMiddleware
app.use(adminJs.options.rootPath, adminAuthMiddleware, adminBaseRouter);

// --------------------------
// Static stations table
// --------------------------
const STATION = {
  VTX: { name: "VTX - Vista Terminal Exchange Alabang", lat: 14.415655, lng: 121.04618, radius: 50 },
  "HM-Laguna": { name: "HM Bus Terminal - Laguna", lat: 14.265278, lng: 121.428961, radius: 50 },
  "HM-Calamba": { name: "HM BUS Terminal - Calamba", lat: 14.204603, lng: 121.156868, radius: 50 },
  "HM-Quezon": { name: "HM Transport Inc. Quezon City", lat: 14.623390644859652, lng: 121.04877752268187, radius: 50 },
};

// --------------------------
// Helpers & Analytics (kept original logic)
// --------------------------
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
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

function getOSRMRoute(startLat, startLng, endLat, endLng) {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    https.get(url, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(raw);
          if (!json.routes || !json.routes[0]) return resolve(null);
          const r = json.routes[0];
          const coords = r.geometry.coordinates.map((c) => ({ lat: c[1], lng: c[0] }));
          resolve({ polyline: coords, duration: r.duration, distance: r.distance });
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}


function movementMonitoring(bus) {
  const now = Date.now();
  if (bus._lastLat == null || bus._lastLng == null) {
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

  if (meters > 200) bus.movement = "teleport";
  else if (speed < 1) {
    if (now - (bus._lastMoveTime || now) > 20000) bus.movement = "idle";
    else bus.movement = "stable";
  } else if (speed < 4) bus.movement = "slowdown";
  else bus.movement = "stable";

  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;
  bus._lastMoveTime = now;

  return bus.movement;
}

function predictPassengers(bus) {
  const current = bus.passengers || 0;
  const hour = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false });
  let rushFactor = 1.0;
  if (hour >= 6 && hour <= 9) rushFactor = 1.35;
  if (hour >= 17 && hour <= 20) rushFactor = 1.5;

  const nearTerminal = bus.lat >= 14.410 && bus.lat <= 14.420 && bus.lng >= 121.035 && bus.lng <= 121.048;
  const terminalBoost = nearTerminal ? 1.25 : 1.0;
  const prediction = Math.round(current * rushFactor * terminalBoost);
  return Math.min(prediction, 40);
}

function predictCrowdFlow(bus) {
  bus._history = bus._history || [];
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
  const rec = bus._historyRecords || [];
  if (rec.length < 2) return "Stable passenger flow";

  const last = rec[rec.length - 1].p;
  const prev = rec[rec.length - 2].p;
  const diff = last - prev;

  if (diff > 5) return "Crowd rising — approaching busy stop.";
  if (diff < -5) return "Crowd dropping — recent alighting.";
  if (bus.movement === "idle") return "Stopped — loading/unloading.";
  if (bus.movement === "slowdown") return "Slow traffic — possible passenger pickup.";

  return "Stable passenger flow";
}

function classifyDrivePattern(bus) {
  bus._speedHistory = bus._speedHistory || [];
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
  const variance = bus._speedHistory.map((v) => Math.abs(v - avg)).reduce((a, b) => a + b) / bus._speedHistory.length;

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

  if (bus._lastPassengers == null) bus._lastPassengers = bus.passengers;
  const diff = Math.abs(bus.passengers - bus._lastPassengers);
  if (diff >= 15) add("spike", "Passenger spike detected", "medium");
  bus._lastPassengers = bus.passengers;

  if (bus._lastLat == null) {
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
  bus._historyRecords = bus._historyRecords || [];
  if (bus.passengers !== bus._lastHistoryValue) {
    bus._historyRecords.push({ t: Date.now(), p: bus.passengers });
    if (bus._historyRecords.length > 30) bus._historyRecords = bus._historyRecords.slice(-30);
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
  const dt = (last.t - prev.t) / 1000;
  const dp = last.p - prev.p;
  const ratePerSec = dt === 0 ? 0 : dp / dt;
  const secondsAhead = minutes * 60;
  let predicted = last.p + ratePerSec * secondsAhead;
  const baseline = predictPassengers(bus);
  const weight = Math.min(0.6, 0.1 * rec.length);
  predicted = Math.round(baseline * (1 - weight) + predicted * weight);
  predicted = Math.max(0, Math.min(40, predicted));
  const confidence = Math.min(0.95, 0.4 + 0.12 * rec.length);
  return { predicted, confidence };
}

function riskLevelFromCount(count) {
  if (count >= 36) return "Critical";
  if (count >= 30) return "Warning";
  return "Normal";
}

function delayReasonAI(bus) {
  if (!bus.etaSeconds || !bus.targetStation) return "Unknown – no route or ETA";
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

  const rec = bus._historyRecords || [];
  if (rec.length >= 2) {
    const last = rec[rec.length - 1].p;
    const prev = rec[rec.length - 2].p;
    if (last - prev >= 8) return "Passenger loading delay";
  }

  return "Normal conditions";
}

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
      if (station) b._distToDest = distanceMeters(b.lat, b.lng, station.lat, station.lng);
      else b._distToDest = Infinity;
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
        const estSeconds = Math.round(gapMeters / 10);
        bus.headwayMeters = Math.round(gapMeters);
        bus.headwayAheadId = ahead.id;
        bus.headwayEtaSeconds = estSeconds;
      }
    }
  }
  for (const b of arr) delete b._distToDest;
}

async function buildEnriched() {
  const buses = await Bus.find({}).lean();
  console.log("DEBUG: buses from DB:", buses); 
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

    let delayState = "unknown";
    if (b.etaSeconds !== null && typeof b.etaSeconds === "number") {
      const eta = b.etaSeconds;
      if (eta > 1200) delayState = "late";
      else if (eta < 240) delayState = "ahead";
      else delayState = "on-time";
    }

    const safety = computeDriverSafetyScore({ ...b, anomalies, crowdFlow, drivePattern });

    return {
      ...b,
      predicted,
      anomalies,
      alertLevel: anomalies[0]?.level || "normal",
      alertMessage: anomalies[0]?.message || "",
      movement,
      crowdFlow,
      predicted5min: f5.predicted,
      predicted10min: f10.predicted,
      risk5min: riskLevelFromCount(f5.predicted),
      risk10min: riskLevelFromCount(f10.predicted),
      delayState,
      forecastConfidence: Math.min(1, ((f5.confidence + f10.confidence) / 2) || 0.5),
      crowdExplanation: b.crowdExplanation || "Stable",
      drivePattern,
      safetyScore: safety.safetyScore,
      safetyRating: safety.safetyRating,
      safetyNotes: safety.safetyNotes,
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

function computeDriverSafetyScore(bus) {
  const anomalies = bus.anomalies || [];
  const crowdFlow = bus.crowdFlow || "stable";
  const drivePattern = bus.drivePattern || "unknown";

  let score = 100;
  const notes = [];

  for (const a of anomalies) {
    if (a.code === "overcrowding") { score -= 15; notes.push("Overcrowding detected"); }
    if (a.code === "gps_jump") { score -= 10; notes.push("GPS jumps observed"); }
    if (a.code === "spike") { score -= 8; notes.push("Passenger spike"); }
  }

  if (crowdFlow === "spike") { score -= 6; notes.push("Crowd spike"); }
  else if (crowdFlow === "drop") { score -= 3; notes.push("Crowd drop"); }
  else if (crowdFlow === "increasing") { score -= 2; }
  else if (crowdFlow === "decreasing") { score += 1; }

  if (drivePattern === "Aggressive") { score -= 25; notes.push("Aggressive driving pattern"); }
  else if (drivePattern === "Stop-and-go") { score -= 12; notes.push("Stop-and-go driving"); }
  else if (drivePattern === "Idle-too-long") { score -= 5; notes.push("Idle too long"); }
  else if (drivePattern === "Drifting") { score -= 8; notes.push("Unstable driving (drifting)"); }
  else if (drivePattern === "Smooth") { score += 5; }

  score = Math.max(0, Math.min(100, score));

  let rating = "Excellent";
  if (score >= 85) rating = "Excellent";
  else if (score >= 70) rating = "Good";
  else if (score >= 55) rating = "Fair";
  else rating = "Needs Attention";

  return { safetyScore: score, safetyRating: rating, safetyNotes: notes };
}

// --------------------------
// Auth middleware for REST
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

function requireUserAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();

  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) {
    console.warn("requireUserAuth: Missing token");
    return res.status(401).json({ ok: false, message: "Missing token" });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    console.warn("requireUserAuth: Invalid token", e);
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }

  let userId = payload.userId;
  let email = payload.email;

  if (!userId && email) {
    User.findOne({ email })
      .then((u) => {
        if (u) userId = String(u._id);
        if (!userId) {
          console.warn("requireUserAuth: token payload missing userId", payload);
          return res.status(403).json({ ok: false, message: "User auth required" });
        }
        req.user = { userId, email };
        console.log("requireUserAuth: user set on req:", req.user);
        next();
      })
      .catch((err) => {
        console.error("requireUserAuth: DB error", err);
        return res.status(500).json({ ok: false, message: "Server error" });
      });
  } else {
    if (!userId) {
      console.warn("requireUserAuth: token payload missing userId", payload);
      return res.status(403).json({ ok: false, message: "User auth required" });
    }
    req.user = { userId, email };
    console.log("requireUserAuth: user set on req:", req.user);
    next();
  }
}

// Socket auth
io.use((socket, next) => {
  if (!REQUIRE_AUTH) return next();
  try {
    const authToken = (socket.handshake.auth && socket.handshake.auth.token) || (socket.handshake.headers && (socket.handshake.headers.authorization || "").replace("Bearer ", ""));
    if (!authToken) return next(new Error("Unauthorized"));
    const payload = jwt.verify(authToken, JWT_SECRET);
    socket.data.user = payload;
    next();
  } catch (e) {
    next(new Error("Unauthorized"));
  }
});

// --------------------------
// Routes
// --------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend with MongoDB, JWT, Headways, and PIN reset");
});

// Auth: login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { busId, pin, password, email } = req.body || {};
    if (email && password && !busId) {
      try {
        const normalizedEmail = String(email).toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(404).json({ ok: false, message: "User not found" });
        const ok = await bcrypt.compare(String(password), user.passwordHash);
        if (!ok) return res.status(401).json({ ok: false, message: "Invalid email or password" });
        const token = jwt.sign({ userId: String(user._id), email: user.email }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email } });
      } catch (e) {
        console.error("User login error:", e);
        return res.status(500).json({ ok: false, message: "Login error" });
      }
    }

    const provided = pin || password;
    if (!busId || !provided) return res.status(400).json({ ok: false, message: "Missing busId or pin/password" });
    const driver = await Driver.findOne({ busId });
    if (!driver) return res.status(404).json({ ok: false, message: "Unknown busId" });
    const ok = await bcrypt.compare(String(provided), driver.pinHash);
    if (!ok) return res.status(401).json({ ok: false, message: "Invalid PIN" });
    const token = jwt.sign({ busId }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ ok: true, token, capacity: driver.capacity });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ ok: false, message: "Login error" });
  }
});

// Auth: signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ ok: false, message: "Missing name, email or password" });
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ ok: false, message: "Email already registered" });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({ name: String(name).trim(), email: normalizedEmail, passwordHash });
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    console.error("Signup error:", e);
    return res.status(500).json({ ok: false, message: "Signup error" });
  }
});

// Auth: forgot PIN
app.post("/api/auth/forgot", async (req, res) => {
  try {
    const { busId } = req.body || {};
    if (!busId) return res.status(400).json({ ok: false, message: "Missing busId" });
    const driver = await Driver.findOne({ busId });
    if (!driver) return res.status(404).json({ ok: false, message: "Unknown busId" });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    driver.resetCode = code;
    driver.resetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await driver.save();
    console.log(`Reset code for ${busId}: ${code} (valid 15m)`);
    return res.json({ ok: true, message: "Reset code generated" });
  } catch (e) {
    console.error("Forgot error:", e);
    return res.status(500).json({ ok: false, message: "Forgot error" });
  }
});

// Auth: reset PIN
app.post("/api/auth/reset", async (req, res) => {
  try {
    const { busId, code, newPin } = req.body || {};
    if (!busId || !code || !newPin) return res.status(400).json({ ok: false, message: "Missing busId, code or newPin" });
    const driver = await Driver.findOne({ busId });
    if (!driver) return res.status(404).json({ ok: false, message: "Unknown busId" });
    if (!driver.resetCode || !driver.resetExpires) return res.status(400).json({ ok: false, message: "No reset code requested" });
    if (driver.resetCode !== String(code)) return res.status(401).json({ ok: false, message: "Invalid code" });
    if (driver.resetExpires.getTime() < Date.now()) return res.status(401).json({ ok: false, message: "Code expired" });
    driver.pinHash = await bcrypt.hash(String(newPin), 10);
    driver.resetCode = null;
    driver.resetExpires = null;
    await driver.save();
    return res.json({ ok: true, message: "PIN updated" });
  } catch (e) {
    console.error("Reset error:", e);
    return res.status(500).json({ ok: false, message: "Reset error" });
  }
});

// Admin: set PIN
app.post("/api/auth/set-pin", async (req, res) => {
  try {
    const key = req.headers["x-admin-key"];
    if (!key || key !== ADMIN_KEY) return res.status(403).json({ ok: false, message: "Forbidden" });
    const { busId, pin } = req.body || {};
    if (!busId || !pin) return res.status(400).json({ ok: false, message: "Missing busId or pin" });
    const pinHash = await bcrypt.hash(String(pin), 10);
    const driver = await Driver.findOneAndUpdate({ busId }, { $set: { pinHash } }, { upsert: false, new: true });
    if (!driver) return res.status(404).json({ ok: false, message: "Unknown busId" });
    return res.json({ ok: true, message: `PIN set for ${busId}` });
  } catch (e) {
    console.error("Set PIN error:", e);
    return res.status(500).json({ ok: false, message: "Set PIN error" });
  }
});

// List buses (enriched)
app.get("/api/buses", async (req, res) => {
  const data = await buildEnriched();
  res.json(data);
});

// Incidents
app.post("/api/incidents", async (req, res) => {
  const { busId, category, details, lat, lng, timestamp } = req.body || {};
  if (!busId || !category) return res.status(400).json({ ok: false, message: "Missing busId or category" });
  await Incident.create({ busId, category, details: details || "", lat: lat ?? null, lng: lng ?? null, timestamp: timestamp ? new Date(timestamp) : new Date() });
  io.emit("incident", { busId, category, details, lat, lng, timestamp });
  res.status(201).json({ ok: true });
});

// Update bus location/route
app.post("/api/buses/:id/update", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { lat, lng, passengers, targetStation, route } = req.body || {};
    if (lat === undefined || lng === undefined || passengers === undefined) return res.status(400).json({ ok: false, message: "Missing lat, lng, or passengers" });
    const bus = await Bus.findOne({ id });
    if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });
    bus.lat = lat;
    bus.lng = lng;
    bus.passengers = passengers;
    if (Array.isArray(route) && route.length >= 2) bus.route = route.map((p) => ({ lat: p.lat, lng: p.lng }));
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
          bus.route = [];
          bus.etaSeconds = null;
          bus.etaText = null;
        }
      }
    }

    bus._history = bus._history || [];
    if (bus._history[0] !== bus.passengers) bus._history.unshift(bus.passengers);
    if (bus._history.length > 5) bus._history = bus._history.slice(0, 5);

    pushHistoryRecord(bus);
    bus.movement = movementMonitoring(bus);
    bus.crowdFlow = predictCrowdFlow(bus);
    bus.crowdExplanation = explainCrowdChange(bus);

    await bus.save();

    const enriched = await buildEnriched();
    io.emit("buses_update", enriched);

    return res.json({ ok: true, bus });
  } catch (e) {
    console.error("Update error:", e);
    return res.status(500).json({ ok: false, message: "Update error" });
  }
});

// Onboard / Dropoff (accept userId in body)
app.post("/api/buses/:id/onboard", async (req, res) => {
  try {
    const busId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: "Missing userId" });
    const bus = await Bus.findOne({ id: busId });
    if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    user.isOnboard = true;
    user.currentBusId = busId;
    user.boardedAt = new Date();
    await user.save();
    return res.json({ ok: true, isOnboard: true, busId, user: { id: user._id, email: user.email } });
  } catch (e) {
    console.error("Onboard error:", e);
    return res.status(500).json({ ok: false, message: "Onboard error" });
  }
});

app.post("/api/buses/:id/dropoff", async (req, res) => {
  try {
    const busId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: "Missing userId" });
    const bus = await Bus.findOne({ id: busId });
    if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    user.isOnboard = false;
    user.currentBusId = null;
    user.boardedAt = null;
    await user.save();
    return res.json({ ok: true, isOnboard: false, busId, user: { id: user._id, email: user.email } });
  } catch (e) {
    console.error("Dropoff error:", e);
    return res.status(500).json({ ok: false, message: "Dropoff error" });
  }
});

// Verify user state
app.get("/api/me", requireUserAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, user: { id: user._id, email: user.email, isOnboard: !!user.isOnboard, currentBusId: user.currentBusId, boardedAt: user.boardedAt } });
  } catch (e) {
    console.error("Get me error:", e);
    return res.status(500).json({ ok: false, message: "Get me error" });
  }
});

// --------------------------
// Socket.io
// --------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  buildEnriched().then((data) => socket.emit("buses_update", data)).catch(() => {});

  socket.on("driver_join", async (payload) => {
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

  socket.on("disconnect", () => {});
});

// --------------------------
// Start
// --------------------------
connectAndSeed().finally(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AdminJS available at ${adminJs.options.rootPath} (protected by x-admin-key header)`);
  });
});
