// Vercel serverless entry point. Vercel's Node runtime calls the default
// export as (req, res) — an Express app's signature matches that exactly,
// so we just hand it the whole app.
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

// Connect to MongoDB once when the function loads. Subsequent requests
// reuse the cached connection via globalThis._galaxyMongooseConn.
connectDB().catch((e) => {
  console.error("Failed to connect to MongoDB at startup:", e.message);
});

export default app;
