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
// BUS DATABASE
// ----------------------------------------------------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
  { id: "BUS-002", lat: 14.415655, lng: 121.046180, passengers: 20 },
];

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

// ----------------------------------------------------------------------
// AI ANOMALY DETECTION
// ----------------------------------------------------------------------
function detectAnomalies(bus) {
  const anomalies = [];

  function add(code, message, level) {
    anomalies.push({ code, message, level });
  }

  // OVERCROWDING
  if (bus.passengers >= 38)
    add("overcrowding", "Bus is overcrowded", "high");

  // SUDDEN PASSENGER SPIKE
  if (!bus._lastPassengers) bus._lastPassengers = bus.passengers;

  const diff = Math.abs(bus.passengers - bus._lastPassengers);
  if (diff >= 15)
    add("spike", "Unusual passenger spike detected", "medium");

  bus._lastPassengers = bus.passengers;

  // GPS TELEPORT
  if (!bus._lastLat) {
    bus._lastLat = bus.lat;
    bus._lastLng = bus.lng;
  }

  const jump =
    Math.abs(bus.lat - bus._lastLat) + Math.abs(bus.lng - bus._lastLng);

  if (jump > 0.003)
    add("gps_jump", "GPS movement appears abnormal", "medium");

  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;

  // LOW PASSENGER ANOMALY (OPTIONAL)
  if (bus.passengers <= 2)
    add("very_low", "Bus is unusually empty", "low");

  return anomalies;
}

// ----------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend with AI is running!");
});

app.get("/api/buses", (req, res) => {
  const enriched = buses.map(b => ({
    ...b,
    predicted: predictPassengers(b),
    anomalies: detectAnomalies(b),
  }));
  res.json(enriched);
});

// ----------------------------------------------------------------------
// UPDATE BUS LOCATION
// ----------------------------------------------------------------------
// Make sure this is at the top of your server:
// === FINAL PATCHED + AI-INTEGRATED UPDATE ROUTE ===
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend is running with AI!");
});

// Return enriched list
app.get("/api/buses", (req, res) => {
  const enriched = buses.map(enrichBus);
  res.json(enriched);
});

// ---------- PATCHED + SAFE UPDATE ROUTE ----------
app.post("/api/buses/:id/update", (req, res) => {
  console.log("➡️ /api/buses/:id/update HIT");

  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  console.log("Incoming:", { id, lat, lng, passengers });

  const bus = buses.find((b) => b.id == id);
  if (!bus) {
    console.log("❌ Bus not found:", id);
    return res.status(404).json({ ok: false, message: "Bus not found" });
  }

  // Validate
  if (lat === undefined || lng === undefined || passengers === undefined) {
    return res.status(400).json({
      ok: false,
      message: "Missing lat, lng, or passengers",
    });
  }

  // Update fields
  bus.lat = Number(lat);
  bus.lng = Number(lng);
  bus.passengers = Number(passengers);

  console.log(`✔ Updated bus ${bus.id} | pax:${bus.passengers}`);

  // Safe AI execution
  try {
    bus.predicted = predictPassengers(bus);
  } catch (err) {
    console.error("❌ predictPassengers() error:", err);
    bus.predicted = null;
  }

  let anomalies = [];
  try {
    anomalies = detectAnomalies(bus) || [];
    bus.anomalies = anomalies;
  } catch (err) {
    console.error("❌ detectAnomalies() error:", err);
    anomalies = [];
    bus.anomalies = [];
  }

  // single UI-friendly anomaly + alert level
  if (anomalies.length > 0) {
    bus.anomaly = anomalies[0].message;
    bus.alertLevel = anomalies[0].level;
  } else {
    bus.anomaly = "";
    bus.alertLevel = "normal";
  }

  console.log(`AI anomalies for ${bus.id}:`, anomalies);

  // Broadcast enriched dataset
  const enriched = buses.map(enrichBus);

  try {
    io.emit("buses_update", enriched);
  } catch (err) {
    console.error("❌ Socket emit error:", err);
  }

  return res.json({ ok: true, bus: enrichBus(bus) });
});


// ----------------------------------------------------------------------
io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  const enriched = buses.map(b => ({
    ...b,
    predicted: predictPassengers(b),
    anomalies: detectAnomalies(b),
  }));

   socket.emit("buses_update", buses.map(enrichBus));
});

// ----------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


