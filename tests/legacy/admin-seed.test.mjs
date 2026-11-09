import { test } from "node:test";
import assert from "node:assert/strict";
import { seedAdmin, validateAdminCredentials } from "../scripts/lib/admin-seed.mjs";
import { hashAdminPassword, verifyAdminPassword } from "../src/server/auth/password.mjs";

test("admin credentials accept the 5-15 character limits", () => {
  assert.deepEqual(validateAdminCredentials("abcde", "12345"), {
    username: "abcde",
    password: "12345",
  });
  assert.deepEqual(validateAdminCredentials("abcdefghijklmno", "123456789012345"), {
    username: "abcdefghijklmno",
    password: "123456789012345",
  });
  assert.deepEqual(validateAdminCredentials(" abcde ", "12345"), {
    username: "abcde",
    password: "12345",
  });
});

test("admin credential validation rejects values outside the allowed lengths or username syntax", () => {
  for (const [username, password] of [
    ["abcd", "12345"],
    ["abcdefghijklmnop", "12345"],
    ["abc/e", "12345"],
    ["abcde", "1234"],
    ["abcde", "1234567890123456"],
  ]) {
    assert.throws(() => validateAdminCredentials(username, password));
  }
});

test("seeding an existing matching admin updates its password and revokes sessions", async () => {
  let admin = {
    _id: "existing-admin",
    usernameNormalized: "admin1",
    sessionVersion: 4,
    ...(await hashAdminPassword("oldpass")),
  };
  let sessionRevocation;
  const admins = {
    async createIndex() {},
    async findOne() {
      return admin;
    },
    async updateOne(_filter, update) {
      admin = {
        ...admin,
        ...update.$set,
        sessionVersion: admin.sessionVersion + update.$inc.sessionVersion,
      };
    },
    async countDocuments() {
      return 1;
    },
  };
  const sessions = {
    async updateMany(filter, update) {
      sessionRevocation = { filter, update };
    },
  };
  const db = {
    collection(name) {
      return name === "admins" ? admins : sessions;
    },
  };

  assert.equal(
    await seedAdmin(db, { username: "Admin1", password: "newpass", resetPassword: true }),
    "reset",
  );
  assert.equal(admin.sessionVersion, 5);
  assert.ok(await verifyAdminPassword("newpass", admin));
  assert.ok(!(await verifyAdminPassword("oldpass", admin)));
  assert.equal(sessionRevocation.filter.usernameNormalized, "admin1");
  assert.deepEqual(sessionRevocation.filter.revokedAt, { $exists: false });
  assert.ok(sessionRevocation.update.$set.revokedAt instanceof Date);
});
