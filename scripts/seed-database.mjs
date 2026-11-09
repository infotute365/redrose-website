import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { getDatabase } from "../src/server/config/database.js";
import path from "node:path";

// First run: npm run db:seed. Administrator provisioning is handled by seed:admin.
async function initialJson(name) {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "public", "uploads", name), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}
try {
  const db = await getDatabase();
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
  await mongoose.disconnect().catch(() => {
    process.exitCode = 1;
  });
}
