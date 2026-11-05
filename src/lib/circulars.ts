import fs from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "@/src/server/config/database";
export type Circular = {
  id: string;
  title: string;
  description: string;
  noticeDate: string;
  priority?: number;
  pdfUrl?: string;
  fileName?: string;
  uploadedAt: string;
};
export const CIRCULARS_FILE = path.join(process.cwd(), "public", "uploads", "circulars.json");
export async function getCirculars(): Promise<Circular[]> {
  if (!process.env.MONGODB_URI) {
    try {
      return (JSON.parse(await fs.readFile(CIRCULARS_FILE, "utf8")) as Circular[]).sort(
        (a, b) => (b.priority || 0) - (a.priority || 0) || b.noticeDate.localeCompare(a.noticeDate),
      );
    } catch {
      return [];
    }
  }
  return (await getDatabase())
    .collection<Circular>("circulars")
    .find({}, { projection: { _id: 0 } })
    .sort({ priority: -1, noticeDate: -1, uploadedAt: -1 })
    .toArray();
}
