const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Render uses PORT from environment
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ------------------------
// 🚍 BUS DATA
// ------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15, predicted: 15 },
  { id: "BUS-002", lat: 14.415655, lng: 121.04618, passengers: 20, predicted: 20 },
];

// ------------------------
// 🧠 AI PREDICTION ENGINE
// ------------------------
function predictPassengers(bus) {
  const hour = new Date().getHours();
  let rushFactor = 1.0;

  // Rush hour multiplier
  if (hour >= 6 && hour <= 9) rushFactor = 1.35;     // Morning
  if (hour >= 17 && hour <= 20) rushFactor = 1.50;   // Evening

  // Terminal density check → increases probability
  const nearTerminal =
    bus.lat >= 14.410 && bus.lat <= 14.420 &&
    bus.lng >= 121.035 && bus.lng <= 121.048;

  const terminalBoost = nearTerminal ? 1.25 : 1.0;

  const prediction = Math.round(bus.passengers * rushFactor * terminalBoost);

  return Math.min(prediction, 40); // max capacity
}

// ------------------------
// ROUTES
// ------------------------

app.get("/", (req, res) => {
  res.send("Bus Tracking Backend is running!");
});

// Return all buses
app.get("/api/buses", (req, res) => {
  buses.forEach((b) => {
    b.predicted = predictPassengers(b);
  });
  res.json(buses);
});

// Update a specific bus
app.post("/api/buses/:id/update", (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find((b) => b.id === id);
  if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });

  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

  // AI predicts new crowd levels
  bus.predicted = predictPassengers(bus);

  console.log(`AI Prediction for ${bus.id}:`, bus.predicted);

  io.emit("buses_update", buses);
  res.json({ ok: true, bus });
});

// ------------------------
// SOCKET.IO
// ------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buses);
});

// ------------------------
// START SERVER
// ------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
