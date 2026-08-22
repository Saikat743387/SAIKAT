import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Protects user-facing routes. Expects a Bearer JWT issued by /api/auth/verify
 * (NOT the raw Telegram initData — that is only trusted once, at login, and
 * verified server-side there).
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ telegramUserId: payload.telegramUserId });
    if (!user) return res.status(401).json({ error: "User not found" });

    user.lastActiveAt = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
