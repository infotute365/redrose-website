import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAdminEmail,
  normalizeAdminName,
  validateStrongPassword,
} from "../src/server/util/validation.mjs";

test("St Mary email login retained; Red Rose display name is 1-12 characters", () => {
  assert.equal(normalizeAdminEmail(" Rose@Example.org "), "rose@example.org");
  assert.equal(normalizeAdminName(" Rose Admin "), "Rose Admin");
  assert.equal(normalizeAdminName("ABCDEFGHIJKL"), "ABCDEFGHIJKL");
  assert.throws(() => normalizeAdminName("ABCDEFGHIJKLM"), /12/);
  assert.throws(() => normalizeAdminName(""), /12/);
  assert.throws(() => normalizeAdminName("Admin<script>"), /12/);
});

test("Red Rose seed enforces exactly eight printable characters and four classes", () => {
  assert.equal(validateStrongPassword("Ab3!xyZ7"), "Ab3!xyZ7");
  for (const candidate of [
    "Ab3!xyZ",
    "Ab3!xyZ78",
    "abcdefgh",
    "ABCDEFGH",
    "12345678",
    "Abcd1234",
    "ABC!1234",
    "abc!1234",
    "Ab3!\nZ78",
    "Äb3!xyZ7",
  ]) {
    assert.throws(() => validateStrongPassword(candidate), /exactly 8/);
  }
});
