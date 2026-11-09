import test from "node:test";
import assert from "node:assert/strict";
import { provisionAdmin } from "../src/server/util/provisionAdmin.js";
import {
  normalizeAdminEmail,
  normalizeAdminName,
  validateStrongPassword,
} from "../src/server/util/validation.mjs";

const pass = "Ab3!xyZ7";
test("St Mary email and strong-password validation", () => {
  assert.equal(normalizeAdminEmail(" ADMIN@REDROSE.ORG "), "admin@redrose.org");
  assert.throws(() => normalizeAdminEmail("not-an-email"), /Invalid email/);
  assert.equal(validateStrongPassword(pass), pass);
  assert.equal(normalizeAdminName(" Super Admin "), "Super Admin");
  assert.throws(() => normalizeAdminName("administrator0123"), /12 characters/);
  for (const weak of ["short", "lowercase1", "UPPERCA1", "NoDigits!", "NoSymb12", "Ab3!xyZ78"])
    assert.throws(() => validateStrongPassword(weak));
});

test("first-time provisioning saves the same model fields as St Mary", async () => {
  let created;
  const model = {
    init: async () => {},
    findOne: async () => null,
    exists: async () => false,
    create: async (value) => {
      created = value;
    },
  };
  const result = await provisionAdmin({
    email: "Admin@RedRose.org",
    name: "Rose Admin",
    password: pass,
    model,
  });
  assert.match(result, /created/i);
  assert.deepEqual(created, {
    fullname: "Rose Admin",
    email: "admin@redrose.org",
    password: pass,
    role: "super-admin",
    isActive: true,
  });
});

test("existing admin is left unchanged without an explicit reset", async () => {
  let saves = 0;
  const existing = {
    role: "super-admin",
    isActive: true,
    sessionVersion: 3,
    save: async () => {
      saves++;
    },
  };
  const model = { init: async () => {}, findOne: async () => existing };
  assert.match(
    await provisionAdmin({ email: "admin@redrose.org", password: pass, model }),
    /already exists/i,
  );
  assert.equal(saves, 0);
  assert.match(
    await provisionAdmin({ email: "admin@redrose.org", password: pass, reset: true, model }),
    /reset/i,
  );
  assert.equal(saves, 1);
  assert.equal(existing.sessionVersion, 4);
  assert.equal(existing.password, pass);
  assert.equal(existing.refreshToken, null);
});

test("new administrator cannot be added when one exists", async () => {
  const model = { init: async () => {}, findOne: async () => null, exists: async () => true };
  await assert.rejects(
    provisionAdmin({ email: "new@redrose.org", password: pass, model }),
    /already exists/i,
  );
});
