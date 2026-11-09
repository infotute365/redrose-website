import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { hashAdminPassword, verifyAdminPassword } from "../src/server/auth/password.mjs";

test("password hashing remains compatible with the original scrypt records", async () => {
  const password = randomBytes(32).toString("base64url");
  const passwordSalt = randomBytes(16).toString("hex");
  const credential = {
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 64).toString("hex"),
  };
  assert.ok(await verifyAdminPassword(password, credential));
  assert.ok(!(await verifyAdminPassword(`${password}incorrect`, credential)));
});

test("new hashes use unique salts and reject unknown or malformed credentials", async () => {
  const password = randomBytes(32).toString("base64url");
  const first = await hashAdminPassword(password);
  const second = await hashAdminPassword(password);
  assert.ok(first.passwordSalt !== second.passwordSalt);
  assert.ok(first.passwordHash !== second.passwordHash);
  assert.ok(await verifyAdminPassword(password, first));
  assert.ok(!(await verifyAdminPassword(password, null)));
  assert.ok(!(await verifyAdminPassword(password, { passwordSalt: "bad", passwordHash: "bad" })));
});
