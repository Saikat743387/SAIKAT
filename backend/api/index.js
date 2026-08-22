// Vercel serverless entry point. Vercel's Node runtime calls the default
// export as (req, res) — an Express app's signature matches that exactly,
// so we just hand it the whole app.
import app from "../src/app.js";

export default app;
