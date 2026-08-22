import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["JOIN_CHANNEL", "VISIT_WEBSITE", "OTHER"], default: "OTHER" },
    rewardCoins: { type: Number, required: true },
    limitPerUser: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
