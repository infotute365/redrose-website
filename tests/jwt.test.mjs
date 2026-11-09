import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { issueTokens, ACCESS_SECONDS, REFRESH_SECONDS } from "../src/server/config/auth.js";

test("access and refresh tokens follow St Mary lifetimes", () => {
  const before = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = "long_secure_test_secret_0123456789_abcdefghijklmnop";
    const tokens = issueTokens({
      _id: "507f1f77bcf86cd799439011",
      fullname: "Super Admin",
      email: "admin@redrose.org",
      role: "super-admin",
      sessionVersion: 2,
    });
    const claims = jwt.verify(tokens.accessToken, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    assert.equal(claims.email, "admin@redrose.org");
    assert.equal(claims.version, 2);
    assert.equal(claims.exp - claims.iat, ACCESS_SECONDS);
    assert.equal(REFRESH_SECONDS, 7 * 24 * 3600);
    assert.match(tokens.refreshToken, /^[A-Za-z0-9_-]{43}$/);
  } finally {
    if (before === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = before;
  }
});
