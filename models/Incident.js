import mongoose from "mongoose";

const IncidentSchema = new mongoose.Schema(
  {
    busId: String,
    category: { type: String, default: "General" },
    details: String,
    lat: Number,
    lng: Number,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Incident = mongoose.model("Incident", IncidentSchema);