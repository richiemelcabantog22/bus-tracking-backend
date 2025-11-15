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

let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.039, passengers: 15 },
  { id: "BUS-002", lat: 14.4105, lng: 121.0386, passengers: 20 },
];

app.get("/", (req, res) => {
  res.send("Bus Tracking Backend is running!");
});

app.get("/api/buses", (req, res) => {
  res.json(buses);
});

app.post("/api/buses/:id/update", (req, res) => {
  const { id } = req.params;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find((b) => b.id === id);
  if (!bus) return res.status(404).json({ ok: false, message: "Bus not found" });

  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

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
