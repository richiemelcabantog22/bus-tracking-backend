import React, { useEffect, useState } from "react";
import { ApiClient } from "adminjs";

const api = new ApiClient();

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getDashboard().then((res) => setStats(res.data));
  }, []);

  if (!stats) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 24 }}>
        Loading analytics...
      </div>
    );
  }

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      color: "#6366F1",
    },
    {
      title: "Active Drivers",
      value: stats.totalDrivers,
      color: "#10B981",
    },
    {
      title: "Registered Buses",
      value: stats.totalBuses,
      color: "#F59E0B",
    },
    {
      title: "Incidents Today",
      value: stats.incidentsToday,
      color: "#EF4444",
    },
    {
      title: "AI Risk Score",
      value: stats.aiScore + "%",
      color: "#8B5CF6",
    },
  ];

  return (
    <div style={{ padding: "40px" }}>
      <h1
        style={{
          fontSize: "32px",
          fontWeight: "700",
          marginBottom: "30px",
          color: "#1F2937",
        }}
      >
        Analytics Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
        }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "16px",
              boxShadow:
                "0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)",
              border: "1px solid #F3F4F6",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#6B7280",
                marginBottom: "8px",
              }}
            >
              {card.title}
            </div>

            <div
              style={{
                fontSize: "42px",
                fontWeight: "800",
                color: card.color,
                lineHeight: 1.1,
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
