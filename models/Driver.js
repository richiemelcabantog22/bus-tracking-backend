import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema(
  {
    busId: { type: String, unique: true, index: true },
    pinHash: String,
    capacity: Number,
    resetCode: String,
    resetExpires: Date,
  },
  { timestamps: true, collection: "drivers" }
);

const Driver = mongoose.models.Driver || mongoose.model("Driver", DriverSchema);
export default Driver;
