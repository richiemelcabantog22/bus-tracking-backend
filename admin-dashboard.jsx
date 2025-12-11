import React from "react";
import { Box, H1, Text, Table, TableRow, TableCell } from "@adminjs/design-system";

const Dashboard = (props) => {
  const { busCount, driverCount, incidentCount, usersCount, activeIncidents, buses } = props;

  return (
    <Box variant="grey">
      <H1>TransTrack Admin Dashboard</H1>

      {/* KPI CARDS */}
      <Box flex flexDirection="row" marginTop="20px" gridGap="20px">
        <KpiCard label="Total Buses" value={busCount} />
        <KpiCard label="Total Drivers" value={driverCount} />
        <KpiCard label="Active Incidents" value={incidentCount} />
        <KpiCard label="Registered Users" value={usersCount} />
      </Box>

      {/* RECENT INCIDENTS */}
      <Box variant="white" marginTop="30px" padding="20px">
        <H1 fontSize="20px">Recent Incidents</H1>
        <Table>
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

      {/* TOP 5 BUSES */}
      <Box variant="white" marginTop="30px" padding="20px">
        <H1 fontSize="20px">Sample Buses Data</H1>
        <Table>
          {buses?.map((b) => (
            <TableRow key={b._id}>
              <TableCell>{b.id}</TableCell>
              <TableCell>{b.passengers}</TableCell>
              <TableCell>{b.targetStation || "N/A"}</TableCell>
              <TableCell>{b.lat.toFixed(4)}, {b.lng.toFixed(4)}</TableCell>
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
    style={{ width: "200px", borderRadius: "10px", textAlign: "center" }}
  >
    <Text fontSize="18px" fontWeight="bold">{value}</Text>
    <Text fontSize="14px" color="#555">{label}</Text>
  </Box>
);

export default Dashboard;
