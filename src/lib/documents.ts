import fs from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "@/src/server/config/database";
export type DocumentCategory = "disclosure" | "fees" | "tcformat";
export type SchoolDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  url: string;
  storageUrl?: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};
export const DOCUMENTS_FILE = path.join(process.cwd(), "public", "uploads", "documents.json");
export async function getDocuments(category?: DocumentCategory): Promise<SchoolDocument[]> {
  if (!process.env.MONGODB_URI) {
    try {
      const files = JSON.parse(await fs.readFile(DOCUMENTS_FILE, "utf8")) as SchoolDocument[];
      return files
        .filter((f) => !category || f.category === category)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    } catch {
      return [];
    }
  }
  const db = await getDatabase();
  return db
    .collection<SchoolDocument>("documents")
    .find(category ? { category } : {}, { projection: { _id: 0 } })
    .sort({ uploadedAt: -1 })
    .toArray();
}
