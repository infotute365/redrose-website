import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export const ADMIN_COOKIE = "red-rose-admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export class AuthConfigurationError extends Error {
  constructor() {
    super("Private authentication configuration is missing or invalid.");
    this.name = "AuthConfigurationError";
  }
}
export function readPrivateSecret(value) {
  if (
    typeof value !== "string" ||
    value.length > 1024 ||
    !/^[A-Za-z0-9_-]{43,}$/.test(value) ||
    /replace|placeholder|example|changeme|secret|password/i.test(value) ||
    new Set(value).size < 12
  )
    throw new AuthConfigurationError();
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length < 32 || bytes.toString("base64url") !== value)
    throw new AuthConfigurationError();
  return bytes;
}
export function readAppOrigin(environment = process.env) {
  try {
    const value = environment.APP_ORIGIN;
    if (!value) throw new Error();
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw new Error();
    if (
      environment.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new AuthConfigurationError();
  }
}
export function readAuthConfiguration(environment = process.env) {
  const key = readPrivateSecret(environment.JWT_SECRET);
  if (environment.TRUST_PROXY !== undefined && !["true", "false"].includes(environment.TRUST_PROXY))
    throw new AuthConfigurationError();
  if (environment.TRUST_PROXY === "true") readPrivateSecret(environment.PROXY_SHARED_SECRET);
  const issuer = environment.JWT_ISSUER || "red-rose-academy";
  const audience = environment.JWT_AUDIENCE || "red-rose-admin";
  if (
    ![issuer, audience].every(
      (value) => typeof value === "string" && /^[A-Za-z0-9:._/-]{3,200}$/.test(value),
    )
  )
    throw new AuthConfigurationError();
  return { key, issuer, audience, origin: readAppOrigin(environment) };
}
export function isTrustedProxyRequest(headers, environment = process.env) {
  if (environment.TRUST_PROXY !== undefined && !["true", "false"].includes(environment.TRUST_PROXY))
    throw new AuthConfigurationError();
  if (environment.TRUST_PROXY !== "true") return true;
  readPrivateSecret(environment.PROXY_SHARED_SECRET);
  const supplied = headers.get("x-red-rose-proxy-secret") || "";
  const digest = (value) => createHash("sha256").update(value).digest();
  return (
    supplied.length <= 1024 &&
    timingSafeEqual(digest(supplied), digest(environment.PROXY_SHARED_SECRET))
  );
}
export function trustedClientIp(headers, environment = process.env) {
  // App Router Request does not expose a trustworthy socket peer address.
  // Direct mode ignores forwarded headers and uses a conservative shared bucket.
  if (environment.TRUST_PROXY !== "true") return "direct-client";
  if (!isTrustedProxyRequest(headers, environment)) return null;
  const value = headers.get("x-real-ip")?.trim();
  return value && isIP(value) ? value : null;
}
