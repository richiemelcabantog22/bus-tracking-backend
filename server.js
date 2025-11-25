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

// ----------------------------------------------------------------------
// DATABASE
// ----------------------------------------------------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
  { id: "BUS-002", lat: 14.415655, lng: 121.046180, passengers: 20 },
];
// -----------------------------------------------------------

function aiStopETA(bus, stopLat, stopLng) {
  // Distance
  const R = 6371;
  const dLat = (stopLat - bus.lat) * Math.PI/180;
  const dLng = (stopLng - bus.lng) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(bus.lat*Math.PI/180) *
            Math.cos(stopLat*Math.PI/180) *
            Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c;

  // Speed estimate
  let speed = 25;
  if (distanceKm < 1) speed = 15;
  if (distanceKm > 5) speed = 45;

  // Traffic factor
  let trafficFactor = 1.0;
  if (speed > 35) trafficFactor = 0.9;
  if (speed < 20) trafficFactor = 1.25;

  // Raw ETA
  let eta = (distanceKm / speed) * 60 * trafficFactor;

  // AI smoothing
  if (!bus._lastETA) bus._lastETA = eta;
  eta = bus._lastETA * 0.7 + eta * 0.3;
  bus._lastETA = eta;

  return {
    eta: eta,
    traffic:
      speed > 35 ? "Light" :
      speed > 20 ? "Moderate" :
                   "Heavy",
    distanceKm: distanceKm,
  };
}




// ----------------------

function movementMonitoring(bus) {
  const now = Date.now();

  // Initialize last data
  if (!bus._lastLat || !bus._lastLng) {
    bus._lastLat = bus.lat;
    bus._lastLng = bus.lng;
    bus._lastMoveTime = now;
    bus.movement = "stable";
    return bus.movement;
  }

  // Compute distance moved
  const dist =
    Math.abs(bus.lat - bus._lastLat) +
    Math.abs(bus.lng - bus._lastLng);

  // Convert deg difference into meters approx
  const meters = dist * 111000;

  // Compute speed (m/s)
  const timeDiff = (now - bus._lastMoveTime) / 1000;
  const speed = meters / (timeDiff == 0 ? 1 : timeDiff);

  // TELEPORT CHECK
  if (meters > 200) {
    bus.movement = "teleport";
  }

  // IDLE CHECK
  else if (speed < 1) {
    // Idle for more than 20 sec
    if (now - bus._lastMoveTime > 20000) {
      bus.movement = "idle";
    }
  }

  // SLOWDOWN CHECK
  else if (speed < 4) {
    bus.movement = "slowdown";
  }

  // NORMAL MOVEMENT
  else {
    bus.movement = "stable";
  }

  // Update last position & timestamp
  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;
  bus._lastMoveTime = now;

  return bus.movement;
}


// ----------------------------------------------------------------------
// AI PREDICTION ENGINE
// ----------------------------------------------------------------------
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

// ------------------------------------------------------

// -------------------------------------------------------------
// AI CROWD FLOW PREDICTION (Trend Direction)
// -------------------------------------------------------------

function predictCrowdFlow(bus) {
  if (!bus._history) bus._history = [];

  // Store last 5 passenger counts
  bus._history.push(bus.passengers);
  if (bus._history.length > 5) bus._history.shift();

  if (bus._history.length < 3) return "stable";

  const a = bus._history[bus._history.length - 3];
  const b = bus._history[bus._history.length - 2];
  const c = bus._history[bus._history.length - 1];

  const delta1 = b - a;
  const delta2 = c - b;

  // Sudden increase
  if (delta1 > 5 && delta2 > 5) return "spike";

  // Sudden drop
  if (delta1 < -5 && delta2 < -5) return "drop";

  // Slow upward trend
  if (delta2 > 2) return "increasing";

  // Slow downward trend
  if (delta2 < -2) return "decreasing";

  return "stable";
}


// ----------------------------------------------------------------------
// AI ANOMALY DETECTION
// ----------------------------------------------------------------------
function detectAnomalies(bus) {
  const anomalies = [];

  const add = (code, message, level) =>
    anomalies.push({ code, message, level });

  // Overcrowded
  if (bus.passengers >= 38)
    add("overcrowding", "Bus is overcrowded", "high");

  // Sudden spike
  if (!bus._lastPassengers) bus._lastPassengers = bus.passengers;
  const diff = Math.abs(bus.passengers - bus._lastPassengers);
  if (diff >= 15)
    add("spike", "Passenger spike detected", "medium");
  bus._lastPassengers = bus.passengers;

  // GPS teleport
  if (!bus._lastLat) {
    bus._lastLat = bus.lat;
    bus._lastLng = bus.lng;
  }

  const jump = Math.abs(bus.lat - bus._lastLat) + Math.abs(bus.lng - bus._lastLng);
  if (jump > 0.003)
    add("gps_jump", "Abnormal GPS movement", "medium");

  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;

  // Very low passengers
  if (bus.passengers <= 2)
    add("low", "Bus is unusually empty", "low");

  return anomalies;
}

// ----------------------------------------------------------------------
// SEND ENRICHED BUS DATA
// ----------------------------------------------------------------------
function buildEnriched() {
  return buses.map(b => {
    const anomalies = detectAnomalies(b);
    const first = anomalies[0];

    return {
      ...b,
      predicted: predictPassengers(b),
      anomalies,                     // required by commuter app
      alertLevel: first?.level || "normal",
      alertMessage: first?.message || "",
      movement: movementMonitoring(b),
      crowdFlow: predictCrowdFlow(b)
    };
  });
}

// ----------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend with AI is running!");
});

// ----------------------------------------------------------------------
app.get("/api/buses", (req, res) => {
  res.json(buildEnriched());
});

// ----------------------------------------------------------------------
app.post("/api/buses/:id/update", (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find(b => b.id === id);
  if (!bus)
    return res.status(404).json({ ok: false, message: "Bus not found" });

  // Update
  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;
  bus.movement = movementMonitoring(bus);
  bus.crowdFlow = predictCrowdFlow(bus);


  // Broadcast enriched data
  io.emit("buses_update", buildEnriched());
  etaToStops: _busStops.map(stop => ({
    stopName: stop.name,
    ...aiStopETA(b, stop.lat, stop.lng)
})),

  res.json({ ok: true, bus });
});

// ----------------------------------------------------------------------
io.on("connection", socket => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buildEnriched());
});

// ----------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



