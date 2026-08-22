import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    method: { type: String, enum: ["USDT_TRC20", "UPI"], required: true },
    coins: { type: Number, required: true },
    usdtAddress: { type: String, default: null },
    upiId: { type: String, default: null },
    status: { type: String, enum: ["PENDING", "SUCCESSFUL", "REJECTED"], default: "PENDING", index: true },
    adminNote: { type: String, default: "" },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Withdrawal", withdrawalSchema);
