import mongoose from "mongoose";

const BusSchema = new mongoose.Schema(
  {
    busId: { type: String, unique: true, index: true }, // changed from id → busId
    lat: Number,
    lng: Number,
    passengers: { type: Number, default: 0 },

    targetStation: { type: String, default: null },
    route: [{ lat: Number, lng: Number }],

    etaSeconds: { type: Number, default: null },
    etaText: { type: String, default: null },

    isAtStation: { type: Boolean, default: false },
    currentStation: { type: String, default: null },

    // Internal engine values (hide these in AdminJS)
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

    movement: { type: String, default: "unknown" },
    crowdFlow: { type: String, default: "normal" },
    crowdExplanation: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Bus = mongoose.model("Bus", BusSchema);