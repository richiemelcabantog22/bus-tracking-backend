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
  { id: "BUS-002", lat: 14.415655, lng: 121.04618, passengers: 20 },
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
    bus.lat >= 14.410 &&
    bus.lat <= 14.420 &&
    bus.lng >= 121.035 &&
    bus.lng <= 121.048;

  const terminalBoost = nearTerminal ? 1.25 : 1.0;

  return Math.min(Math.round(current * rushFactor * terminalBoost), 40);
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
  if (bus.passengers >= 38) add("overcrowding", "Bus is overcrowded", "high");

  // SUDDEN SPIKE
  if (!bus._lastPassengers) bus._lastPassengers = bus.passengers;
  if (Math.abs(bus.passengers - bus._lastPassengers) >= 15)
    add("spike", "Unusual passenger spike detected", "medium");
  bus._lastPassengers = bus.passengers;

  // GPS TELEPORT
  if (!bus._lastLat) {
    bus._lastLat = bus.lat;
    bus._lastLng = bus.lng;
  }
  const jump = Math.abs(bus.lat - bus._lastLat) + Math.abs(bus.lng - bus._lastLng);
  if (jump > 0.003) add("gps_jump", "GPS movement appears abnormal", "medium");
  bus._lastLat = bus.lat;
  bus._lastLng = bus.lng;

  // VERY LOW PASSENGERS
  if (bus.passengers <= 2) add("very_low", "Bus is unusually empty", "low");

  return anomalies;
}

// ----------------------------------------------------------------------
// CREATE UI-FRIENDLY FIELDS FOR APP
// ----------------------------------------------------------------------
function enrich(bus) {
  const anomalies = detectAnomalies(bus);
  const top = anomalies[0] || null;

  return {
    ...bus,
    predicted: predictPassengers(bus),
    anomalies: anomalies,
    anomaly: top ? top.message : "",          // UI uses this
    alertLevel: top ? top.level : "normal",   // UI uses this
  };
}

// ----------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Bus Tracking Backend with AI is running!");
});

app.get("/api/buses", (req, res) => {
  res.json(buses.map(enrich));
});

// ----------------------------------------------------------------------
// UPDATE BUS LOCATION
// ----------------------------------------------------------------------
app.post("/api/buses/:id/update", (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find((b) => b.id === id);
  if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });

  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

  const enriched = buses.map(b => {
  const predicted = predictPassengers(b);
  const anomalies = detectAnomalies(b);

  const first = anomalies[0] || null;

  return {
    ...b,
    predicted: predicted,
    anomalies: anomalies,

    // UI-friendly flattened fields
    anomaly: first ? first.message : "",
    alertLevel: first ? first.level : "normal",
    alertMessage: first ? first.message : "",
  };
});

  io.emit("buses_update", enriched);

  res.json({ ok: true, bus: enrich(bus) });
});

// ----------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buses.map(enrich));
});

// ----------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

