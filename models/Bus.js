import mongoose from "mongoose";

const BusSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    lat: Number,
    lng: Number,
    passengers: Number,
    targetStation: { type: String, default: null },
    route: [{ lat: Number, lng: Number }],
    etaSeconds: { type: Number, default: null },
    etaText: { type: String, default: null },
    isAtStation: { type: Boolean, default: false },
    currentStation: { type: String, default: null },
    _lastLat: Number,
    _lastLng: Number,
    _lastMoveTime: Number,
    _speedLat: Number,
    _speedLng: Number,
    _speedTime: Number,
    _speedHistory: [Number],
    _history: [Number],
    _historyRecords: [{ t: Number, p: Number }],
    _lastHistoryValue: Number,
    movement: String,
    crowdFlow: String,
    crowdExplanation: String,
  },
  { timestamps: true }
);

const Bus = mongoose.models.Bus || mongoose.model("Bus", BusSchema);
export default Bus;
