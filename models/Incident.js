import mongoose from "mongoose";

const IncidentSchema = new mongoose.Schema(
  {
    busId: String,
    category: String,
    details: String,
    lat: Number,
    lng: Number,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "incidents" }
);

const Incident = mongoose.models.Incident || mongoose.model("Incident", IncidentSchema);
export default Incident;
