import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import jwt from "jsonwebtoken";
import AuthModel from "../model/auth.model.js";
import { TryError } from "../util/error.js";
import { requireServerEnv } from "../util/validation.mjs";

export const ACCESS_SECONDS = 15 * 60;
export const REFRESH_SECONDS = 7 * 24 * 60 * 60;
export const isAdmin = (user) =>
  Boolean(user?.isActive && ["admin", "super-admin"].includes(user.role));
export const safeUser = (user) => ({
  id: user._id.toString(),
  fullname: user.fullname,
  email: user.email,
  role: user.role,
  isActive: Boolean(user.isActive),
});
export const sessionUser = (user) => ({
  id: user._id.toString(),
  fullname: user.fullname,
  email: user.email,
  role: user.role,
  version: user.sessionVersion || 0,
});
export const hashRefreshToken = (token) =>
  `sha256:${createHash("sha256").update(token).digest("hex")}`;
export const jwtSecret = () => {
  const secret = requireServerEnv("JWT_SECRET");
  if (Buffer.byteLength(secret) < 32 || /replace[_ -]|your[_ -].*secret/i.test(secret))
    throw new Error("JWT_SECRET must contain at least 32 bytes of private random data");
  return secret;
};
export const cookieOptions = (maxAge) => ({
  httpOnly: true,
  maxAge,
  secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  path: "/",
});
export const issueTokens = (user) => ({
  accessToken: jwt.sign(sessionUser(user), jwtSecret(), {
    algorithm: "HS256",
    expiresIn: ACCESS_SECONDS,
  }),
  refreshToken: randomBytes(32).toString("base64url"),
});
// Same helper names as St. Mary's; Next.js Response cookies expect seconds, not milliseconds.
export const setAuthCookies = (response, tokens) => {
  response.cookies.set("accessToken", tokens.accessToken, cookieOptions(ACCESS_SECONDS));
  response.cookies.set("refreshToken", tokens.refreshToken, cookieOptions(REFRESH_SECONDS));
  return response;
};
export const clearAuthCookies = (response) => {
  response.cookies.set("accessToken", "", cookieOptions(0));
  response.cookies.set("refreshToken", "", cookieOptions(0));
  return response;
};
export async function readAccessUser(token) {
  const secret = jwtSecret();
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    throw TryError("Invalid session", 401);
  }
  if (typeof payload.id !== "string" || !/^[a-f\d]{24}$/i.test(payload.id))
    throw TryError("Invalid session", 401);
  const user = await AuthModel.findById(payload.id);
  if (!isAdmin(user) || (payload.version ?? 0) !== (user.sessionVersion || 0))
    throw TryError("Invalid session", 401);
  return user;
}

// Red Rose keeps the original strict Origin and trusted-proxy checks.
export function readAppOrigin(environment = process.env) {
  const value = environment.APP_ORIGIN;
  if (!value) throw new Error("APP_ORIGIN is not configured");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_ORIGIN is not a valid URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("APP_ORIGIN must be a simple website origin");
  if (
    environment.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error("APP_ORIGIN requires HTTPS in production");
  return url.origin;
}

export function isTrustedProxyRequest(headers, environment = process.env) {
  if (environment.TRUST_PROXY !== undefined && !["true", "false"].includes(environment.TRUST_PROXY))
    throw new Error("TRUST_PROXY must be true or false");
  if (environment.TRUST_PROXY !== "true") return true;
  const sharedSecret = environment.PROXY_SHARED_SECRET || "";
  if (Buffer.byteLength(sharedSecret) < 32)
    throw new Error("PROXY_SHARED_SECRET must be at least 32 bytes");
  const supplied = headers.get("x-red-rose-proxy-secret") || "";
  const digest = (value) => createHash("sha256").update(value).digest();
  return supplied.length <= 1024 && timingSafeEqual(digest(supplied), digest(sharedSecret));
}
export function trustedClientIp(headers, environment = process.env) {
  if (environment.TRUST_PROXY !== "true") return "direct-client";
  if (!isTrustedProxyRequest(headers, environment)) return null;
  const value = headers.get("x-real-ip")?.trim();
  return value && isIP(value) ? value : null;
}
