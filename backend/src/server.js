// Local development entry point only. On Vercel, api/index.js imports
// app.js directly and Vercel's Node runtime handles the "listening" part —
// app.listen() is never called there.
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Galaxy App backend running on :${PORT}`));
  })
  .catch((e) => {
    console.error("Failed to connect to MongoDB:", e.message);
    process.exit(1);
  });
