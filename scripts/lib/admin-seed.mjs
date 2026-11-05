import { hashAdminPassword } from "../../src/server/auth/password.mjs";
import { readDatabaseConfiguration } from "../../src/server/config/mongo-client.mjs";

export function readSeedConfiguration() {
  const { uri, databaseName } = readDatabaseConfiguration();
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !uri ||
    !username ||
    !/^[a-zA-Z0-9_.-]{3,64}$/.test(username) ||
    !password ||
    password.length < 20 ||
    password.length > 256
  ) {
    throw new Error(
      "Set MONGODB_URI, ADMIN_USERNAME (3-64 letters, digits, underscores, dots or hyphens), and ADMIN_PASSWORD (20-256 characters).",
    );
  }
  return { uri, username, password, databaseName };
}

// This helper accesses administrator records only. School data belongs to db:seed.
export async function seedAdmin(db, { username, password, resetPassword = false }) {
  const admins = db.collection("admins");
  await admins.createIndex({ usernameNormalized: 1 }, { unique: true });
  const usernameNormalized = username.toLowerCase();
  const existing = await admins.findOne({ usernameNormalized });
  if (existing) {
    if (!resetPassword) return "exists";
    await admins.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...(await hashAdminPassword(password)),
          updatedAt: new Date().toISOString(),
        },
        $inc: { sessionVersion: 1 },
      },
    );
    await db
      .collection("adminSessions")
      .updateMany(
        { usernameNormalized, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
    return "reset";
  }
  if (await admins.countDocuments({}, { limit: 1 })) return "different-admin";

  // A stable ID and $setOnInsert also protect simultaneous first-run seeds,
  // including two processes configured with different usernames.
  try {
    const result = await admins.updateOne(
      { _id: "initial-admin" },
      {
        $setOnInsert: {
          username,
          usernameNormalized,
          ...(await hashAdminPassword(password)),
          role: "admin",
          active: true,
          sessionVersion: 1,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) return "created";
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
  return (await admins.findOne({ usernameNormalized })) ? "exists" : "different-admin";
}

export function reportAdminSeed(result) {
  const messages = {
    created: "Initial admin created.",
    exists: "Admin already exists; credentials and sessions were not changed.",
    "different-admin":
      "An administrator is already provisioned under another username; no account was created or changed.",
    reset: "Admin password reset; old sessions revoked.",
  };
  console.log(messages[result]);
}
