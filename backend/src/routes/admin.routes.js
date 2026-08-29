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
import ActivityLog from "../models/ActivityLog.js";
import AppSettings from "../models/AppSettings.js";

const router = Router();

// POST /api/admin/seed  { username, password }
// One-time endpoint to create the initial admin account.
// After first use, this endpoint is disabled.
router.post("/seed", async (req, res, next) => {
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
    console.log(`[SEED] Admin "${username}" created.`);

    // Disable the seed endpoint after first use by removing this route
    // (In practice, we just return success and the caller should never call again)
    res.json({ message: `Admin "${username}" created successfully.`, admin: { username: admin.username, role: admin.role } });
  } catch (e) {
    next(e);
  }
});

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
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { 'referrerId.telegramUserId': { $regex: search, $options: 'i' } },
        { 'referrerId.username': { $regex: search, $options: 'i' } },
        { 'referredId.telegramUserId': { $regex: search, $options: 'i' } },
        { 'referredId.username': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("referrerId", "telegramUserId username firstName")
        .populate("referredId", "telegramUserId username firstName"),
      Referral.countDocuments(filter)
    ]);

    res.json({ referrals, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    next(e);
  }
});

// ========== USER MANAGEMENT ENHANCEMENTS ==========

// GET /api/admin/users/search?q=telegramId|username|referralCode
router.get("/users/search", requireAdmin, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { telegramUserId: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { referralCode: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password'), // Exclude password field
      User.countDocuments(filter)
    ]);

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/users/:id - Get detailed user info
router.get("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get recent transaction history
    const recentTransactions = await CoinTransaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ user, recentTransactions });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/users/:id/block - Block/unblock user
router.post("/users/:id/block", requireAdmin, async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'block' or 'unblock'
    const userId = req.params.id;
    const adminId = req.admin._id;

    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Use 'block' or 'unblock'" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (action === 'block') {
      if (user.isBlocked) {
        return res.status(400).json({ error: "User is already blocked" });
      }

      user.isBlocked = true;
      user.blockedAt = new Date();
      user.blockedBy = adminId;
      user.blockReason = reason || "No reason provided";
    } else {
      if (!user.isBlocked) {
        return res.status(400).json({ error: "User is not blocked" });
      }

      user.isBlocked = false;
      user.blockedAt = null;
      user.blockedBy = null;
      user.blockReason = "";
    }

    await user.save();

    // Log activity
    await ActivityLog.create({
      adminId,
      action: `${action}_user`,
      resourceType: "User",
      resourceId: user._id,
      details: { reason, previousState: !user.isBlocked },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ user, message: `User ${action}ed successfully` });
  } catch (e) {
    next(e);
  }
});

// ========== BALANCE MANAGEMENT ==========

