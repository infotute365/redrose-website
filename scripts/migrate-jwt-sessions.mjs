import {
  connectMongoClient,
  closeMongoClient,
  readDatabaseConfiguration,
} from "../src/server/config/mongo-client.mjs";
import { readAuthConfiguration } from "../src/server/config/auth.mjs";
import { readVerifiedBackup } from "./verify-backup.mjs";

try {
  const { databaseName } = readDatabaseConfiguration();
  readAuthConfiguration();
  const backup = await readVerifiedBackup(process.argv[2], databaseName);
  if (
    !backup.some((entry) => entry.name === "admins") ||
    !backup.some((entry) => entry.name === "adminSessions")
  )
    throw new Error();
  const db = (await connectMongoClient()).db(databaseName);
  const result = await db
    .collection("adminSessions")
    .updateMany(
      { sessionType: { $ne: "jwt-v1" }, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), migration: "jwt-v1" } },
    );
  console.log(
    `Legacy sessions marked revoked: ${result.modifiedCount}. No account, password hash or school record was changed.`,
  );
} catch {
  console.error(
    "JWT session migration failed. Verify the private backup and authentication/database configuration.",
  );
  process.exitCode = 1;
} finally {
  await closeMongoClient();
}
