import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  checkMutationOrigin,
  endAdminSession,
} from "@/src/lib/admin-auth";
export async function POST(request: Request) {
  try {
    if (!checkMutationOrigin(request))
      return NextResponse.json({ error: "Origin verification failed." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 });
  }
  const jar = await cookies();
  let response: NextResponse;
  try {
    const revoked = await endAdminSession(jar.get(ADMIN_COOKIE)?.value);
    response = revoked
      ? NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json(
          { error: "Administrator login required." },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
  } catch {
    // Preserve the cookie so the user can retry server-side revocation.
    return NextResponse.json(
      { error: "Session revocation is temporarily unavailable. Retry logout." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  response.cookies.set(ADMIN_COOKIE, "", adminCookieOptions(0));
  return response;
}