// POST /api/admin/users/:id/balance/adjust - Add or remove coins
router.post("/users/:id/balance/adjust", requireAdmin, async (req, res, next) => {
  try {
    const { amount, reason } = req.body; // positive to add, negative to remove
    const userId = req.params.id;
    const adminId = req.admin._id;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: "Reason is required for balance adjustment" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if user has sufficient coins for removal
    if (amount < 0 && Math.abs(amount) > user.coins) {
      return res.status(400).json({ error: "Insufficient coin balance" });
    }

    const balanceBefore = user.coins;
    const balanceAfter = balanceBefore + amount;

    // Apply the coin transaction
    const { user: updatedUser } = await applyCoinTransaction({
      userId: user._id,
      type: TX_TYPE.ADMIN_ADJUST,
      amount,
      referenceId: String(adminId),
      note: `Admin balance adjustment: ${reason}`
    });

    // Log activity
    await ActivityLog.create({
      adminId,
      action: amount > 0 ? 'balance_added' : 'balance_removed',
      resourceType: "User",
      resourceId: user._id,
      details: {
        amount,
        balanceBefore,
        balanceAfter,
        reason
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      user: updatedUser,
      message: `Balance updated successfully. ${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} coins.`,
      balanceBefore,
      balanceAfter
    });
  } catch (e) {
    next(e);
  }
});

// ========== WITHDRAWAL MANAGEMENT ENHANCEMENTS ==========

// GET /api/admin/withdrawals - Enhanced with filtering and pagination
router.get("/withdrawals", requireAdmin, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && ['PENDING', 'SUCCESSFUL', 'REJECTED'].includes(status)) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("userId", "telegramUserId username firstName"),
      Withdrawal.countDocuments(filter)
    ]);

    res.json({ withdrawals, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/withdrawals/:id/approve - Enhanced with idempotency check
router.post("/withdrawals/:id/approve", requireAdmin, async (req, res, next) => {
  try {
    const withdrawalId = req.params.id;
    const adminId = req.admin._id;
    const { note } = req.body;

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });

    // Idempotency check
    if (withdrawal.status !== "PENDING") {
      return res.status(400).json({
        error: `Withdrawal is not pending. Current status: ${withdrawal.status}`
      });
    }

    withdrawal.status = "SUCCESSFUL";
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = note || "";
    await withdrawal.save();

    // Update user's total withdrawn
    await User.findByIdAndUpdate(withdrawal.userId, {
      $inc: { totalWithdrawn: withdrawal.coins }
    });

    // Log activity
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

// POST /api/admin/withdrawals/:id/reject - Enhanced with idempotency check
router.post("/withdrawals/:id/reject", requireAdmin, async (req, res, next) => {
  try {
    const withdrawalId = req.params.id;
    const adminId = req.admin._id;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });

    // Idempotency check
    if (withdrawal.status !== "PENDING") {
      return res.status(400).json({
        error: `Withdrawal is not pending. Current status: ${withdrawal.status}`
      });
    }

    withdrawal.status = "REJECTED";
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = note;
    await withdrawal.save();

    // Refund the coins back to user
    await applyCoinTransaction({
      userId: withdrawal.userId,
      type: TX_TYPE.WITHDRAWAL_REFUND,
      amount: withdrawal.coins,
      referenceId: String(withdrawal._id),
      note: `Refund for rejected withdrawal: ${note}`
    });

    // Log activity
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

// ========== APP SETTINGS MANAGEMENT ==========

// GET /api/admin/settings - Get current settings
router.get("/admin/settings", requireAdmin, async (req, res, next) => {
  try {
    let settings = await AppSettings.findOne({ key: "global" });

    // If no settings exist, create default ones
    if (!settings) {
      settings = await AppSettings.create({ key: "global" });
    }

    res.json(settings);
  } catch (e) {
    next(e);
  }
});

// PUT /api/admin/settings - Update settings
router.put("/admin/settings", requireAdmin, async (req, res, next) => {
  try {
    const adminId = req.admin._id;
    const updates = req.body;

    // Prevent updating protected fields
    const allowedUpdates = [
      'dailyRewardCoins',
      'adRewardCoins',
      'referralRewardCoins',
      'minimumWithdrawalCoins',
      'withdrawalMethods',
      'tasksEnabled',
      'adsEnabled',
      'referralsEnabled'
    ];

    // Filter to only allowed updates
    const filteredUpdates = {};
    allowedUpdates.forEach(key => {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: "No valid settings to update" });
    }

    const settings = await AppSettings.findOneAndUpdate(
      { key: "global" },
      {
        ...filteredUpdates,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    // Log activity
    await ActivityLog.create({
      adminId,
      action: 'settings_updated',
      resourceType: "AppSettings",
      resourceId: settings._id,
      details: filteredUpdates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(settings);
  } catch (e) {
    next(e);
  }
});

// ========== MAINTENANCE MODE ==========

// GET /api/admin/maintenance - Get maintenance status
router.get("/admin/maintenance", requireAdmin, async (req, res, next) => {
  try {
    const settings = await AppSettings.findOne({ key: "global" });
    const maintenanceMode = settings ? !!settings.maintenanceMode : false;
    const maintenanceMessage = settings ? settings.maintenanceMessage : "System under maintenance. Please try again later.";

    res.json({
      maintenanceMode,
      maintenanceMessage
    });
  } catch (e) {
    next(e);
  }
});

// PUT /api/admin/maintenance - Update maintenance status
router.put("/admin/maintenance", requireAdmin, async (req, res, next) => {
  try {
    const adminId = req.admin._id;
    const { maintenanceMode, maintenanceMessage } = req.body;

    if (typeof maintenanceMode !== 'boolean') {
      return res.status(400).json({ error: "maintenanceMode must be a boolean" });
    }

    const settings = await AppSettings.findOneAndUpdate(
      { key: "global" },
      {
        maintenanceMode: !!maintenanceMode,
        maintenanceMessage: maintenanceMessage || "System under maintenance. Please try again later.",
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    // Log activity
    await ActivityLog.create({
      adminId,
      action: maintenanceMode ? 'maintenance_enabled' : 'maintenance_disabled',
      resourceType: "AppSettings",
      resourceId: settings._id,
      details: { maintenanceMode, maintenanceMessage },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage
    });
  } catch (e) {
    next(e);
  }
});

export default router;
