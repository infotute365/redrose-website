import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

async function read(path) {
  return readFile(new URL("../" + path, import.meta.url), "utf8");
}
test("St Mary folder names and seed data contract are present", async () => {
  for (const p of [
    "scripts/seed-admin.mjs",
    "src/server/config/database.js",
    "src/server/config/auth.js",
    "src/server/controller/auth.controller.js",
    "src/server/middleware/auth.middleware.js",
    "src/server/model/auth.model.js",
    "src/server/util/provisionAdmin.js",
    "src/server/util/validation.mjs",
  ])
    assert.ok((await stat(new URL("../" + p, import.meta.url))).isFile(), p);
  assert.match(await read("scripts/seed-admin.mjs"), /ADMIN_INITIAL_EMAIL/);
  assert.match(await read("scripts/seed-admin.mjs"), /--reset-password/);
  assert.match(await read("src/server/config/database.js"), /mongoose\.connect/);
  assert.match(await read("src/server/model/auth.model.js"), /bcrypt\.hash/);
  assert.match(await read("src/app/admin/login/page.tsx"), /name="email"/);
});
test("all original public images, logos, PDFs and text assets are intact", async () => {
  const manifest = JSON.parse(await read("PUBLIC_ASSET_PRESERVATION_SHA256.json"));
  for (const [path, expected] of Object.entries(manifest)) {
    const bytes = await readFile(new URL("../" + path, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, path);
  }
});
