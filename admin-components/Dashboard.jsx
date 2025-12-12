import React from "react";
import { Box, H1, Text, Table, TableRow, TableCell } from "@adminjs/design-system";

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
    { _id: "b3", id: "BUS-003", passengers: 35, targetStation: "HM BUS Terminal - Calamba", lat: 14.4196, lng: 121.0502 },
  ];

  const latRange = { min: 14.40, max: 14.42 };
  const lngRange = { min: 121.03, max: 121.06 };
  const getPosition = (lat, lng) => {
    const top = ((lat - latRange.min) / (latRange.max - latRange.min)) * 100;
    const left = ((lng - lngRange.min) / (lngRange.max - lngRange.min)) * 100;
    return { top: `${100 - top}%`, left: `${left}%` };
  };

  return (
    <Box variant="grey" padding="20px">
      <H1 style={{ marginBottom: "20px" }}>TransTrack Admin Dashboard</H1>

      {/* KPI CARDS */}
      <Box display="flex" flexWrap="wrap" style={{ gap: "20px" }}>
        <KpiCard label="Total Buses" value={busCount} color="#FF5722" />
        <KpiCard label="Total Drivers" value={driverCount} color="#3F51B5" />
        <KpiCard label="Active Incidents" value={incidentCount} color="#F44336" />
        <KpiCard label="Registered Users" value={usersCount} color="#4CAF50" />
      </Box>

      {/* RECENT INCIDENTS */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" style={{ borderRadius: "12px" }}>
        <H1 fontSize="20px">Recent Incidents</H1>
        <Table>
          {activeIncidents.map((i, index) => (
            <TableRow key={i._id} style={{ backgroundColor: index % 2 === 0 ? "#f5f5f5" : "#fff" }}>
              <TableCell>{i.busId}</TableCell>
              <TableCell>{i.category}</TableCell>
              <TableCell>{i.details}</TableCell>
              <TableCell>{new Date(i.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>

      {/* BUS SAMPLE DATA */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" style={{ borderRadius: "12px" }}>
        <H1 fontSize="20px">Sample Buses Data</H1>
        <Table>
          {buses.map((b, index) => (
            <TableRow key={b._id} style={{ backgroundColor: index % 2 === 0 ? "#f5f5f5" : "#fff" }}>
              <TableCell>{b.id}</TableCell>
              <TableCell>{b.passengers}</TableCell>
              <TableCell>{b.targetStation}</TableCell>
              <TableCell>{b.lat.toFixed(4)}, {b.lng.toFixed(4)}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>

      {/* MOCK MAP */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" style={{ borderRadius: "12px" }}>
        <H1 fontSize="20px">Bus Locations (Animated Mock Map)</H1>
        <div style={{
          position: "relative",
          width: "100%",
          height: "400px",
          marginTop: "15px",
          borderRadius: "12px",
          background: "linear-gradient(to bottom, #e0f7fa, #b2ebf2)",
          border: "1px solid #ccc",
          overflow: "hidden"
        }}>
          {/* MOCK ROUTES */}
          <svg style={{ position: "absolute", width: "100%", height: "100%" }}>
            {buses.map((bus, i) => {
              const start = getPosition(bus.lat, bus.lng);
              const end = { top: `${parseFloat(start.top) - 10}%`, left: `${parseFloat(start.left) + 10}%` };
              return (
                <line
                  key={i}
                  x1={start.left}
                  y1={start.top}
                  x2={end.left}
                  y2={end.top}
                  stroke="#FF5722"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              );
            })}
          </svg>

          {/* BUS MARKERS */}
          {buses.map((bus, index) => {
            const pos = getPosition(bus.lat, bus.lng);
            return (
              <div key={bus._id} style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                transform: "translate(-50%, -50%)",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "#FF5722",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: "bold",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                animation: `bounce${index} 3s ease-in-out infinite alternate`,
              }}>
                {bus.id.split("-")[1]}
              </div>
            );
          })}

          <style>
            {buses.map((_, i) => `
              @keyframes bounce${i} {
                0% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
                25% { transform: translate(-50%, -50%) translate(5px, -5px) scale(1.1); }
                50% { transform: translate(-50%, -50%) translate(-5px, 5px) scale(1.05); }
                75% { transform: translate(-50%, -50%) translate(5px, 5px) scale(1.1); }
                100% { transform: translate(-50%, -50%) translate(-5px, -5px) scale(1); }
              }
            `).join("\n")}
          </style>
        </div>
      </Box>
    </Box>
  );
};

const KpiCard = ({ label, value, color }) => (
  <Box
    variant="white"
    padding="20px"
    style={{
      width: "200px",
      borderRadius: "12px",
      textAlign: "center",
      background: `linear-gradient(135deg, ${color}33, ${color}99)`,
      boxShadow: `0 4px 12px ${color}55`,
      transition: "transform 0.3s",
    }}
    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-5px)"}
    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
  >
    <Text fontSize="22px" fontWeight="bold">{value}</Text>
    <Text fontSize="14px" color="#555">{label}</Text>
  </Box>
);

export default Dashboard;
