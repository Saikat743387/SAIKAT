import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["SUPERADMIN", "ADMIN"], default: "ADMIN" },

    // Account status for moderation
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    blockReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model("Admin", adminSchema);
