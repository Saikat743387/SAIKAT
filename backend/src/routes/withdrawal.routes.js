import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { applyCoinTransaction } from "../utils/coinWallet.js";
import { TX_TYPE } from "../models/CoinTransaction.js";
import Withdrawal from "../models/Withdrawal.js";
import AppSettings from "../models/AppSettings.js";

const router = Router();

async function getMinWithdrawalCoins() {
  try {
    const s = await AppSettings.findOne({ key: "global" });
    return s?.minimumWithdrawalCoins ?? Number(process.env.MIN_WITHDRAWAL_COINS || 50000);
  } catch {
    return Number(process.env.MIN_WITHDRAWAL_COINS || 50000);
  }
}

// POST /api/withdrawal/request
// body: { method: "USDT_TRC20" | "UPI", coins, usdtAddress?, upiId? }
//
// Coins are debited immediately (moved into escrow / PENDING) so the same
// balance can't be withdrawn twice while an admin review is in progress.
// If an admin rejects the request, the coins are refunded (see admin.routes.js).
router.post("/request", requireAuth, async (req, res, next) => {
  try {
    const { method, coins, usdtAddress, upiId } = req.body;
    const minWithdrawal = await getMinWithdrawalCoins();

    if (!["USDT_TRC20", "UPI"].includes(method)) {
      return res.status(400).json({ error: "Invalid withdrawal method" });
    }
    const amount = Number(coins);
    if (!amount || amount < minWithdrawal) {
      return res.status(400).json({ error: `Minimum withdrawal is ${minWithdrawal} coins` });
    }
    if (method === "USDT_TRC20" && !usdtAddress) {
      return res.status(400).json({ error: "usdtAddress is required for USDT TRC20 withdrawals" });
    }
    if (method === "UPI" && !upiId) {
      return res.status(400).json({ error: "upiId is required for UPI withdrawals" });
    }
    if (amount > req.user.coins) {
      return res.status(400).json({ error: "Insufficient coin balance" });
    }

    const withdrawal = await Withdrawal.create({
      userId: req.user._id,
      method,
      coins: amount,
      usdtAddress: method === "USDT_TRC20" ? usdtAddress : null,
      upiId: method === "UPI" ? upiId : null,
      status: "PENDING",
    });

    await applyCoinTransaction({
      userId: req.user._id,
      type: TX_TYPE.WITHDRAWAL,
      amount: -amount,
      referenceId: String(withdrawal._id),
      note: `Withdrawal request via ${method}`,
    });

    res.json(withdrawal);
  } catch (e) {
    next(e);
  }
});

// GET /api/withdrawal/history
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (e) {
    next(e);
  }
});

export default router;
