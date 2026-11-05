import { NextResponse } from "next/server";
import { getSiteOverrides } from "@/src/lib/site-content";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(
    { overrides: await getSiteOverrides() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
