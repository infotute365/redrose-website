import mongoose from "mongoose";

// Shared across App Router bundles and development hot reloads.
export default async function connectDB() {
  const uri = process.env.MONGODB_URI?.trim();
  const databaseName = /^mongodb(?:\+srv)?:\/\/[^/?]+\/([A-Za-z0-9_-]{1,63})(?:\?|$)/.exec(
    uri || "",
  )?.[1];
  if (!databaseName) throw new Error("MONGODB_URI must contain the Red Rose database name");
  if (process.env.MONGODB_DATABASE)
    throw new Error("MONGODB_DATABASE is no longer used; put the database name in MONGODB_URI");
  const cache =
    globalThis.__redRoseMongo || (globalThis.__redRoseMongo = { pending: null, client: null });
  if (mongoose.connection.readyState === 1) {
    cache.client = mongoose.connection.getClient();
    return mongoose;
  }
  if (!cache.pending) {
    cache.pending = (async () => {
      // The driver owns reconnection of an established client. Do not create a
      // second pool when a network interruption temporarily marks it disconnected.
      if (mongoose.connection.readyState === 3) throw new Error("Database is closing");
      if (mongoose.connection.readyState === 2) {
        await mongoose.connection.asPromise();
        cache.client = mongoose.connection.getClient();
        return mongoose;
      }
      if (
        cache.client &&
        cache.client === mongoose.connection.getClient() &&
        cache.client.topology
      ) {
        await mongoose.connection.db.admin().ping();
        return mongoose;
      }
      try {
        const connection = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 15000,
          maxPoolSize: 10,
          bufferCommands: false,
        });
        cache.client = mongoose.connection.getClient();
        return connection;
      } catch (error) {
        // Failed initial clients can retain a topology and a rejected initial
        // promise. They must not be confused with a live reconnecting client.
        cache.client = null;
        await mongoose.disconnect().catch(() => {});
        throw error;
      }
    })().finally(() => {
      cache.pending = null;
    });
  }
  return cache.pending;
}

// Red Rose CMS retains its existing MongoDB native collections and GridFS files.
// Both now reuse the single Mongoose connection above (same MongoDB database).
export async function getDatabase() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is not ready");
  return db;
}

export async function mediaBucket() {
  const db = await getDatabase();
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "media" });
}
