import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adsRoutes from "./routes/ads.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import withdrawalRoutes from "./routes/withdrawal.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import mongodbRateLimitStore from "./middleware/mongodbRateLimitStore.js";

const app = express();

app.set("trust proxy", true); // Required for rate limiting on Vercel (proxy headers)

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
  })
);
app.use(express.json());
app.use(morgan("dev"));

// MongoDB-backed rate limiter — persists across function instances and cold starts.
// This is critical for Vercel serverless where in-memory state is lost between invocations.
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60;

app.use("/api/", async (req, res, next) => {
  // Use IP + path as the rate limit key
  const key = `${req.ip}:${req.path}`;

  const { allowed, count, reset } = await mongodbRateLimitStore.check(key, WINDOW_MS, MAX_REQUESTS);
  if (!allowed) {
    res.set("Retry-After", String(reset - Math.floor(Date.now() / 1000)));
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  // Attach remaining info to response headers
  res.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  res.set("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - count)));
  res.set("X-RateLimit-Reset", String(reset));

  next();
});

app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    env: {
      mongodb: Boolean(process.env.MONGODB_URI),
      telegramBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      jwtSecret: Boolean(process.env.JWT_SECRET),
      adminJwtSecret: Boolean(process.env.ADMIN_JWT_SECRET),
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/admin", adminRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

export default app;
