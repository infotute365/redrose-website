import mongoose from "mongoose";
const { ObjectId } = mongoose.mongo;
import { getDatabase } from "./config/database";
import { getHomeSlides, type HomeSlide } from "@/src/lib/dynamic-sections";
import {
  isBackgroundPosition,
  isSafeImageReference,
  type HomepageBackground,
} from "@/src/lib/background-types";
import { stat } from "node:fs/promises";
import path from "node:path";
import { RETENTION_MS, retireMediaReference } from "./util/media-retention.mjs";

export class BackgroundError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function getHomepageBackground(): Promise<HomepageBackground | null> {
  const slide = (await getHomeSlides())[0];
  if (!slide) return null;
  return {
    slideId: slide.id,
    title: slide.title,
    src: slide.src,
    position: isBackgroundPosition(slide.backgroundPosition) ? slide.backgroundPosition : null,
    revision: slide.backgroundRevision || 0,
    previous:
      slide.previousBackground &&
      (!slide.previousBackgroundExpiresAt ||
        new Date(slide.previousBackgroundExpiresAt).getTime() > Date.now()) &&
      isSafeImageReference(slide.previousBackground.src)
        ? {
            src: slide.previousBackground.src,
            position: isBackgroundPosition(slide.previousBackground.position)
              ? slide.previousBackground.position
              : null,
          }
        : null,
  };
}

async function verifyImageExists(src: string, preserveExistingFormat: boolean) {
  if (!isSafeImageReference(src))
    throw new BackgroundError("Choose a valid uploaded school image.");
  if (src.startsWith("/api/media/")) {
    const file = await (
      await getDatabase()
    )
      .collection("media.files")
      .findOne({ _id: new ObjectId(src.slice(-24)) });
    if (
      !file ||
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        ...(preserveExistingFormat ? ["image/gif"] : []),
      ].includes(file.metadata?.contentType || file.contentType)
    ) {
      throw new BackgroundError("The uploaded image is unavailable. Please upload it again.");
    }
  } else {
    if (!preserveExistingFormat && /\.gif$/i.test(src))
      throw new BackgroundError("Choose a JPEG, PNG or WebP photograph.");
    // The allowlist above excludes backslashes, query strings and traversal.
    const root = path.resolve(process.cwd(), "public", "images");
    const file = path.resolve(process.cwd(), "public", src.slice(1));
    if (!file.startsWith(`${root}${path.sep}`))
      throw new BackgroundError("Invalid image location.");
    try {
      if (!(await stat(file)).isFile()) throw new Error();
    } catch {
      throw new BackgroundError("The previous school image is unavailable.");
    }
  }
}

export async function updateHomepageBackground(input: Record<string, unknown>) {
  if (
    typeof input.id !== "string" ||
    typeof input.expectedSrc !== "string" ||
    !Number.isSafeInteger(input.expectedRevision) ||
    Number(input.expectedRevision) < 0 ||
    (input.position !== undefined &&
      input.position !== null &&
      !isBackgroundPosition(input.position)) ||
    (input.restore !== undefined && typeof input.restore !== "boolean")
  ) {
    throw new BackgroundError("Reload the current background and check the image position.");
  }
  const db = await getDatabase();
  const raw = await db
    .collection<HomeSlide>("homeSlides")
    .findOne({ isPublished: { $ne: false } }, { sort: { displayOrder: 1, id: 1 } });
  const current = await getHomepageBackground();
  if (
    !raw ||
    !current ||
    raw.id !== current.slideId ||
    input.id !== current.slideId ||
    current.revision !== input.expectedRevision ||
    current.src !== input.expectedSrc
  ) {
    throw new BackgroundError(
      "The homepage background changed elsewhere. Reload the current image and try again.",
      409,
    );
  }
  if (input.restore && !current.previous)
    throw new BackgroundError("There is no previous background to restore.");
  const src = input.restore
    ? current.previous!.src
    : input.src === undefined
      ? current.src
      : input.src;
  const position = input.restore
    ? current.previous!.position
    : input.position === undefined
      ? current.position
      : input.position;
  if (!isSafeImageReference(src))
    throw new BackgroundError("Select a JPEG, PNG or WebP image before saving.");
  await verifyImageExists(src, Boolean(input.restore || src === current.src));
  if (src === current.src && position === current.position) return current;
  const item = await db.collection<HomeSlide>("homeSlides").findOneAndUpdate(
    {
      _id: raw._id,
      src: raw.src,
      backgroundRevision:
        raw.backgroundRevision === undefined ? { $exists: false } : raw.backgroundRevision,
    },
    {
      $set: {
        src,
        backgroundPosition: position,
        previousBackground: { src: current.src, position: current.position },
        previousBackgroundExpiresAt: new Date(Date.now() + RETENTION_MS),
        backgroundRevision: current.revision + 1,
      },
    },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  if (!item)
    throw new BackgroundError("Another change was saved first. Reload and try again.", 409);
  if (src !== current.src) await retireMediaReference(current.src).catch(() => {});
  return {
    slideId: item.id,
    title: item.title,
    src: item.src,
    position: item.backgroundPosition ?? null,
    revision: item.backgroundRevision!,
    previous: item.previousBackground!,
  } satisfies HomepageBackground;
}
