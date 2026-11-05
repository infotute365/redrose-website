import { readJsonBody } from "@/src/server/http/json.mjs";
import { withApiBoundary } from "@/src/server/http/api";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardAdminAccess, guardMutation } from "@/src/lib/admin-auth";
import { getDatabase } from "@/src/server/config/database";
import { getAllSections } from "@/src/lib/dynamic-sections";
import {
  BackgroundError,
  getHomepageBackground,
  updateHomepageBackground,
} from "@/src/server/homepage-background";
import { isSafeImageReference } from "@/src/lib/background-types";
export const runtime = "nodejs";
const kinds = {
  slides: { collection: "homeSlides", key: "id" },
  events: { collection: "schoolEvents", key: "slug" },
} as const;
function target(kind: string) {
  return Object.hasOwn(kinds, kind) ? kinds[kind as keyof typeof kinds] : undefined;
}
const validImage = isSafeImageReference;
function validString(v: unknown, max: number) {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
}
function validPayload(value: unknown, kind: string) {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (
    !validString(o.title, 180) ||
    !validString(o.description, 3000) ||
    !validImage(kind === "slides" ? o.src : o.image)
  )
    return null;
  const id = typeof o.id === "string" ? o.id : typeof o.slug === "string" ? o.slug : null;
  if (id && !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  const order = Number(o.displayOrder);
  const base = {
    title: (o.title as string).trim(),
    description: (o.description as string).trim(),
    isPublished: o.isPublished !== false,
    displayOrder: Number.isSafeInteger(order) && order >= 0 && order < 100000 ? order : 0,
  };
  if (kind === "slides")
    return {
      ...base,
      src: o.src as string,
      alt: typeof o.alt === "string" ? o.alt.slice(0, 180) : base.title,
    };
  if (!validString(o.category, 80)) return null;
  return {
    ...base,
    category: (o.category as string).trim(),
    tone: "sky",
    image: o.image as string,
    alt: typeof o.alt === "string" ? o.alt.slice(0, 180) : base.title,
  };
}
async function handleGET(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!target(kind)) return NextResponse.json({ error: "Unknown section." }, { status: 404 });
  const denied = await guardAdminAccess();
  if (denied) return denied;
  if (kind === "slides" && new URL(request.url).searchParams.get("view") === "background") {
    try {
      return NextResponse.json(
        { background: await getHomepageBackground() },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return NextResponse.json(
        { error: "The homepage background is temporarily unavailable." },
        { status: 503 },
      );
    }
  }
  const data = await getAllSections();
  return NextResponse.json(
    { items: kind === "slides" ? data.slides : data.events },
    { headers: { "Cache-Control": "no-store" } },
  );
}
async function handlePOST(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const { kind } = await ctx.params;
  const t = target(kind);
  if (!t) return NextResponse.json({ error: "Unknown section." }, { status: 404 });
  const input: unknown = await readJsonBody(request);
  const payload = validPayload(input, kind);
  if (!payload)
    return NextResponse.json({ error: "Check text and image fields." }, { status: 400 });
  const id = randomUUID();
  const item = { ...payload, [t.key]: id };
  await (await getDatabase()).collection(t.collection).insertOne(item);
  revalidatePath("/");
  return NextResponse.json({ item }, { status: 201 });
}
async function handlePATCH(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const { kind } = await ctx.params;
  const t = target(kind);
  if (!t) return NextResponse.json({ error: "Unknown section." }, { status: 404 });
  const input: Record<string, unknown> = await readJsonBody(request);
  if (!input || typeof input !== "object" || Array.isArray(input))
    return NextResponse.json({ error: "Invalid section fields." }, { status: 400 });
  if (kind === "slides" && input.action === "background") {
    try {
      const background = await updateHomepageBackground(input);
      revalidatePath("/");
      revalidatePath("/gallery");
      revalidatePath("/admin/background");
      revalidatePath("/admin/dashboard");
      return NextResponse.json({ background }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof BackgroundError
              ? error.message
              : "Could not save the homepage background. Try again.",
        },
        { status: error instanceof BackgroundError ? error.status : 503 },
      );
    }
  }
  const id = input[t.key];
  const payload = validPayload(input, kind);
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !payload)
    return NextResponse.json({ error: "Invalid section fields." }, { status: 400 });
  const db = await getDatabase();
  const before = await db.collection(t.collection).findOne({ [t.key]: id });
  if (!before) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  if (
    kind === "slides" &&
    input.expectedRevision !== undefined &&
    input.expectedRevision !== (before.backgroundRevision || 0)
  ) {
    return NextResponse.json(
      { error: "This photo changed elsewhere. Reload the page before editing it." },
      { status: 409 },
    );
  }
  if (
    kind === "slides" &&
    before.isPublished !== false &&
    payload.isPublished === false &&
    (await db.collection(t.collection).countDocuments({ isPublished: { $ne: false } })) <= 1
  ) {
    return NextResponse.json(
      { error: "Keep at least one published homepage slide." },
      { status: 400 },
    );
  }
  const update: Record<string, unknown> = { ...payload };
  if (kind === "slides" && "src" in payload && payload.src !== before.src) {
    const active = await getHomepageBackground();
    update.previousBackground = {
      src: active?.slideId === id ? active.src : before.src,
      position: before.backgroundPosition ?? null,
    };
    update.backgroundRevision = (before.backgroundRevision || 0) + 1;
  }
  const filter = {
    [t.key]: id,
    ...(kind === "slides"
      ? {
          src: before.src,
          backgroundRevision:
            before.backgroundRevision === undefined
              ? { $exists: false }
              : before.backgroundRevision,
        }
      : {}),
  };
  const item = await db
    .collection(t.collection)
    .findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: "after", projection: { _id: 0 } },
    );
  if (!item)
    return NextResponse.json(
      { error: "This item changed elsewhere. Reload and try again." },
      { status: 409 },
    );
  revalidatePath("/");
  return NextResponse.json({ item });
}
async function handleDELETE(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  const { kind } = await ctx.params;
  const t = target(kind);
  if (!t) return NextResponse.json({ error: "Unknown section." }, { status: 404 });
  const input: Record<string, unknown> = await readJsonBody(request);
  if (!input || typeof input !== "object" || Array.isArray(input))
    return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
  const id = input[t.key];
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
    return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
  const db = await getDatabase();
  if (kind === "slides" && (await db.collection(t.collection).countDocuments()) <= 1)
    return NextResponse.json({ error: "Keep at least one homepage slide." }, { status: 400 });
  if (kind === "slides") {
    const item = await db.collection(t.collection).findOne({ [t.key]: id });
    if (
      item?.isPublished !== false &&
      (await db.collection(t.collection).countDocuments({ isPublished: { $ne: false } })) <= 1
    ) {
      return NextResponse.json(
        { error: "Keep at least one published homepage slide." },
        { status: 400 },
      );
    }
  }
  const result = await db.collection(t.collection).deleteOne({ [t.key]: id });
  if (!result.deletedCount) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}

export const GET = withApiBoundary(handleGET);
export const POST = withApiBoundary(handlePOST);
export const PATCH = withApiBoundary(handlePATCH);
export const DELETE = withApiBoundary(handleDELETE);
