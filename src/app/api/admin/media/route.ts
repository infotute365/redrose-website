import { withApiBoundary } from "@/src/server/http/api";
import { NextResponse } from "next/server";
import { guardMutation } from "@/src/lib/admin-auth";
import { MediaValidationError, saveBackgroundMedia, saveMedia } from "@/src/lib/media";
import { isDatabaseFailure } from "@/src/server/http/api";
export const runtime = "nodejs";
async function handlePOST(request: Request) {
  const denied = await guardMutation(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Choose an image." }, { status: 400 });
    if (file.size > 20 * 1024 * 1024)
      return NextResponse.json({ error: "20MB limit." }, { status: 413 });
    const purpose = new URL(request.url).searchParams.get("purpose");
    if (purpose && purpose !== "homepage-background")
      return NextResponse.json({ error: "Unknown upload purpose." }, { status: 400 });
    const media =
      purpose === "homepage-background"
        ? await saveBackgroundMedia(file)
        : await saveMedia(file, true);
    return NextResponse.json({ ...media }, { status: 201 });
  } catch (error) {
    if (isDatabaseFailure(error)) throw error;
    return NextResponse.json(
      {
        error:
          error instanceof MediaValidationError
            ? error.message
            : "Upload failed. Check the selected image.",
      },
      { status: 400 },
    );
  }
}

export const POST = withApiBoundary(handlePOST);
