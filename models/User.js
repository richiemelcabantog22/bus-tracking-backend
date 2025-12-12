import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, unique: true, index: true },
    passwordHash: String, // will be hidden in AdminJS config
    role: { type: String, default: "user" },

    isOnboard: { type: Boolean, default: false },
    currentBusId: { type: String, default: null },
    boardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);