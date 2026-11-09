import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import AuthModel from "../src/server/model/auth.model.js";

test("St Mary-compatible bcrypt compare and admin schema fields", async () => {
  const hash = await bcrypt.hash("Password#Test123", 12);
  assert.equal(await bcrypt.compare("Password#Test123", hash), true);
  assert.equal(await bcrypt.compare("WrongPassword#123", hash), false);
  assert.equal(AuthModel.modelName, "Auth");
  for (const field of ["email", "password", "role", "isActive", "refreshToken", "sessionVersion"])
    assert.ok(AuthModel.schema.path(field), field);
});
