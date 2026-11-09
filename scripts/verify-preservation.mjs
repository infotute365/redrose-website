import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { BSON, MongoClient } from "mongodb";
import { readDatabaseConfiguration } from "./lib/mongo-client.mjs";
import { readVerifiedBackup } from "./verify-backup.mjs";

let client;
try {
  const backup = path.resolve(process.argv[2]);
  const { uri, databaseName } = readDatabaseConfiguration();
  const collections = await readVerifiedBackup(backup, databaseName);
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(databaseName);
  const canonical = (records) =>
    records.map((record) => BSON.EJSON.stringify(record, { relaxed: false })).sort();
  let checkedCollections = 0;
  let checkedAssets = 0;
  for (const entry of collections) {
    // Revocation markers changed intentionally; rate-limit/TTL records are transient.
    if (["adminSessions", "loginLimits"].includes(entry.name)) continue;
    const current = await db.collection(entry.name).find().toArray();
    assert.ok(
      JSON.stringify(canonical(current)) === JSON.stringify(canonical(entry.documents)),
      "Persistent records differ from the private backup.",
    );
    checkedCollections++;
  }
  async function checkAssets(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, item.name);
      if (item.isDirectory()) await checkAssets(filename);
      else {
        const old = await readFile(path.join(backup, "source", filename));
        const current = await readFile(filename);
        assert.ok(old.equals(current), "An original public asset changed.");
        checkedAssets++;
      }
    }
  }
  await checkAssets("public");
  console.log(
    `Preservation verified: ${checkedCollections} persistent collections (including administrator credentials) and ${checkedAssets} original public files are unchanged.`,
  );
} catch {
  console.error(
    "Preservation verification failed. No database or asset was modified by this check.",
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
