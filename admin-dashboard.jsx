import React from "react";
import {
  Box,
  H1,
  Text,
  Table,
  TableRow,
  TableCell,
  ProgressBar,
} from "@adminjs/design-system";

const Dashboard = ({ busCount, driverCount, incidentCount, usersCount, activeIncidents, buses }) => {
  return (
    <Box variant="grey" padding="30px">
      <H1>TransTrack Admin Dashboard</H1>

      {/* KPI CARDS */}
      <Box display="flex" flexDirection="row" marginTop="20px" style={{ gap: "20px", flexWrap: "wrap" }}>
        <KpiCard label="Total Buses" value={busCount} />
        <KpiCard label="Total Drivers" value={driverCount} />
        <KpiCard label="Active Incidents" value={incidentCount} />
        <KpiCard label="Registered Users" value={usersCount} />
      </Box>

      {/* RECENT INCIDENTS */}
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" borderRadius="12px">
        <H1 fontSize="20px">Recent Incidents</H1>
        <Table>
          <TableRow>
            <TableCell><b>Bus</b></TableCell>
            <TableCell><b>Category</b></TableCell>
            <TableCell><b>Details</b></TableCell>
            <TableCell><b>Time</b></TableCell>
          </TableRow>
          {activeIncidents?.map((i) => (
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
      <Box variant="white" marginTop="30px" padding="20px" boxShadow="card" borderRadius="12px">
        <H1 fontSize="20px">Bus Status</H1>
        <Table>
          <TableRow>
            <TableCell><b>Bus ID</b></TableCell>
            <TableCell><b>Passengers</b></TableCell>
            <TableCell><b>Target Station</b></TableCell>
            <TableCell><b>Location</b></TableCell>
            <TableCell><b>Capacity Usage</b></TableCell>
          </TableRow>
          {buses?.map((b) => (
            <TableRow key={b._id}>
              <TableCell>{b.id}</TableCell>
              <TableCell>{b.passengers}</TableCell>
              <TableCell>{b.targetStation || "N/A"}</TableCell>
              <TableCell>{b.lat.toFixed(4)}, {b.lng.toFixed(4)}</TableCell>
              <TableCell>
                <ProgressBar value={(b.passengers / 40) * 100} />
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Box>
    </Box>
  );
};

const KpiCard = ({ label, value }) => (
  <Box
    variant="white"
    padding="20px"
    style={{
      width: "200px",
      borderRadius: "12px",
      textAlign: "center",
      boxShadow: "var(--box-shadow-card)",
      flex: 1,
      minWidth: "150px",
    }}
  >
    <Text fontSize="24px" fontWeight="bold">{value}</Text>
    <Text fontSize="14px" color="#555">{label}</Text>
  </Box>
);

export default Dashboard;
