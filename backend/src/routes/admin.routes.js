import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { applyCoinTransaction } from "../utils/coinWallet.js";
import { TX_TYPE } from "../models/CoinTransaction.js";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import Referral from "../models/Referral.js";

const router = Router();

// POST /api/admin/login  { username, password }
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ adminId: admin._id }, process.env.ADMIN_JWT_SECRET, { expiresIn: "12h" });
    res.json({ token, admin: { username: admin.username, role: admin.role } });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/dashboard
router.get("/dashboard", requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      totalUsers,
      todayNewUsers,
      last7DaysUsers,
      last30DaysUsers,
      activeUsers,
      pendingWithdrawals,
      successfulWithdrawals,
      coinAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ lastActiveAt: { $gte: fiveMinAgo } }),
      Withdrawal.countDocuments({ status: "PENDING" }),
      Withdrawal.countDocuments({ status: "SUCCESSFUL" }),
      User.aggregate([{ $group: { _id: null, totalCoins: { $sum: "$coins" } } }]),
    ]);

    res.json({
      totalUsers,
      todayNewUsers,
      last7DaysUsers,
      last30DaysUsers,
      activeUsers,
      totalCoinsInCirculation: coinAgg[0]?.totalCoins || 0,
      pendingWithdrawals,
      successfulWithdrawals,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/users?page=1&limit=50
router.get("/users", requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await User.countDocuments();
    res.json({ users, total, page, limit });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/withdrawals?status=PENDING
router.get("/withdrawals", requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const withdrawals = await Withdrawal.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "telegramUserId username firstName");
    res.json(withdrawals);
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/withdrawals/:id/approve
// Admin has already paid the user manually (USDT/UPI transfer outside this
// system) — this just marks the record so it stops showing as pending.
router.post("/withdrawals/:id/approve", requireAdmin, async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
    if (withdrawal.status !== "PENDING") {
      return res.status(400).json({ error: "Withdrawal is not pending" });
    }

    withdrawal.status = "SUCCESSFUL";
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = req.body.note || "";
    await withdrawal.save();

    await User.findByIdAndUpdate(withdrawal.userId, {
      $inc: { totalWithdrawn: withdrawal.coins },
    });

    res.json(withdrawal);
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/withdrawals/:id/reject
// Refunds the coins back to the user since they were already debited at
// request time.
router.post("/withdrawals/:id/reject", requireAdmin, async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
    if (withdrawal.status !== "PENDING") {
      return res.status(400).json({ error: "Withdrawal is not pending" });
    }

    withdrawal.status = "REJECTED";
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = req.body.note || "";
    await withdrawal.save();

    await applyCoinTransaction({
      userId: withdrawal.userId,
      type: TX_TYPE.WITHDRAWAL_REFUND,
      amount: withdrawal.coins,
      referenceId: String(withdrawal._id),
      note: `Refund for rejected withdrawal: ${req.body.note || "no reason given"}`,
    });

    res.json(withdrawal);
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/referrals
router.get("/referrals", requireAdmin, async (req, res, next) => {
  try {
    const referrals = await Referral.find()
      .sort({ createdAt: -1 })
      .populate("referrerId", "telegramUserId username")
      .populate("referredId", "telegramUserId username");
    res.json(referrals);
  } catch (e) {
    next(e);
  }
});

export default router;
