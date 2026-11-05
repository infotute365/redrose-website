import { NextResponse } from "next/server";
import { getCirculars } from "@/src/lib/circulars";

export async function GET() {
  return NextResponse.json({ circulars: await getCirculars() });
}
