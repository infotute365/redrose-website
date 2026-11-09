import { JsonInputError, readJsonBody } from "@/src/server/http/json.mjs";
import { withApiBoundary } from "@/src/server/http/api";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardMutation } from "@/src/lib/admin-auth";
import { getDatabase } from "@/src/server/config/database";
import { MediaValidationError, saveMedia } from "@/src/lib/media";
import { retireMediaReference } from "@/src/server/util/media-retention.mjs";
import { isDatabaseFailure } from "@/src/server/http/api";
import type { Circular } from "@/src/lib/circulars";
export const runtime = "nodejs";
function refresh() {
  revalidatePath("/");
  revalidatePath("/api/circulars");
}
async function handlePOST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const title = form.get("title");
    const description = form.get("description");
    const noticeDate = form.get("noticeDate");
    const file = form.get("file");
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 160 ||
      typeof description !== "string" ||
      !description.trim() ||
      description.length > 3000 ||
      typeof noticeDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(noticeDate) ||
      Number.isNaN(Date.parse(`${noticeDate}T00:00:00`))
    )
      return NextResponse.json(
        { error: "Provide a valid title, description and date." },
        { status: 400 },
      );
    if (
      file &&
      (!(file instanceof File) ||
        (file.size && (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024)))
    )
      return NextResponse.json({ error: "PDF attachment must not exceed 20MB." }, { status: 415 });
    const circular: Circular = {
      id: randomUUID(),
      title: title.trim(),
      description: description.trim(),
      noticeDate,
      uploadedAt: new Date().toISOString(),
      priority: 0,
    };
    if (file instanceof File && file.size) {
      circular.pdfUrl = (await saveMedia(file)).url;
      circular.fileName = file.name.slice(0, 160);
    }
    await (await getDatabase()).collection<Circular>("circulars").insertOne(circular);
    refresh();
    return NextResponse.json({ circular }, { status: 201 });
  } catch (error) {
    if (error instanceof JsonInputError || isDatabaseFailure(error)) throw error;
    return NextResponse.json(
      {
        error:
          error instanceof MediaValidationError
            ? error.message
            : "Could not publish. Check the notice and attachment.",
      },
      { status: 400 },
    );
  }
}
async function handlePATCH(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body: { id?: unknown } = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  if (typeof body.id !== "string" || !/^[\w-]{1,100}$/.test(body.id))
    return NextResponse.json({ error: "Valid ID required." }, { status: 400 });
  const db = await getDatabase();
  const input = body as {
    id: string;
    title?: unknown;
    description?: unknown;
    noticeDate?: unknown;
  };
  let update: Record<string, unknown>;
  if (
    input.title !== undefined ||
    input.description !== undefined ||
    input.noticeDate !== undefined
  ) {
    if (
      typeof input.title !== "string" ||
      !input.title.trim() ||
      input.title.length > 160 ||
      typeof input.description !== "string" ||
      !input.description.trim() ||
      input.description.length > 3000 ||
      typeof input.noticeDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.noticeDate) ||
      Number.isNaN(Date.parse(`${input.noticeDate}T00:00:00`))
    )
      return NextResponse.json({ error: "Invalid circular details." }, { status: 400 });
    update = {
      title: input.title.trim(),
      description: input.description.trim(),
      noticeDate: input.noticeDate,
    };
  } else {
    const max = await db
      .collection<Circular>("circulars")
      .find({})
      .sort({ priority: -1 })
      .limit(1)
      .next();
    update = { priority: (max?.priority || 0) + 1 };
  }
  const after = await db
    .collection<Circular>("circulars")
    .findOneAndUpdate(
      { id: body.id },
      { $set: update },
      { returnDocument: "after", projection: { _id: 0 } },
    );
  if (!after) return NextResponse.json({ error: "Circular not found." }, { status: 404 });
  refresh();
  return NextResponse.json({ circular: after });
}
async function handleDELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body: { id?: unknown } = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  if (typeof body.id !== "string" || !/^[\w-]{1,100}$/.test(body.id))
    return NextResponse.json({ error: "Valid ID required." }, { status: 400 });
  const removed = await (
    await getDatabase()
  )
    .collection<Circular>("circulars")
    .findOneAndDelete({ id: body.id });
  if (!removed) return NextResponse.json({ error: "Circular not found." }, { status: 404 });
  if (removed.pdfUrl) await retireMediaReference(removed.pdfUrl).catch(() => {});
  refresh();
  return NextResponse.json({ success: true });
}

export const POST = withApiBoundary(handlePOST);
export const PATCH = withApiBoundary(handlePATCH);
export const DELETE = withApiBoundary(handleDELETE);
