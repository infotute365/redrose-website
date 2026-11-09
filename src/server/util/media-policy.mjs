// Pure helpers shared by the live cleanup job and dependency-free tests.
export const RETENTION_DAYS = 7;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const MEDIA_URL = /^\/api\/media\/([a-f\d]{24})$/i;
const COLLECTIONS = ["siteContent", "homeSlides", "schoolEvents", "documents", "circulars"];

export function managedMediaId(value) {
  return typeof value === "string" ? MEDIA_URL.exec(value)?.[1] || null : null;
}

function collectIds(value, found, depth = 0) {
  if (depth > 30 || value == null) return;
  if (typeof value === "string") {
    const id = managedMediaId(value);
    if (id) found.add(id.toLowerCase());
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectIds(entry, found, depth + 1);
  } else if (typeof value === "object" && !(value instanceof Date)) {
    for (const entry of Object.values(value)) collectIds(entry, found, depth + 1);
  }
}

// Scan all places the existing Red Rose CMS can save an uploaded media URL.
// If a scan fails, abort cleanup. Never delete on a partially built index.
export async function referencedMediaIds(db) {
  const ids = new Set();
  for (const name of COLLECTIONS) {
    const cursor = db.collection(name).find({}, { batchSize: 250 });
    try {
      for await (const record of cursor) collectIds(record, ids);
    } finally {
      await cursor.close();
    }
  }
  return ids;
}
