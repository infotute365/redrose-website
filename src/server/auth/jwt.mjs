import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, errors } from "jose";
import { ADMIN_SESSION_SECONDS, readAuthConfiguration } from "../config/auth.mjs";

export async function signAdminJwt(subject, sessionVersion, environment = process.env) {
  const { key, issuer, audience } = readAuthConfiguration(environment);
  if (
    typeof subject !== "string" ||
    !subject ||
    subject.length > 200 ||
    !Number.isSafeInteger(sessionVersion) ||
    sessionVersion < 1
  )
    throw new TypeError("Invalid administrator identity.");
  const now = Math.floor(Date.now() / 1000);
  const jti = randomBytes(32).toString("base64url");
  const token = await new SignJWT({ role: "admin", sessionVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setJti(jti)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + ADMIN_SESSION_SECONDS)
    .sign(key);
  return { token, jti, issuedAt: now, expiresAt: now + ADMIN_SESSION_SECONDS };
}
export async function verifyAdminJwt(token, environment = process.env) {
  const { key, issuer, audience } = readAuthConfiguration(environment);
  if (typeof token !== "string" || token.length > 4096 || token.split(".").length !== 3)
    return null;
  try {
    const { payload, protectedHeader } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer,
      audience,
      typ: "JWT",
      requiredClaims: ["sub", "jti", "iat", "exp", "iss", "aud", "role", "sessionVersion"],
      maxTokenAge: ADMIN_SESSION_SECONDS,
      clockTolerance: 0,
    });
    if (
      protectedHeader.alg !== "HS256" ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.sub.length > 200 ||
      typeof payload.jti !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(payload.jti) ||
      typeof payload.role !== "string" ||
      !payload.role ||
      payload.role.length > 32 ||
      !Number.isSafeInteger(payload.sessionVersion) ||
      Number(payload.sessionVersion) < 1 ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat > Math.floor(Date.now() / 1000) ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > ADMIN_SESSION_SECONDS
    )
      return null;
    return {
      sub: payload.sub,
      jti: payload.jti,
      role: payload.role,
      sessionVersion: Number(payload.sessionVersion),
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
}
