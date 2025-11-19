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
  cors: {
    origin: "*",
  },
});


// --- AI CROWD PREDICTION ENGINE (Simple ML-based logic) --- //


let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
  { id: "BUS-002", lat: 14.415655, lng: 121.046180, passengers: 20 },
];

app.get("/", (req, res) => {
  res.send("Bus Tracking Backend is running!");
});

app.get("/api/buses", (req, res) => {
  res.json(buses);
});

app.post("/api/buses/:id/update", (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find((b) => b.id === id);
  if (!bus)
    return res.status(404).json({ ok: false, message: "Bus not found" });

  // Update values
  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

  // AI prediction
  bus.predicted = predictPassengers(bus);

  console.log(`AI Prediction for ${bus.id}:`, bus.predicted);

  io.emit("buses_update", buses);
  res.json({ ok: true, bus });
});


function predictPassengers(bus) {
 const current = bus.passengers;
  // Get hour using Philippine timezone
  const hour = new Date().getHours();

  let rushFactor = 1.0;

  // Rush hour boost
  if (hour >= 6 && hour <= 9) rushFactor = 1.35;      // Morning rush
  if (hour >= 17 && hour <= 20) rushFactor = 1.50;    // Evening rush

  // Location-based AI (e.g. near Alabang terminal)
  const nearTerminal =
    bus.lat >= 14.410 && bus.lat <= 14.420 &&
    bus.lng >= 121.035 && bus.lng <= 121.048;

  const terminalBoost = nearTerminal ? 1.25 : 1.0;

  // Predict future passengers (10 minutes later)
  const prediction = Math.round(current * rushFactor * terminalBoost);

  return prediction > 40 ? 40 : prediction; // max capacity
}


app.get("/api/buses", (req, res) => {
  buses.forEach(b => {
    b.predicted = predictPassengers(b);
  });
  res.json(buses);
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buses);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});






