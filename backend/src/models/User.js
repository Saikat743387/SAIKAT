import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    telegramUserId: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    languageCode: { type: String, default: "" },

    coins: { type: Number, default: 0, min: 0 },

    referralCode: { type: String, required: true, unique: true, index: true },
    referredBy: { type: String, default: null }, // telegramUserId of referrer

    totalReferrals: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 }, // lifetime coins earned (all positive txns)
    totalWithdrawn: { type: Number, default: 0 }, // lifetime coins successfully withdrawn

    lastDailyClaimAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
