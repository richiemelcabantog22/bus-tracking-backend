import React, { useEffect } from "react";
import { Box, H1, Text, Table, TableRow, TableCell } from "@adminjs/design-system";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

const Dashboard = () => {
  // MOCK DATA
  const busCount = 7;
  const driverCount = 7;
  const incidentCount = 3;
  const usersCount = 12;

  const activeIncidents = [
    { _id: "1", busId: "BUS-001", category: "Delay", details: "Heavy traffic", createdAt: new Date() },
    { _id: "2", busId: "BUS-004", category: "Accident", details: "Minor collision", createdAt: new Date() },
    { _id: "3", busId: "BUS-007", category: "Overcrowding", details: "Too many passengers", createdAt: new Date() },
  ];

  const buses = [
    { _id: "b1", id: "BUS-001", passengers: 15, targetStation: "VTX - Vista Terminal", lat: 14.4096, lng: 121.039 },
    { _id: "b2", id: "BUS-002", passengers: 20, targetStation: "HM Bus Terminal - Laguna", lat: 14.4156, lng: 121.0462 },
    { _id: "b3", id: "BUS-003", passengers: 35, targetStation: "HM BUS Terminal - Calamba", lat: 14.4156, lng: 121.0462 },
  ];

  // Lazy import Leaflet CSS
  useEffect(() => {
    import("leaflet/dist/leaflet.css");
  }, []);

  return (
    <Box variant="grey" padding="20px">
      <H1>TransTrack Admin Dashboard</H1>

      {/* KPI CARDS */}
      <Box display="flex" flexDirection="row" marginTop="20px" style={{ gap: "20px" }}>
        <KpiCard label="Total Buses" value={busCount} />
        <KpiCard label="Total Drivers" value={driverCount} />
        <KpiCard label="Active Incidents" value={incidentCount} />
        <KpiCard label="Registered Users" value={usersCount} />
      </Box>

      {/* RECENT INCIDENTS */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card">
        <H1 fontSize="20px">Recent Incidents</H1>
        <Table>
          {activeIncidents.map((i) => (
            <TableRow key={i._id}>
              <TableCell>{i.busId}</TableCell>
              <TableCell>{i.category}</TableCell>
              <TableCell>{i.details}</TableCell>
              <TableCell>{new Date(i.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>

      {/* BUS SAMPLE DATA */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card">
        <H1 fontSize="20px">Sample Buses Data</H1>
        <Table>
          {buses.map((b) => (
            <TableRow key={b._id}>
              <TableCell>{b.id}</TableCell>
              <TableCell>{b.passengers}</TableCell>
              <TableCell>{b.targetStation || "N/A"}</TableCell>
              <TableCell>{b.lat.toFixed(4)}, {b.lng.toFixed(4)}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>

      {/* MAP */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card">
        <H1 fontSize="20px">Bus Map</H1>
        <MapContainer center={[14.4096, 121.039]} zoom={13} style={{ height: "400px", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {buses.map((bus) => (
            <Marker key={bus._id} position={[bus.lat, bus.lng]}>
              <Popup>{bus.id} - {bus.passengers} passengers</Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>
    </Box>
  );
};

const KpiCard = ({ label, value }) => (
  <Box variant="white" padding="20px" style={{ width: "200px", borderRadius: "12px", textAlign: "center", boxShadow: "var(--box-shadow-card)" }}>
    <Text fontSize="22px" fontWeight="bold">{value}</Text>
    <Text fontSize="14px" color="#555">{label}</Text>
  </Box>
);

export default Dashboard;
