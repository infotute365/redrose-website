import { NextResponse } from "next/server";
import { handleAuthRoute } from "@/src/server/route-adapter.js";
import {
  isAdminConfigured,
  loginIsRateLimited,
  clearLoginLimit,
  trustedClientIp,
} from "@/src/lib/admin-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAdminConfigured())
    return NextResponse.json({ error: "Admin is not configured." }, { status: 503 });
  return handleAuthRoute("login", request, {
    loginIsRateLimited,
    clearLoginLimit,
    trustedClientIp,
  });
}
