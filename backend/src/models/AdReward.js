import mongoose from "mongoose";

// One document per verified ad-view event. `adRef` should be a unique id
// supplied by the ad network's server-side reward callback so the same
// view can never be paid out twice.
const adRewardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adRef: { type: String, required: true, unique: true },
    rewardCoins: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("AdReward", adRewardSchema);
