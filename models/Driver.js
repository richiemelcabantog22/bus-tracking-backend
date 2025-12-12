import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema(
  {
    busId: { type: String, unique: true, index: true },
    pinHash: String,
    capacity: { type: Number, default: 40 },
    contactEmail: { type: String, default: null },
    contactPhone: { type: String, default: null },
    resetCode: { type: String, default: null },
    resetExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Driver = mongoose.models.Driver || mongoose.model("Driver", DriverSchema);
