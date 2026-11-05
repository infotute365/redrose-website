import { MongoClient } from "mongodb";
import { readSeedConfiguration, reportAdminSeed, seedAdmin } from "./lib/admin-seed.mjs";

let client;
let stage = "configuration validation";
try {
  const configuration = readSeedConfiguration();
  stage = "MongoDB connection";
  client = new MongoClient(configuration.uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  stage = "admin provisioning";
  reportAdminSeed(
    await seedAdmin(client.db(configuration.databaseName), {
      ...configuration,
      resetPassword: process.argv.includes("--reset-password"),
    }),
  );
} catch (error) {
  // Driver errors can contain database credentials; do not dump them to logs.
  console.error(
    `Admin seed failed during ${stage} (${error instanceof Error ? error.name : "UnknownError"}). Check MongoDB availability and .env.local configuration.`,
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
