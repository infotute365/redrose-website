import { JsonInputError, readJsonBody } from "@/src/server/http/json.mjs";
import { withApiBoundary } from "@/src/server/http/api";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardAdminAccess, guardMutation } from "@/src/lib/admin-auth";
import { getDatabase } from "@/src/server/config/database";
import { getDocuments, type DocumentCategory, type SchoolDocument } from "@/src/lib/documents";
import { MediaValidationError, saveMedia } from "@/src/lib/media";
import { isDatabaseFailure } from "@/src/server/http/api";
export const runtime = "nodejs";
const categories = new Set(["disclosure", "fees", "tcformat"]);
function refresh() {
  for (const p of ["/pages/mandatory-disclosure", "/pages/fee-structure", "/pages/tc-format"])
    revalidatePath(p);
}
async function handleGET(request: Request) {
  const denied = await guardAdminAccess();
  if (denied) return denied;
  const category = new URL(request.url).searchParams.get("category");
  if (category && !categories.has(category))
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  try {
    return NextResponse.json({
      documents: await getDocuments(category as DocumentCategory | undefined),
    });
  } catch {
    return NextResponse.json({ error: "Documents temporarily unavailable." }, { status: 503 });
  }
}
async function handlePOST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const category = form.get("category");
    const title = form.get("title");
    const files = form
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);
    if (
      typeof category !== "string" ||
      !categories.has(category) ||
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 160
    )
      return NextResponse.json({ error: "Valid title and category required." }, { status: 400 });
    if (!files.length || files.length > 10)
      return NextResponse.json({ error: "Select 1–10 files." }, { status: 400 });
    if (files.some((file) => file.size > 20 * 1024 * 1024))
      return NextResponse.json({ error: "20MB maximum per file." }, { status: 413 });
    const db = await getDatabase();
    const added: SchoolDocument[] = [];
    for (const file of files) {
      const media = await saveMedia(file);
      const id = randomUUID();
      added.push({
        id,
        title: title.trim(),
        category: category as DocumentCategory,
        url: `/api/documents/${id}/file`,
        storageUrl: media.url,
        fileName: file.name.slice(0, 160),
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
    await db.collection<SchoolDocument>("documents").insertMany(added);
    refresh();
    return NextResponse.json({ documents: added }, { status: 201 });
  } catch (error) {
    if (error instanceof JsonInputError || isDatabaseFailure(error)) throw error;
    return NextResponse.json(
      {
        error:
          error instanceof MediaValidationError
            ? error.message
            : "Upload failed. Check the selected files.",
      },
      { status: 400 },
    );
  }
}
async function handlePATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  try {
    let id: string;
    let update: Record<string, unknown> = {};
    const type = request.headers.get("content-type") || "";
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      id = String(form.get("id") || "");
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
        return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
      if (!(await (await getDatabase()).collection("documents").findOne({ id })))
        return NextResponse.json({ error: "Document not found." }, { status: 404 });
      const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024)
        return NextResponse.json({ error: "Choose a valid file up to 20MB." }, { status: 400 });
      const media = await saveMedia(file);
      update = {
        storageUrl: media.url,
        url: `/api/documents/${id}/file`,
        fileName: file.name.slice(0, 160),
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
    } else {
      const body = await readJsonBody(request);
      if (!body || typeof body !== "object" || Array.isArray(body))
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      id = String(body.id || "");
      if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 160)
        return NextResponse.json({ error: "Valid document title required." }, { status: 400 });
      update.title = body.title.trim();
    }
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
      return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
    const updated = await (
      await getDatabase()
    )
      .collection<SchoolDocument>("documents")
      .findOneAndUpdate(
        { id },
        { $set: update },
        { returnDocument: "after", projection: { _id: 0 } },
      );
    if (!updated) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    refresh();
    return NextResponse.json({ document: updated });
  } catch (error) {
    if (error instanceof JsonInputError || isDatabaseFailure(error)) throw error;
    return NextResponse.json(
      {
        error:
          error instanceof MediaValidationError
            ? error.message
            : "Update failed. Check the title or selected file.",
      },
      { status: 400 },
    );
  }
}
async function handleDELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body: { id?: unknown } = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (typeof body.id !== "string" || !/^[\w-]{1,100}$/.test(body.id))
    return NextResponse.json({ error: "Valid document ID required." }, { status: 400 });
  const result = await (await getDatabase()).collection("documents").deleteOne({ id: body.id });
  if (!result.deletedCount)
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  refresh();
  return NextResponse.json({ success: true });
}

export const GET = withApiBoundary(handleGET);
export const POST = withApiBoundary(handlePOST);
export const PATCH = withApiBoundary(handlePATCH);
export const DELETE = withApiBoundary(handleDELETE);
