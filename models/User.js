import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, index: true },
    passwordHash: String,
    isOnboard: { type: Boolean, default: false },
    currentBusId: { type: String, default: null },
    boardedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
