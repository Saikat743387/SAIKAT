import { Router } from "express";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import User from "../models/User.js";
import Referral from "../models/Referral.js";
import { verifyInitData } from "../middleware/verifyTelegramInitData.js";
import { applyCoinTransaction } from "../utils/coinWallet.js";
import { TX_TYPE } from "../models/CoinTransaction.js";

const router = Router();

// POST /api/auth/verify  { initData }
// Verifies raw Telegram initData server-side, then loads or creates the
// user. No email/password/OTP anywhere — the Telegram identity IS the account.
router.post("/verify", async (req, res, next) => {
  try {
    const { initData } = req.body;
    const { user: tgUser, startParam } = verifyInitData(initData, process.env.TELEGRAM_BOT_TOKEN);

    const telegramUserId = String(tgUser.id);
    let user = await User.findOne({ telegramUserId });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        telegramUserId,
        username: tgUser.username || "",
        firstName: tgUser.first_name || "",
        lastName: tgUser.last_name || "",
        languageCode: tgUser.language_code || "",
        referralCode: nanoid(8),
      });

      // Handle referral: startParam carries the referrer's referralCode
      // (Telegram passes this via ?startapp=CODE on the Mini App link).
      if (startParam) {
        const referrer = await User.findOne({ referralCode: startParam });
        if (referrer && String(referrer._id) !== String(user._id)) {
          user.referredBy = referrer.telegramUserId;
          await user.save();

          const rewardCoins = Number(process.env.REFERRAL_REWARD_COINS || 5000);
          await applyCoinTransaction({
            userId: referrer._id,
            type: TX_TYPE.REFERRAL,
            amount: rewardCoins,
            referenceId: String(user._id),
            note: `Referral bonus for inviting telegram user ${telegramUserId}`,
          });
          referrer.totalReferrals += 1;
          await referrer.save();

          await Referral.create({
            referrerId: referrer._id,
            referredId: user._id,
            rewardCoins,
          });
        }
      }
    } else {
      user.username = tgUser.username || user.username;
      user.firstName = tgUser.first_name || user.firstName;
      user.lastName = tgUser.last_name || user.lastName;
      user.lastActiveAt = new Date();
      await user.save();
    }

    const token = jwt.sign({ telegramUserId }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      isNewUser,
      user: {
        telegramUserId: user.telegramUserId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        coins: user.coins,
        referralCode: user.referralCode,
        totalReferrals: user.totalReferrals,
        totalEarned: user.totalEarned,
        totalWithdrawn: user.totalWithdrawn,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
