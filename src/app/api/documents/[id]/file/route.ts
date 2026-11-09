import { NextResponse } from "next/server";
import { getDocuments, type SchoolDocument } from "@/src/lib/documents";
import { getDatabase } from "@/src/server/config/database";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{1,100}$/i.test(id))
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  try {
    const doc = process.env.MONGODB_URI
      ? await (await getDatabase()).collection<SchoolDocument>("documents").findOne({ id })
      : (await getDocuments()).find((item) => item.id === id);
    if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const target = doc.storageUrl || doc.url;
    if (
      !/^\/api\/media\/[a-f0-9]{24}$/.test(target) &&
      !/^\/uploads\/documents\/[\w.-]+$/.test(target)
    )
      return NextResponse.json({ error: "Invalid document storage URL." }, { status: 500 });
    // Keep redirects relative to the public origin. request.url can contain the
    // internal Next.js host behind a reverse proxy, and Host is not a trust source.
    return new NextResponse(null, {
      status: 307,
      headers: { Location: target, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Documents temporarily unavailable." }, { status: 503 });
  }
}
