import { MongoClient } from "mongodb";
import { readSeedConfiguration, reportAdminSeed, seedAdmin } from "./lib/admin-seed.mjs";

let client;
try {
  const configuration = readSeedConfiguration();
  client = new MongoClient(configuration.uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  reportAdminSeed(
    await seedAdmin(client.db(configuration.databaseName), {
      ...configuration,
      resetPassword: process.argv.includes("--reset-password"),
    }),
  );
} catch {
  // Driver errors can contain database credentials; do not dump them to logs.
  console.error(
    "Admin seed failed. Check MongoDB connectivity and .env.local: MONGODB_URI, MONGODB_DATABASE, ADMIN_USERNAME (3-64 safe characters), ADMIN_PASSWORD (20-256 characters).",
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
