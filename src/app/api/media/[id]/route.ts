import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { mediaBucket } from "@/src/server/config/database";
import { getMedia } from "@/src/lib/media";
export const runtime = "nodejs";
const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const file = await getMedia(id);
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
    const length = Number(file.length);
    let start = 0;
    let end = length;
    let status = 200;
    const range = request.headers.get("range");
    if (range) {
      const parsed = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!parsed || (!parsed[1] && !parsed[2]))
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${length}` },
        });
      if (!parsed[1]) start = Math.max(0, length - Number(parsed[2]));
      else {
        start = Number(parsed[1]);
        if (parsed[2]) end = Math.min(length, Number(parsed[2]) + 1);
      }
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start >= end ||
        end > length
      )
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${length}` },
        });
      status = 206;
    }
    const stream = (await mediaBucket()).openDownloadStream(file._id, { start, end });
    const cancel = () => stream.destroy();
    request.signal.addEventListener("abort", cancel, { once: true });
    stream.once("close", () => request.signal.removeEventListener("abort", cancel));
    const storedType = file.metadata?.contentType || file.contentType;
    const mime = allowedTypes.has(storedType) ? storedType : "application/octet-stream";
    const filename =
      typeof file.filename === "string" && /^[\w.-]{1,120}$/.test(file.filename)
        ? file.filename
        : "school-file";
    return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(end - start),
        "Accept-Ranges": "bytes",
        ...(status === 206 ? { "Content-Range": `bytes ${start}-${end - 1}/${length}` } : {}),
        // Images/PDFs can be retired seven days after replacement; do not cache
        // their public download response as immutable for a full year.
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${mime === "application/octet-stream" ? "attachment" : "inline"}; filename="${filename}"`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "Media unavailable." }, { status: 503 });
  }
}
