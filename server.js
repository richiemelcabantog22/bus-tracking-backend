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

  // GPS TELEPORT / ABNORMAL MOVEMENT
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

  // VERY LOW PASSENGERS
  if (bus.passengers <= 2)
    add("very_low", "Bus is unusually empty", "low");

  return anomalies;
}

// ----------------------------------------------------------------------
// ROOT
// ----------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend with AI is running!");
});

// ----------------------------------------------------------------------
// FETCH ALL BUSES (WITH AI)
// ----------------------------------------------------------------------
app.get("/api/buses", (req, res) => {
  const enriched = buses.map(b => {
    const anoms = detectAnomalies(b);

    return {
      ...b,
      predicted: predictPassengers(b),
      anomalies: anoms,
      anomaly: anoms[0]?.message || "",
      alertLevel: anoms[0]?.level || "normal",
    };
  });

  res.json(enriched);
});

// ----------------------------------------------------------------------
// UPDATE BUS LOCATION
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

  // Apply AI
  const anomalies = detectAnomalies(bus);
  bus.predicted = predictPassengers(bus);
  bus.anomalies = anomalies;
  bus.anomaly = anomalies[0]?.message || "";
  bus.alertLevel = anomalies[0]?.level || "normal";

  // Prepare enriched data
  const enriched = buses.map(b => ({
    ...b,
    predicted: predictPassengers(b),
    anomalies: detectAnomalies(b),
    anomaly: detectAnomalies(b)[0]?.message || "",
    alertLevel: detectAnomalies(b)[0]?.level || "normal",
  }));

  io.emit("buses_update", enriched);

  res.json({ ok: true, bus });
});

// ----------------------------------------------------------------------
io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  const enriched = buses.map(b => {
    const anoms = detectAnomalies(b);
    return {
      ...b,
      predicted: predictPassengers(b),
      anomalies: anoms,
      anomaly: anoms[0]?.message || "",
      alertLevel: anoms[0]?.level || "normal",
    };
  });

  socket.emit("buses_update", enriched);
});

// ----------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
