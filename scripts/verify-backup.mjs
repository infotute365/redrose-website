import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
import { BSON, MongoClient } from "mongodb";
import { readDatabaseConfiguration } from "./lib/mongo-client.mjs";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readVerifiedBackup(directory, expectedDatabase) {
  const root = path.resolve(directory);
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  if (
    manifest.version !== 1 ||
    manifest.database !== expectedDatabase ||
    !Array.isArray(manifest.collections) ||
    !manifest.collections.length
  )
    throw new Error("Invalid backup manifest.");
  const collections = [];
  for (const entry of manifest.collections) {
    if (!/^[\w.-]+$/.test(entry.name)) throw new Error("Invalid collection name.");
    const bytes = await readFile(path.join(root, "database", `${entry.name}.bson`));
    if (
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256 ||
      bytes.length !== entry.bytes
    )
      throw new Error("Backup integrity check failed.");
    const documents = [];
    let offset = 0;
    while (offset < bytes.length) {
      const length = bytes.readInt32LE(offset);
      if (length < 5 || offset + length > bytes.length) throw new Error("Invalid BSON backup.");
      documents.push(
        BSON.deserialize(bytes.subarray(offset, offset + length), { promoteValues: false }),
      );
      offset += length;
    }
    if (documents.length !== entry.count) throw new Error("Backup count mismatch.");
    const metadata = BSON.EJSON.parse(
      await readFile(path.join(root, "database", `${entry.name}.metadata.json`), "utf8"),
    );
    collections.push({ name: entry.name, documents, metadata });
  }
  return collections;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.dirname, "verify-backup.mjs")
) {
  const temporaryName = `red_rose_restore_test_${randomUUID().replaceAll("-", "")}`;
  let client;
  try {
    const { uri, databaseName } = readDatabaseConfiguration();
    const collections = await readVerifiedBackup(process.argv[2], databaseName);
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const db = client.db(temporaryName);
    for (const entry of collections) {
      const collection = await db.createCollection(entry.name, entry.metadata.options);
      for (let offset = 0; offset < entry.documents.length; offset += 100)
        await collection.insertMany(entry.documents.slice(offset, offset + 100));
      const restored = await collection.find().toArray();
      if (restored.length !== entry.documents.length) throw new Error();
      const normalized = (docs) =>
        docs.map((doc) => BSON.EJSON.stringify(doc, { relaxed: false })).sort();
      if (JSON.stringify(normalized(restored)) !== JSON.stringify(normalized(entry.documents)))
        throw new Error();
      for (const index of entry.metadata.indexes) {
        if (index.name === "_id_") continue;
        const { key, ...options } = index;
        delete options.v;
        delete options.ns;
        await collection.createIndex(key, options);
      }
    }
    console.log(
      `Verified BSON hashes, full record restoration and indexes for ${collections.length} collections in an isolated database.`,
    );
  } catch {
    console.error(
      "Backup restore verification failed; no production records were restored or removed.",
    );
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.db(temporaryName).dropDatabase();
      await client.close();
    }
  }
}
