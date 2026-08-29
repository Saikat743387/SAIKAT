import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { applyCoinTransaction } from "../utils/coinWallet.js";
import { TX_TYPE } from "../models/CoinTransaction.js";
import AdReward from "../models/AdReward.js";

const router = Router();

router.post("/reward", requireAuth, async (req, res, next) => {
  try {
    const { adRef } = req.body;
    if (!adRef) return res.status(400).json({ error: "adRef is required" });

    const existing = await AdReward.findOne({ adRef });
    if (existing) {
      return res.status(400).json({ error: "This ad reward has already been claimed" });
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);

    const todayCount = await AdReward.countDocuments({
      userId: req.user._id,
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    if (todayCount >= 10) {
      return res.status(400).json({ error: "Maximum of 10 ads per day reached" });
    }

    const amount = Number(process.env.AD_REWARD_COINS || 100);

    await AdReward.create({ userId: req.user._id, adRef, rewardCoins: amount });

    const { user } = await applyCoinTransaction({
      userId: req.user._id,
      type: TX_TYPE.AD_REWARD,
      amount,
      referenceId: adRef,
      note: "Full ad watched",
    });

    res.json({ coins: user.coins, claimed: amount });
  } catch (e) {
    next(e);
  }
});

export default router;
