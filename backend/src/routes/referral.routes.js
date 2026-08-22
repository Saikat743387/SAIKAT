import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Referral from "../models/Referral.js";

const router = Router();

// GET /api/referral/me — referral code + link to share
router.get("/me", requireAuth, async (req, res) => {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "your_bot";
  res.json({
    referralCode: req.user.referralCode,
    totalReferrals: req.user.totalReferrals,
    shareLink: `https://t.me/${botUsername}?startapp=${req.user.referralCode}`,
  });
});

// GET /api/referral/history
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("referredId", "username firstName telegramUserId createdAt");
    res.json(referrals);
  } catch (e) {
    next(e);
  }
});

export default router;
