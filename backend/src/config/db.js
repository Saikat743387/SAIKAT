import mongoose from "mongoose";

// Serverless-safe connection caching: Vercel functions can reuse the same
// warm container across requests, so we cache the connection on `globalThis`
// instead of reconnecting to MongoDB on every single invocation.
const cached = globalThis._galaxyMongooseConn || { conn: null, promise: null };
globalThis._galaxyMongooseConn = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set in .env");
    mongoose.set("strictQuery", true);
    cached.promise = mongoose.connect(uri).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
