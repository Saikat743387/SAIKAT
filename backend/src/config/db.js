import mongoose from "mongoose";

const cached = globalThis._galaxyMongooseConn || { conn: null, promise: null };
globalThis._galaxyMongooseConn = cached;

export async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  if (!cached.promise || mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set in .env");

    mongoose.set("strictQuery", true);

    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
      .then((m) => m)
      .catch((e) => {
        cached.promise = null;
        cached.conn = null;
        throw e;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
