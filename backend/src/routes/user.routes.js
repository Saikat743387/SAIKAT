import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { applyCoinTransaction } from "../utils/coinWallet.js";
import { TX_TYPE } from "../models/CoinTransaction.js";
import CoinTransaction from "../models/CoinTransaction.js";
import Withdrawal from "../models/Withdrawal.js";
import Referral from "../models/Referral.js";
import AdReward from "../models/AdReward.js";
import AppSettings from "../models/AppSettings.js";

const router = Router();

async function getDailyRewardCoins() {
  try {
    const s = await AppSettings.findOne({ key: "global" });
    return s?.dailyRewardCoins ?? Number(process.env.DAILY_CLAIM_COINS || 250);
  } catch {
    return Number(process.env.DAILY_CLAIM_COINS || 250);
  }
}

function isSameCalendarDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// GET /api/user/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const u = req.user;
    
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    
    const adClickCount = await AdReward.countDocuments({ 
        userId: u._id,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    res.json({
      telegramUserId: u.telegramUserId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      coins: u.coins,
      referralCode: u.referralCode,
      totalReferrals: u.totalReferrals,
      totalEarned: u.totalEarned,
      totalWithdrawn: u.totalWithdrawn,
      adClickCount,
      lastDailyClaimAt: u.lastDailyClaimAt,
      createdAt: u.createdAt,
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/user/daily-claim
router.post("/daily-claim", requireAuth, async (req, res, next) => {
  try {
    const u = req.user;
    const now = new Date();

    if (u.lastDailyClaimAt && isSameCalendarDay(u.lastDailyClaimAt, now)) {
      return res.status(400).json({ error: "Daily reward already claimed today" });
    }

    const amount = await getDailyRewardCoins();
    const { user } = await applyCoinTransaction({
      userId: u._id,
      type: TX_TYPE.DAILY_CLAIM,
      amount,
      note: "Daily open reward",
    });

    user.lastDailyClaimAt = now;
    await user.save();

    res.json({ coins: user.coins, claimed: amount });
  } catch (e) {
    next(e);
  }
});

// GET /api/user/history/coins
router.get("/history/coins", requireAuth, async (req, res, next) => {
  try {
    const txs = await CoinTransaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(txs);
  } catch (e) {
    next(e);
  }
});

// GET /api/user/history/withdrawals
router.get("/history/withdrawals", requireAuth, async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (e) {
    next(e);
  }
});

// GET /api/user/history/referrals
router.get("/history/referrals", requireAuth, async (req, res, next) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("referredId", "username firstName telegramUserId");
    res.json(referrals);
  } catch (e) {
    next(e);
  }
});

export default router;
