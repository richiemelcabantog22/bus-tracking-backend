import React from "react";
import { Box, H1, Text, Table, TableRow, TableCell } from "@adminjs/design-system";
import { User, Bus, AlertCircle, Users } from "react-feather";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// MOCK DATA
const mockData = {
  busCount: 7,
  driverCount: 7,
  incidentCount: 3,
  usersCount: 12,
  activeIncidents: [
    { _id: "1", busId: "BUS-001", category: "Delay", details: "Heavy traffic", createdAt: new Date() },
    { _id: "2", busId: "BUS-004", category: "Accident", details: "Minor collision", createdAt: new Date() },
    { _id: "3", busId: "BUS-007", category: "Overcrowding", details: "Too many passengers", createdAt: new Date() },
  ],
  buses: [
    { _id: "b1", id: "BUS-001", passengers: 15, targetStation: "VTX - Vista Terminal", lat: 14.4096, lng: 121.039 },
    { _id: "b2", id: "BUS-002", passengers: 20, targetStation: "HM Bus Terminal - Laguna", lat: 14.4156, lng: 121.0462 },
    { _id: "b3", id: "BUS-003", passengers: 35, targetStation: "HM BUS Terminal - Calamba", lat: 14.4200, lng: 121.0500 },
  ],
};

const Dashboard = () => {
  const { busCount, driverCount, incidentCount, usersCount, activeIncidents, buses } = mockData;

  return (
    <Box variant="grey" padding="20px">
      <H1>TransTrack Admin Dashboard</H1>

      {/* KPI Cards */}
      <Box display="flex" flexWrap="wrap" marginTop="20px" style={{ gap: "20px" }}>
        <KpiCard label="Total Buses" value={busCount} icon={<Bus size={24} color="#fff" />} color="#4CAF50" />
        <KpiCard label="Total Drivers" value={driverCount} icon={<User size={24} color="#fff" />} color="#2196F3" />
        <KpiCard label="Active Incidents" value={incidentCount} icon={<AlertCircle size={24} color="#fff" />} color="#FF5722" />
        <KpiCard label="Registered Users" value={usersCount} icon={<Users size={24} color="#fff" />} color="#9C27B0" />
      </Box>

      {/* Mini Map */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" borderRadius="12px">
        <H1 fontSize="20px" marginBottom="15px">Bus Locations</H1>
        <MapContainer center={[14.4156, 121.0462]} zoom={13} style={{ height: "300px", width: "100%", borderRadius: "12px" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {buses.map(bus => (
            <Marker key={bus._id} position={[bus.lat, bus.lng]}>
              <Popup>
                {bus.id} <br />
                Passengers: {bus.passengers} <br />
                Target: {bus.targetStation}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>

      {/* Recent Incidents */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" borderRadius="12px">
        <H1 fontSize="20px" marginBottom="15px">Recent Incidents</H1>
        <Table>
          {activeIncidents.map(i => (
            <TableRow key={i._id}>
              <TableCell>{i.busId}</TableCell>
              <TableCell>{i.category}</TableCell>
              <TableCell>{i.details}</TableCell>
              <TableCell>{i.createdAt.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>

      {/* Sample Buses Table */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" borderRadius="12px">
        <H1 fontSize="20px" marginBottom="15px">Sample Buses Data</H1>
        <Table>
          {buses.map(b => (
            <TableRow key={b._id}>
              <TableCell>{b.id}</TableCell>
              <TableCell>{b.passengers}</TableCell>
              <TableCell>{b.targetStation}</TableCell>
              <TableCell>{b.lat.toFixed(4)}, {b.lng.toFixed(4)}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>
    </Box>
  );
};

// KPI Card Component
const KpiCard = ({ label, value, icon, color }) => (
  <Box
    style={{
      flex: "1 1 200px",
      minWidth: "200px",
      backgroundColor: color,
      color: "#fff",
      borderRadius: "12px",
      padding: "20px",
      display: "flex",
      alignItems: "center",
      gap: "15px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }}
  >
    <Box>{icon}</Box>
    <Box>
      <Text fontSize="24px" fontWeight="bold">{value}</Text>
      <Text fontSize="14px">{label}</Text>
    </Box>
  </Box>
);

export default Dashboard;
