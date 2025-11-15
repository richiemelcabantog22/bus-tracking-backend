const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const os = require("os");

const app = express();
app.use(express.json());
app.use(cors());

// ------------------------------
//  GET REAL WIFI IPv4 ADDRESS
// ------------------------------
function getLocalIp() {
  const interfaces = os.networkInterfaces();

  for (let name in interfaces) {
    if (
      name.toLowerCase().includes("wi-fi") ||
      name.toLowerCase().includes("wifi") ||
      name.toLowerCase().includes("wlan")
    ) {
      for (let iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  }

  return "127.0.0.1"; // fallback
}

const LOCAL_IP = getLocalIp();
console.log("🔵 BACKEND WIFI IP:", LOCAL_IP);

// ------------------------------
//  HTTP SERVER + SOCKET.IO
// ------------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ------------------------------
//  BUS DATA STORAGE
// ------------------------------
let buses = [
  { id: "BUS-001", lat: 14.4096, lng: 121.0390, passengers: 10 },
  { id: "BUS-002", lat: 14.4105, lng: 121.0386, passengers: 20 },
];

// ------------------------------
//  API ROUTES
// ------------------------------

// Tell apps the backend IP address
app.get("/server-ip", (req, res) => {
  res.json({ ip: LOCAL_IP });
});

// Get all buses
app.get("/api/buses", (req, res) => {
  res.json(buses);
});

// Update bus data
app.post("/api/buses/:id/update", (req, res) => {
  const id = req.params.id;
  const { lat, lng, passengers } = req.body;

  const bus = buses.find((b) => b.id === id);
  if (!bus)
    return res.status(404).json({ ok: false, message: "Bus not found" });

  bus.lat = lat;
  bus.lng = lng;
  bus.passengers = passengers;

  // Notify all clients in real-time
  io.emit("buses_update", buses);

  res.json({ ok: true, bus });
});

// ------------------------------
//  SOCKET.IO CONNECTION
// ------------------------------
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  socket.emit("buses_update", buses);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ------------------------------
//  START SERVER
// ------------------------------
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://${LOCAL_IP}:${PORT}`);
});
