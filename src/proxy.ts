import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/src/server/config/auth.mjs";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    // React styles, Framer Motion and the image-position controls use style attributes.
    // Inline scripts remain blocked unless they carry this request's nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "frame-src 'self' https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(!development && process.env.APP_ORIGIN?.startsWith("https://")
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-public-pathname", request.nextUrl.pathname);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && cookie.split(".").length !== 3) {
    response.cookies.set(ADMIN_COOKIE, "", {
      httpOnly: true,
      secure: !development,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!api/|_next/|images/|uploads/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|pdf|woff2?|css|js|map)$).*)",
  ],
};
