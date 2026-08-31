import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true, index: true },
    dailyRewardCoins: { type: Number, default: 250, min: 0 },
    adRewardCoins: { type: Number, default: 100, min: 0 },
    referralRewardCoins: { type: Number, default: 5000, min: 0 },
    minimumWithdrawalCoins: { type: Number, default: 50000, min: 0 },
    withdrawalMethods: {
      USDT_TRC20: { type: Boolean, default: true },
      UPI: { type: Boolean, default: true },
    },
    tasksEnabled: { type: Boolean, default: true },
    adsEnabled: { type: Boolean, default: true },
    referralsEnabled: { type: Boolean, default: true },
    // Maintenance mode controls user access
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "System under maintenance. Please try again later." },
    // Optional announcement displayed to users
    announcement: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("AppSettings", appSettingsSchema);
