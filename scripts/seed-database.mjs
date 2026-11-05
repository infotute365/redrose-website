import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import path from "node:path";
import { readSeedConfiguration, reportAdminSeed, seedAdmin } from "./lib/admin-seed.mjs";

// First run: npm run db:seed. Password reset requires explicit --reset-password.
const reset = process.argv.includes("--reset-password");
let client;
async function initialJson(name) {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "public", "uploads", name), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}
try {
  const configuration = readSeedConfiguration();
  client = new MongoClient(configuration.uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(configuration.databaseName);
  reportAdminSeed(await seedAdmin(db, { ...configuration, resetPassword: reset }));
  await db.collection("siteContent").updateOne(
    { key: "public" },
    {
      $setOnInsert: {
        key: "public",
        overrides: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  const items = [
    ["documents", "documents.json"],
    ["circulars", "circulars.json"],
  ];
  for (const [collectionName, filename] of items) {
    const markerKey = `original-${collectionName}`;
    const status = await db.collection("seedStates").findOne({ key: markerKey });
    if (status) {
      console.log(`${collectionName}: already initialized`);
      continue;
    }
    const entries = await initialJson(filename);
    if (!Array.isArray(entries)) throw new Error(`${filename} must contain a JSON array`);
    if (entries.length)
      await db.collection(collectionName).bulkWrite(
        entries.map((entry) => ({
          updateOne: {
            filter: { id: entry.id },
            update: { $setOnInsert: entry },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    await db
      .collection("seedStates")
      .insertOne({ key: markerKey, completedAt: new Date(), count: entries.length });
    console.log(`${collectionName}: initialized ${entries.length} original records`);
  }
  for (const [name, filename, identifier] of [
    ["schoolEvents", "seed-events.json", "slug"],
    ["homeSlides", "seed-slides.json", "id"],
  ]) {
    if (await db.collection("seedStates").findOne({ key: `original-${name}` })) continue;
    const entries = JSON.parse(await readFile(path.join(process.cwd(), "data", filename), "utf8"));
    for (const item of entries)
      await db
        .collection(name)
        .updateOne({ [identifier]: item[identifier] }, { $setOnInsert: item }, { upsert: true });
    await db
      .collection("seedStates")
      .insertOne({ key: `original-${name}`, completedAt: new Date(), count: entries.length });
    console.log(`${name}: initialized ${entries.length} original cards`);
  }
  await db.collection("documents").createIndex({ id: 1 }, { unique: true });
  await db.collection("circulars").createIndex({ id: 1 }, { unique: true });
  await db.collection("circulars").createIndex({ priority: -1, noticeDate: -1 });
  console.log("Database seed complete. Original website imagery and text stay in the project.");
} catch {
  console.error(
    "Database seed failed. Check .env.local, MongoDB connectivity and the original seed files.",
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
