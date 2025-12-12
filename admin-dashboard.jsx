import React from "react";

const Dashboard = ({ busCount, driverCount, incidentCount, usersCount, activeIncidents, buses }) => {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>TransTrack Admin Dashboard</h1>

      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div style={{ padding: "10px", border: "1px solid #ccc" }}>Buses: {busCount}</div>
        <div style={{ padding: "10px", border: "1px solid #ccc" }}>Drivers: {driverCount}</div>
        <div style={{ padding: "10px", border: "1px solid #ccc" }}>Users: {usersCount}</div>
        <div style={{ padding: "10px", border: "1px solid #ccc" }}>Incidents: {incidentCount}</div>
      </div>

      <h2>Recent Incidents</h2>
      {activeIncidents && activeIncidents.length ? (
        <ul>
          {activeIncidents.map((i) => (
            <li key={i._id}>
              {i.category} on bus {i.busId} at {i.timestamp ? new Date(i.timestamp).toLocaleString() : "N/A"}
            </li>
          ))}
        </ul>
      ) : (
        <p>No incidents recorded.</p>
      )}

      <h2>Latest Buses</h2>
      {buses && buses.length ? (
        <ul>
          {buses.map((b) => (
            <li key={b._id}>
              {b.id}: {b.passengers} passengers
            </li>
          ))}
        </ul>
      ) : (
        <p>No buses recorded.</p>
      )}
    </div>
  );
};

export default Dashboard;
