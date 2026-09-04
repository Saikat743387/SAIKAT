import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { applyCoinTransaction } from "../utils/coinWallet.js";
import { TX_TYPE } from "../models/CoinTransaction.js";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import Referral from "../models/Referral.js";
import ActivityLog from "../models/ActivityLog.js";
import AppSettings from "../models/AppSettings.js";

const router = Router();

// Strict rate limiter for the seed endpoint — only 3 attempts per hour.
const seedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many seed attempts. Try again later." },
});

// Rate limiter for admin login — 5 attempts per 15 minutes.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

// Rate limiter for sensitive admin write actions.
const adminWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin actions. Try again later." },
});

// POST /api/admin/seed
router.post("/seed", seedLimiter, async (req, res, next) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_ADMIN_SEED !== "true") {
    return res.status(403).json({ error: "Seed endpoint is disabled in production." });
  }
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }

    const existing = await Admin.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Admin already exists. Seed endpoint disabled." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, passwordHash, role: "SUPERADMIN" });
    
    res.json({ message: "Admin created successfully.", admin: { username: admin.username, role: admin.role } });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/login
router.post("/login", adminLoginLimiter, async (req, res, next) => {
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

// GET /api/admin/users
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

// GET /api/admin/settings — read current app settings (no admin required for read)
router.get("/settings", async (req, res, next) => {
  try {
    const settings = await AppSettings.findOne({ key: "global" });
    if (!settings) {
      // Return defaults when no settings doc exists
      return res.json({
        dailyRewardCoins: Number(process.env.DAILY_CLAIM_COINS || 250),
        adRewardCoins: Number(process.env.AD_REWARD_COINS || 100),
        referralRewardCoins: Number(process.env.REFERRAL_REWARD_COINS || 5000),
        minimumWithdrawalCoins: Number(process.env.MIN_WITHDRAWAL_COINS || 50000),
        withdrawalMethods: { USDT_TRC20: true, UPI: true },
        tasksEnabled: true,
        adsEnabled: true,
        referralsEnabled: true,
        maintenanceMode: false,
        maintenanceMessage: "",
        announcement: "",
      });
    }
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/users/search — list users with optional search and pagination
router.get("/users/search", requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const q = (req.query.q || "").trim();

    const filter = q
      ? {
          $or: [
            { telegramUserId: new RegExp(q, "i") },
            { username: new RegExp(q, "i") },
            { firstName: new RegExp(q, "i") },
            { lastName: new RegExp(q, "i") },
            { referralCode: new RegExp(q, "i") },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page, limit });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/users/:id — single user with recent transactions
router.get("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const recentTransactions = await CoinTransaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ user, recentTransactions });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/withdrawals — list withdrawals with optional status filter
router.get("/withdrawals", requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 20);
    const status = req.query.status || null;

    const filter = status ? { status } : {};

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "telegramUserId username firstName lastName"),
      Withdrawal.countDocuments(filter),
    ]);
    res.json({ withdrawals, total, page, limit });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/referrals — list all referrals
router.get("/referrals", requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);

    const [referrals, total] = await Promise.all([
      Referral.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("referrerId", "telegramUserId username firstName lastName")
        .populate("referredId", "telegramUserId username firstName lastName"),
      Referral.countDocuments(),
    ]);
    res.json({ referrals, total, page, limit });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/withdrawals/:id/approve
router.post("/withdrawals/:id/approve", requireAdmin, adminWriteLimiter, async (req, res, next) => {
  try {
    const withdrawalId = req.params.id;
    const adminId = req.admin._id;
    const { note } = req.body;

    // Atomic findOneAndUpdate: only succeeds if status is still PENDING.
    // Prevents double-approval when concurrent admin requests hit the same withdrawal.
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: "PENDING" },
      { status: "SUCCESSFUL", processedAt: new Date(), adminNote: note || "" },
      { new: true }
    );

    if (!withdrawal) {
      const existing = await Withdrawal.findById(withdrawalId);
      if (!existing) return res.status(404).json({ error: "Withdrawal not found" });
      return res.status(400).json({ error: `Withdrawal is not pending. Status: ${existing.status}` });
    }

    try {
      await User.findByIdAndUpdate(withdrawal.userId, { $inc: { totalWithdrawn: withdrawal.coins } });
    } catch (err) {
      // Rollback withdrawal status if user update fails to preserve data accuracy
      await Withdrawal.findByIdAndUpdate(withdrawalId, { status: "PENDING", processedAt: null, adminNote: "" });
      throw err;
    }

    await ActivityLog.create({
      adminId,
      action: 'withdrawal_approved',
      resourceType: "Withdrawal",
      resourceId: withdrawal._id,
      details: { note, amount: withdrawal.coins },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(withdrawal);
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/withdrawals/:id/reject
router.post("/withdrawals/:id/reject", requireAdmin, adminWriteLimiter, async (req, res, next) => {
  try {
    const withdrawalId = req.params.id;
    const adminId = req.admin._id;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    // Atomic findOneAndUpdate: only succeeds if status is still PENDING.
    // Prevents double-rejection when concurrent admin requests hit the same withdrawal.
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: "PENDING" },
      { status: "REJECTED", processedAt: new Date(), adminNote: note },
      { new: true }
    );

    if (!withdrawal) {
      const existing = await Withdrawal.findById(withdrawalId);
      if (!existing) return res.status(404).json({ error: "Withdrawal not found" });
      return res.status(400).json({ error: `Withdrawal is not pending. Status: ${existing.status}` });
    }

    try {
      await applyCoinTransaction({
        userId: withdrawal.userId,
        type: TX_TYPE.WITHDRAWAL_REFUND,
        amount: withdrawal.coins,
        referenceId: String(withdrawal._id),
        note: `Refund: ${note}`
      });
    } catch (err) {
      // Rollback rejection status if refund transaction fails
      await Withdrawal.findByIdAndUpdate(withdrawalId, { status: "PENDING", processedAt: null, adminNote: "" });
      throw err;
    }

    await ActivityLog.create({
      adminId,
      action: 'withdrawal_rejected',
      resourceType: "Withdrawal",
      resourceId: withdrawal._id,
      details: { note, amount: withdrawal.coins },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(withdrawal);
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/users/:id/block
router.post("/users/:id/block", requireAdmin, adminWriteLimiter, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const adminId = req.admin._id;
    const { action, reason } = req.body;

    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: "Invalid action." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Capture before state
    const beforeState = { isBlocked: user.isBlocked, blockedAt: user.blockedAt, blockReason: user.blockReason };

    if (action === 'block') {
      if (!reason || reason.trim() === '') {
        return res.status(400).json({ error: "Reason required" });
      }
      user.isBlocked = true;
      user.blockedAt = new Date();
      user.blockedBy = adminId;
      user.blockReason = reason;
    } else {
      user.isBlocked = false;
      user.blockedAt = null;
      user.blockedBy = null;
      user.blockReason = "";
    }

    await user.save();

    // Capture after state
    const afterState = { isBlocked: user.isBlocked, blockedAt: user.blockedAt, blockReason: user.blockReason };

    await ActivityLog.create({
      adminId,
      action: action === 'block' ? 'user_blocked' : 'user_unblocked',
      resourceType: "User",
      resourceId: user._id,
      details: { before: beforeState, after: afterState },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: "User updated successfully." });
  } catch (e) {
    next(e);
  }
});

// PUT /api/admin/settings
router.put("/settings", requireAdmin, adminWriteLimiter, async (req, res, next) => {
  try {
    const adminId = req.admin._id;
    const updates = req.body;

    const allowedUpdates = [
      'dailyRewardCoins', 'adRewardCoins', 'referralRewardCoins',
      'minimumWithdrawalCoins', 'withdrawalMethods', 'tasksEnabled',
      'adsEnabled', 'referralsEnabled'
    ];

    const filteredUpdates = {};
    allowedUpdates.forEach(key => { if (updates[key] !== undefined) filteredUpdates[key] = updates[key]; });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: "No updateable settings" });
    }

    const currentSettings = await AppSettings.findOne({ key: "global" }) || {};
    const before = {};
    const after = {};
    Object.keys(filteredUpdates).forEach(key => {
      before[key] = currentSettings[key];
      after[key] = filteredUpdates[key];
    });

    const settings = await AppSettings.findOneAndUpdate(
      { key: "global" },
      { ...filteredUpdates, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    await ActivityLog.create({
      adminId,
      action: 'settings_updated',
      resourceType: "AppSettings",
      resourceId: settings._id,
      details: { before, after },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(settings);
  } catch (e) {
    next(e);
  }
});

// PUT /api/admin/maintenance
router.put("/maintenance", requireAdmin, adminWriteLimiter, async (req, res, next) => {
  try {
    const adminId = req.admin._id;
    const { maintenanceMode, maintenanceMessage } = req.body;

    if (typeof maintenanceMode !== 'boolean') {
      return res.status(400).json({ error: "Invalid maintenanceMode" });
    }

    const currentSettings = await AppSettings.findOne({ key: "global" }) || {};
    const before = { maintenanceMode: currentSettings.maintenanceMode, maintenanceMessage: currentSettings.maintenanceMessage };

    const settings = await AppSettings.findOneAndUpdate(
      { key: "global" },
      {
        maintenanceMode,
        maintenanceMessage: maintenanceMessage || "System under maintenance.",
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    const after = { maintenanceMode: settings.maintenanceMode, maintenanceMessage: settings.maintenanceMessage };

    await ActivityLog.create({
      adminId,
      action: maintenanceMode ? 'maintenance_enabled' : 'maintenance_disabled',
      resourceType: "AppSettings",
      resourceId: settings._id,
      details: { before, after },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(settings);
  } catch (e) {
    next(e);
  }
});

export default router;
