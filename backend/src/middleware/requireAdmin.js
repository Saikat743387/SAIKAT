import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing admin token" });

    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    const admin = await Admin.findById(payload.adminId);
    if (!admin) return res.status(401).json({ error: "Admin not found" });

    req.admin = admin;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
