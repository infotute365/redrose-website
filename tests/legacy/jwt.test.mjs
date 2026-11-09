import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { SignJWT, decodeJwt, decodeProtectedHeader } from "jose";
import { signAdminJwt, verifyAdminJwt } from "../src/server/auth/jwt.mjs";
import {
  readAuthConfiguration,
  readAppOrigin,
  trustedClientIp,
  isTrustedProxyRequest,
} from "../src/server/config/auth.mjs";
import { validateJwtSession } from "../src/server/auth/sessions.mjs";

const environment = {
  JWT_SECRET: randomBytes(64).toString("base64url"),
  APP_ORIGIN: "https://school.example",
  NODE_ENV: "production",
};

test("JWT signing includes stable identity, random jti and an eight-hour lifetime", async () => {
  const first = await signAdminJwt("initial-admin", 4, environment);
  const second = await signAdminJwt("initial-admin", 4, environment);
  assert.notEqual(first.jti, second.jti);
  assert.equal(decodeProtectedHeader(first.token).alg, "HS256");
  const payload = await verifyAdminJwt(first.token, environment);
  assert.equal(payload.sub, "initial-admin");
  assert.equal(payload.role, "admin");
  assert.equal(payload.sessionVersion, 4);
  assert.equal(payload.exp - payload.iat, 28800);
});

test("JWT verification rejects malformed, unsigned, expired, wrong issuer/audience/algorithm and altered tokens", async () => {
  const signed = await signAdminJwt("initial-admin", 1, environment);
  const claims = decodeJwt(signed.token);
  const now = Math.floor(Date.now() / 1000);
  const key = readAuthConfiguration(environment).key;
  const tokens = [
    "",
    "opaque-legacy-cookie",
    "a.b.c",
    signed.token.slice(0, -8) + "invalid0",
    `${signed.token.split(".")[0]}.${signed.token.split(".")[1]}.`,
    ...(await Promise.all(
      [
        { ...claims, exp: now - 1, iat: now - 120 },
        { ...claims, iss: "another-school" },
        { ...claims, aud: "another-admin" },
        { ...claims, exp: now + 86400 },
        { ...claims, iat: now + 60 },
        { ...claims, sessionVersion: "1" },
        { ...claims, jti: "short" },
      ].map((payload) =>
        new SignJWT(payload).setProtectedHeader({ alg: "HS256", typ: "JWT" }).sign(key),
      ),
    )),
    await new SignJWT(claims).setProtectedHeader({ alg: "HS384", typ: "JWT" }).sign(key),
  ];
  for (const token of tokens) assert.equal(await verifyAdminJwt(token, environment), null);
});

test("missing and placeholder secrets fail closed; production origins cannot come from Host", () => {
  for (const JWT_SECRET of [undefined, "replace-me", "x".repeat(64)])
    assert.throws(() => readAuthConfiguration({ ...environment, JWT_SECRET }));
  for (const APP_ORIGIN of [
    undefined,
    "http://school.example",
    "https://school.example/path",
    "https://user:pass@school.example",
  ])
    assert.throws(() => readAppOrigin({ ...environment, APP_ORIGIN }));
});

test("proxy trust requires a strong shared secret and validated real IP; direct mode ignores spoofing", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.100", "x-real-ip": "192.0.2.1" });
  assert.equal(trustedClientIp(headers, {}), "direct-client");
  const proxy = { TRUST_PROXY: "true", PROXY_SHARED_SECRET: randomBytes(48).toString("base64url") };
  assert.equal(isTrustedProxyRequest(headers, proxy), false);
  assert.equal(trustedClientIp(headers, proxy), null);
  headers.set("x-red-rose-proxy-secret", proxy.PROXY_SHARED_SECRET);
  assert.equal(trustedClientIp(headers, proxy), "192.0.2.1");
  headers.set("x-real-ip", "untrusted-client");
  assert.equal(trustedClientIp(headers, proxy), null);
});

test("invalid JWTs never consult the database and cannot fall back to opaque sessions", async () => {
  const previous = { JWT_SECRET: process.env.JWT_SECRET, APP_ORIGIN: process.env.APP_ORIGIN };
  process.env.JWT_SECRET = environment.JWT_SECRET;
  process.env.APP_ORIGIN = environment.APP_ORIGIN;
  try {
    assert.equal(
      await validateJwtSession("legacy-token", () => {
        throw new Error("Database must not be called");
      }),
      "unauthorized",
    );
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
