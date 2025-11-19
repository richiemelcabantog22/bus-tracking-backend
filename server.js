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

// ---- AI Passenger Prediction ----
function predictPassengers(bus) {
  const { passengers, lat, lng } = bus;

  const hour = new Date().getHours();

  let multiplier = 1;

  if (hour >= 6 && hour <= 9) multiplier = 1.4;     // Morning rush
  else if (hour >= 17 && hour <= 20) multiplier = 1.35; // Evening rush
  else multiplier = 1.1;

  const predicted = Math.round(passengers * multiplier);
  return Math.min(predicted, 40); // cap to 40 seats
}


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


io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("buses_update", buses);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});








