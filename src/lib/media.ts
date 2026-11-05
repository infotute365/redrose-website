import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getDatabase, mediaBucket } from "@/src/server/config/database";

const TYPES = new Map([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);
const MAX_MEDIA = 20 * 1024 * 1024;
export class MediaValidationError extends Error {}

export function validateMedia(bytes: Buffer, mime: string, imageOnly = false) {
  if (!TYPES.has(mime) || (imageOnly && !mime.startsWith("image/")))
    throw new MediaValidationError("Unsupported file type.");
  if (!bytes.length || bytes.length > MAX_MEDIA)
    throw new MediaValidationError("File must be between 1 byte and 20 MB.");
  const sig = (v: string) =>
    bytes.subarray(0, Buffer.from(v, "hex").length).equals(Buffer.from(v, "hex"));
  const valid =
    mime === "application/pdf"
      ? /^%PDF-[12]\.\d/.test(bytes.subarray(0, 8).toString()) &&
        bytes.subarray(-2048).includes(Buffer.from("%%EOF"))
      : mime === "image/jpeg"
        ? sig("ffd8ff")
        : mime === "image/png"
          ? sig("89504e470d0a1a0a")
          : mime === "image/gif"
            ? bytes.subarray(0, 6).toString() === "GIF87a" ||
              bytes.subarray(0, 6).toString() === "GIF89a"
            : mime === "image/webp"
              ? bytes.subarray(0, 4).toString() === "RIFF" &&
                bytes.subarray(8, 12).toString() === "WEBP"
              : false;
  if (!valid) throw new MediaValidationError("The file contents do not match its declared type.");
}

export async function saveMedia(file: File, imageOnly = false) {
  const bytes = Buffer.from(await file.arrayBuffer());
  validateMedia(bytes, file.type, imageOnly);
  if (file.type.startsWith("image/")) {
    try {
      const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" });
      const metadata = await image.metadata();
      const expected = {
        "image/jpeg": "jpeg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      }[file.type];
      if (metadata.format !== expected) throw new Error();
      await image.resize(1, 1).png().toBuffer();
    } catch {
      throw new MediaValidationError("Choose a complete image up to 40 megapixels.");
    }
  }
  return storeMedia(bytes, file.type, file.name);
}

async function storeMedia(
  bytes: Buffer,
  contentType: string,
  originalName: string,
  details: Record<string, unknown> = {},
) {
  const bucket = await mediaBucket();
  const name = `asset-${randomUUID()}${TYPES.get(contentType)}`;
  const upload = bucket.openUploadStream(name, {
    metadata: { ...details, contentType, originalName: originalName.slice(0, 160) },
  });
  await new Promise<void>((resolve, reject) => {
    upload.on("finish", resolve);
    upload.on("error", reject);
    upload.end(bytes);
  });
  return { id: upload.id.toString(), url: `/api/media/${upload.id}` };
}

export async function saveBackgroundMedia(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new MediaValidationError("Choose a JPEG, PNG or WebP photograph.");
  if (file.size > MAX_MEDIA) throw new MediaValidationError("Choose an image smaller than 20 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  validateMedia(bytes, file.type, true);
  let result: { data: Buffer; info: { width: number; height: number } };
  // Decode the actual image with a pixel cap; signatures alone do not prove
  // a complete, safe image. EXIF rotation is applied and private metadata stripped.
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" });
    const metadata = await image.metadata();
    const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[file.type];
    if (metadata.format !== expected || (metadata.pages || 1) > 1) throw new Error();
    result = await image
      .rotate()
      .resize({ width: 3840, height: 3840, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new MediaValidationError(
      "This image could not be processed. Choose a valid, still JPEG, PNG or WebP image up to 40 megapixels.",
    );
  }
  const media = await storeMedia(result.data, "image/webp", file.name, {
    width: result.info.width,
    height: result.info.height,
    purpose: "homepage-background",
  });
  return {
    ...media,
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}
export async function getMedia(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDatabase();
  return db.collection("media.files").findOne({ _id: new ObjectId(id) });
}
