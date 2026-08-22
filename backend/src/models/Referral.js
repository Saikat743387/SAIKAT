import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rewardCoins: { type: Number, required: true },
    status: { type: String, enum: ["CREDITED"], default: "CREDITED" },
  },
  { timestamps: true }
);

export default mongoose.model("Referral", referralSchema);
