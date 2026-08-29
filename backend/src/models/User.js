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

    // Account status for admin moderation
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    blockReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
