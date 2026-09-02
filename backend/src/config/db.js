import mongoose from "mongoose";

const cached = globalThis._galaxyMongooseConn || { conn: null, promise: null };
globalThis._galaxyMongooseConn = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set in .env");

    mongoose.set("strictQuery", true);

    // Explicitly set the database name to 'galaxy_app' in connection options
    // This ensures we connect to the right DB regardless of the URI string in Vercel
    cached.promise = mongoose.connect(uri, {
      dbName: "galaxy_app",
    })
      .then((m) => m)
      .catch((e) => {
        // Reset promise on failure so the next request retries instead of
        // re-awaiting the same rejected promise forever.
        cached.promise = null;
        throw e;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
