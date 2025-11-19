const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ---------------------------
// DATABASE (local memory)
// ---------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
  { id: "BUS-002", lat: 14.415655, lng: 121.046180, passengers: 20 },
];

// ---------------------------
// AI PASSENGER PREDICTION
// ---------------------------
function predictPassengers(bus) {
  const current = bus.passengers;

  // Philippine time
  const hour = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false });

  let rushFactor = 1.0;

  // Rush-hour time model
  if (hour >= 6 && hour <= 9) rushFactor = 1.35;
  if (hour >= 17 && hour <= 20) rushFactor = 1.50;

  // Location-based terminal congestion boost
  const nearTerminal =
    bus.lat >= 14.410 &&
    bus.lat <= 14.420 &&
    bus.lng >= 121.035 &&
    bus.lng <= 121.048;

  const terminalBoost = nearTerminal ? 1.25 : 1.0;

  // Predict for the next 10 minutes
  const prediction = Math.round(current * rushFactor * terminalBoost);

  return Math.min(prediction, 40); // max capacity
}

// ---------------------------
// AI ANOMALY DETECTION ENGINE
// ---------------------------
function detectAnomalies(bus) {
  const anomalies = [];

  // 1️⃣ Overcrowding
  if (bus.passengers >= 38) {
    anomalies.push("⚠️ Overcrowding detected");
  }

  // 2️⃣ Sudden passenger spikes (hack attempt / sensor error)
  if (!bus._lastPassengers) bus._lastPassengers = bus.passengers;

  const change = Math.abs(bus.passengers - bus._lastPassengers);
  if (change >= 15) {
    anomalies.push("⚠️ Sudden passenger spike detected");
  }

  bus._lastPassengers = bus.passengers;

  // 3️⃣ Unusual movement (teleporting)
  if (!bus._lastLat) {
    bus._lastLat = bus.lat;
    bus._lastLng = bus.lng;
  }

  const moved =
    Math.abs(bus.lat - bus._lastLat) +
    Math.abs(bus.lng - bus._lastLng);

  if (moved > 0.003) {
    anomalies.push("⚠️ Unusual GPS movement detected");
  }

  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;

  return anomalies;
}

// ---------------------------
// API ROUTES
// ---------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend is running with AI!");
});

app.get("/api/buses", (req, res) => {
  const enriched = buses.map(b => ({
    ...b,
    predicted: predictPassengers(b),
    anomalies: detectAnomalies(b),
  }));
  res.json(enriched);
});

// ---------------------------
// UPDATE BUS LOCATION
// ---------------------------
app.post("/api/buses/:id/update", (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find(b => b.id === id);
  if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });

  // Update bus values
  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

  bus.predicted = predictPassengers(bus);
  bus.anomalies = detectAnomalies(bus);

  console.log(`Updated ${bus.id} | Pax: ${bus.passengers} | Predict: ${bus.predicted}`);
  if (bus.anomalies.length > 0) {
    console.log("🚨 AI Anomalies:", bus.anomalies);
  }

  io.emit("buses_update", buses);

  res.json({ ok: true, bus });
});

// ---------------------------
// SOCKET.IO
// ---------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buses);
});

// ---------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
