// Usage: npm run seed:admin -- <username> <password>
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import Admin from "../models/Admin.js";
import mongoose from "mongoose";

async function main() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error("Usage: npm run seed:admin -- <username> <password>");
    process.exit(1);
  }

  await connectDB();

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists. Updating password...`);
    existing.passwordHash = await bcrypt.hash(password, 10);
    await existing.save();
    console.log(`Admin "${username}" password updated.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ username, passwordHash, role: "SUPERADMIN" });
  console.log(`Admin "${username}" created.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
