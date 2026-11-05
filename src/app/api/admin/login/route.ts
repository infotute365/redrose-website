import { NextResponse } from "next/server";
import { JsonInputError, readJsonBody } from "@/src/server/http/json.mjs";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  checkMutationOrigin,
  clearLoginLimit,
  createAdminSession,
  credentialsMatch,
  isAdminConfigured,
  loginIsRateLimited,
  trustedClientIp,
} from "@/src/lib/admin-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!checkMutationOrigin(request))
      return NextResponse.json({ error: "Origin verification failed." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 });
  }
  if (!isAdminConfigured())
    return NextResponse.json({ error: "Admin is not configured." }, { status: 503 });
  let input: unknown;
  try {
    input = await readJsonBody(request, 4096);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid login request." },
      { status: error instanceof JsonInputError ? error.status : 400 },
    );
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }
  const body = input as { username?: unknown; password?: unknown };
  if (
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    !body.username.trim() ||
    !body.password ||
    body.username.length > 90 ||
    body.password.length > 1024
  ) {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }
  try {
    const ip = trustedClientIp(request.headers);
    if (!ip)
      return NextResponse.json({ error: "Trusted proxy verification failed." }, { status: 403 });
    if (await loginIsRateLimited(ip, body.username))
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    const admin = await credentialsMatch(body.username, body.password);
    if (!admin)
      return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
    await clearLoginLimit(body.username);
    const session = await createAdminSession(admin);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ADMIN_COOKIE, session.value, adminCookieOptions(session.maxAge));
    return response;
  } catch {
    return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 503 });
  }
}
