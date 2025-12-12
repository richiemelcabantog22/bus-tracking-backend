import React from "react";
import {
  Box,
  H1,
  Text,
  Table,
  TableRow,
  TableCell,
} from "@adminjs/design-system";

const Dashboard = ({ busCount, driverCount, incidentCount, usersCount, activeIncidents, buses }) => {
  return (
    <Box padding="30px" variant="grey">
      <H1>TransTrack Admin Dashboard</H1>

      {/* KPI CARDS */}
      <Box
        display="flex"
        flexWrap="wrap"
        marginTop="25px"
        style={{ gap: "20px" }}
      >
        <KpiCard label="Total Buses" value={busCount} color="#4CAF50" />
        <KpiCard label="Total Drivers" value={driverCount} color="#2196F3" />
        <KpiCard label="Active Incidents" value={incidentCount} color="#FF9800" />
        <KpiCard label="Registered Users" value={usersCount} color="#9C27B0" />
      </Box>

      {/* RECENT INCIDENTS */}
      <Box
        variant="white"
        marginTop="40px"
        padding="20px"
        boxShadow="card"
        borderRadius="12px"
      >
        <H1 fontSize="20px" marginBottom="15px">
          Recent Incidents
        </H1>
        <Table>
          <TableRow style={{ fontWeight: "bold", background: "#f0f0f0" }}>
            <TableCell>Bus ID</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Details</TableCell>
            <TableCell>Timestamp</TableCell>
          </TableRow>
          {activeIncidents?.map((i, idx) => (
            <TableRow
              key={i._id}
              style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}
            >
              <TableCell>{i.busId}</TableCell>
              <TableCell>{i.category}</TableCell>
              <TableCell>{i.details}</TableCell>
              <TableCell>{new Date(i.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>

      {/* BUS SAMPLE DATA */}
      <Box
        variant="white"
        marginTop="40px"
        padding="20px"
        boxShadow="card"
        borderRadius="12px"
      >
        <H1 fontSize="20px" marginBottom="15px">
          Buses Overview
        </H1>
        <Table>
          <TableRow style={{ fontWeight: "bold", background: "#f0f0f0" }}>
            <TableCell>Bus ID</TableCell>
            <TableCell>Passengers</TableCell>
            <TableCell>Target Station</TableCell>
            <TableCell>Location</TableCell>
          </TableRow>
          {buses?.map((b, idx) => (
            <TableRow
              key={b._id}
              style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}
            >
              <TableCell>{b.id}</TableCell>
              <TableCell>{b.passengers != null ? b.passengers : "N/A"}</TableCell>
              <TableCell>{b.targetStation || "N/A"}</TableCell>
              <TableCell>
                {b.lat != null && b.lng != null
                  ? `${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}`
                  : "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>
    </Box>
  );
};

const KpiCard = ({ label, value, color }) => (
  <Box
    variant="white"
    padding="20px"
    style={{
      flex: "1 1 200px",
      borderRadius: "12px",
      textAlign: "center",
      boxShadow: "var(--box-shadow-card)",
      borderLeft: `5px solid ${color || "#000"}`,
    }}
  >
    <Text fontSize="24px" fontWeight="bold">
      {value}
    </Text>
    <Text fontSize="14px" color="#555">
      {label}
    </Text>
  </Box>
);

export default Dashboard;
