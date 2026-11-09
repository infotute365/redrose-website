import { readJsonBody } from "@/src/server/http/json.mjs";
import { withApiBoundary } from "@/src/server/http/api";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardAdminAccess, guardMutation } from "@/src/lib/admin-auth";
import { getDatabase } from "@/src/server/config/database";
import { getSiteOverrides } from "@/src/lib/site-content";
import { retireMediaReference } from "@/src/server/util/media-retention.mjs";
export const dynamic = "force-dynamic";
async function handleGET() {
  const denied = await guardAdminAccess();
  if (denied) return denied;
  return NextResponse.json(
    { overrides: await getSiteOverrides(true) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
async function handlePUT(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body: { key?: unknown; value?: unknown } = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (
    typeof body.key !== "string" ||
    !/^(header|footer|page:[a-zA-Z0-9_/-]+):(t|i):[0-9]{1,5}$/.test(body.key) ||
    typeof body.value !== "string" ||
    body.value.length > 10000
  ) {
    return NextResponse.json({ error: "Invalid field or content." }, { status: 400 });
  }
  if (body.key === "page:/:i:0")
    return NextResponse.json(
      { error: "Use Homepage Background to change the homepage photo." },
      { status: 409 },
    );
  if (
    body.key.includes(":i:") &&
    !(
      /^\/(api\/media\/[a-f0-9]{24}|images\/[\w\-./]+|uploads\/[\w\-./]+)$/.test(body.value) &&
      !body.value.includes("..")
    )
  ) {
    return NextResponse.json(
      { error: "Upload an image before replacing this asset." },
      { status: 400 },
    );
  }
  // No markup parsing: website text is applied with textContent (not innerHTML).
  const key = `overrides.${body.key.replace(/\./g, "_")}`;
  const db = await getDatabase();
  const before = await db.collection("siteContent").findOne({ key: "public" });
  const oldImage = body.key.includes(":i:")
    ? before?.overrides?.[body.key.replace(/\./g, "_")]
    : null;
  await db.collection("siteContent").updateOne(
    { key: "public" },
    {
      $set: { [key]: body.value, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
  if (oldImage && oldImage !== body.value) await retireMediaReference(oldImage).catch(() => {});
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, key: body.key, value: body.value });
}
async function handleDELETE(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const body: { key?: unknown } = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (
    typeof body.key !== "string" ||
    !/^(header|footer|page:[a-zA-Z0-9_/-]+):(t|i):[0-9]{1,5}$/.test(body.key)
  )
    return NextResponse.json({ error: "Invalid field." }, { status: 400 });
  if (body.key === "page:/:i:0")
    return NextResponse.json(
      { error: "Use Homepage Background to restore the homepage photo." },
      { status: 409 },
    );
  const db = await getDatabase();
  const before = await db.collection("siteContent").findOne({ key: "public" });
  const oldImage = body.key.includes(":i:")
    ? before?.overrides?.[body.key.replace(/\./g, "_")]
    : null;
  await db
    .collection("siteContent")
    .updateOne(
      { key: "public" },
      { $unset: { [`overrides.${body.key.replace(/\./g, "_")}`]: "" } },
    );
  if (oldImage) await retireMediaReference(oldImage).catch(() => {});
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

export const GET = withApiBoundary(handleGET);
export const PUT = withApiBoundary(handlePUT);
export const DELETE = withApiBoundary(handleDELETE);
