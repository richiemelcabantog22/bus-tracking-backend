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

// ------------------------------
// 🚍 BUS DATABASE (in-memory)
// ------------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15, predicted: 0 },
  { id: "BUS-002", lat: 14.415655, lng: 121.046180, passengers: 20, predicted: 0 },
];

// Used to detect anomalies
let lastPositions = {};  // track movement
let lastUpdated = {};    // track time

// ------------------------------
// 🧠 AI — Passenger Prediction
// ------------------------------
function predictPassengers(bus) {
  const current = bus.passengers;
  const hour = new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" });

  let rushFactor = 1.0;

  if (hour >= 6 && hour <= 9) rushFactor = 1.35;   // morning rush
  if (hour >= 17 && hour <= 20) rushFactor = 1.50; // evening rush

  const nearTerminal =
    bus.lat >= 14.410 && bus.lat <= 14.420 &&
    bus.lng >= 121.035 && bus.lng <= 121.048;

  const terminalBoost = nearTerminal ? 1.25 : 1.0;

  const prediction = Math.round(current * rushFactor * terminalBoost);

  return Math.min(prediction, 40); // max capacity
}

// ------------------------------
// 🚨 AI – ANOMALY DETECTION
// ------------------------------

function detectAnomalies(bus) {
  const anomalies = [];

  // Overcrowded detection (> 85% of capacity)
  if (bus.passengers >= 34) {
    anomalies.push({
      type: "overcrowded",
      message: `${bus.id} is overcrowded (${bus.passengers}/40).`,
    });
  }

  // Unusual movement detection
  const prev = lastPositions[bus.id];

  if (prev) {
    const distanceMoved = Math.sqrt(
      Math.pow(bus.lat - prev.lat, 2) +
      Math.pow(bus.lng - prev.lng, 2)
    );

    const secondsSinceUpdate = (Date.now() - lastUpdated[bus.id]) / 1000;

    if (distanceMoved < 0.00005 && secondsSinceUpdate > 60) {
      anomalies.push({
        type: "not_moving",
        message: `${bus.id} seems stuck for more than 1 minute.`,
      });
    }

    if (distanceMoved > 0.01) {
      anomalies.push({
        type: "teleport",
        message: `${bus.id} made an unnatural jump (GPS glitch detected).`,
      });
    }
  }

  // Update movement tracking
  lastPositions[bus.id] = { lat: bus.lat, lng: bus.lng };
  lastUpdated[bus.id] = Date.now();

  return anomalies;
}

// ------------------------------
// API ROUTES
// ------------------------------

app.get("/", (req, res) => {
  res.send("Bus Tracking Backend is running with AI!");
});

app.get("/api/buses", (req, res) => {
  buses.forEach(bus => {
    bus.predicted = predictPassengers(bus);
  });
  res.json(buses);
});

app.post("/api/buses/:id/update", (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find(b => b.id === id);
  if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });

  // Update bus data
  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

  // Update prediction
  bus.predicted = predictPassengers(bus);

  // Run anomaly detection
  const anomalies = detectAnomalies(bus);
  if (anomalies.length > 0) {
    console.log(`⚠️ Anomalies detected for ${bus.id}:`, anomalies);

    io.emit("anomaly_alert", { busId: bus.id, anomalies });
  }

  io.emit("buses_update", buses);
  res.json({ ok: true, bus });
});

// ------------------------------
// SOCKET.IO
// ------------------------------

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.emit("buses_update", buses);
});

// ------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
