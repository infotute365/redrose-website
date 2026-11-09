// Retention for uploaded GridFS images and PDFs only. Source assets in public/
// are never deleted. All collection access uses St. Mary's-style Mongoose pool.
import { getDatabase, mediaBucket } from "../config/database.js";
import mongoose from "mongoose";

import { RETENTION_MS, managedMediaId, referencedMediaIds } from "./media-policy.mjs";
export {
  RETENTION_DAYS,
  RETENTION_MS,
  managedMediaId,
  referencedMediaIds,
} from "./media-policy.mjs";

// A retired file is NOT deleted by this function. The daily job re-checks
// every active reference before removing it, including rollback references.
export async function retireMediaReference(value, now = new Date()) {
  const id = managedMediaId(value);
  if (!id) return false;
  const db = await getDatabase();
  const { ObjectId } = mongoose.mongo;
  const file = await db.collection("media.files").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        "metadata.retiredAt": now,
        "metadata.deleteAfter": new Date(now.getTime() + RETENTION_MS),
      },
    },
  );
  return Boolean(file.matchedCount);
}

export async function cleanupOrphanMedia({ now = new Date(), dryRun = false } = {}) {
  const db = await getDatabase();
  // The rollback option lasts seven days. A slide never loses its current src.
  if (!dryRun) {
    await db
      .collection("homeSlides")
      .updateMany(
        { previousBackgroundExpiresAt: { $lte: now } },
        { $unset: { previousBackground: "", previousBackgroundExpiresAt: "" } },
      );
  }
  const references = await referencedMediaIds(db);
  const stats = { active: 0, waiting: 0, marked: 0, deleted: 0 };
  const bucket = dryRun ? null : await mediaBucket();
  const files = db.collection("media.files");
  const cursor = files.find({ filename: /^asset-/ }, { batchSize: 200 });
  try {
    for await (const file of cursor) {
      const id = file._id.toString().toLowerCase();
      // Never operate on files without the app's own metadata format.
      if (!file.metadata?.contentType) continue;
      if (references.has(id)) {
        stats.active++;
        // Keep the original retention clock while the file is used for
        // a seven-day rollback. It remains safe: active refs are checked
        // again before every deletion.
        continue;
      }
      const deadline = file.metadata.deleteAfter;
      if (!(deadline instanceof Date)) {
        stats.marked++;
        if (!dryRun) {
          await files.updateOne(
            { _id: file._id, "metadata.deleteAfter": { $exists: false } },
            {
              $set: {
                "metadata.retiredAt": now,
                "metadata.deleteAfter": new Date(now.getTime() + RETENTION_MS),
              },
            },
          );
        }
      } else if (deadline.getTime() > now.getTime()) {
        stats.waiting++;
      } else {
        // Re-check all references immediately before permanent deletion.
        // Scheduling cleanup during quiet hours reduces concurrent updates.
        const live = await referencedMediaIds(db);
        if (live.has(id)) {
          stats.active++;
          // A live reference always wins over the deletion deadline.
        } else {
          stats.deleted++;
          if (!dryRun) await bucket.delete(file._id);
        }
      }
    }
  } finally {
    await cursor.close();
  }
  return stats;
}
