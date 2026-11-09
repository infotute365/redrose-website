import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = async (relative) => readFile(path.join(root, relative), "utf8");

test("every private admin page verifies session before rendering", async () => {
  for (const name of ["dashboard", "background", "editor", "sections", "documents", "circulars"]) {
    const source = await read(`src/app/admin/${name}/page.tsx`);
    assert.match(source, /await getAdminAccess\(\)/, name);
    assert.match(source, /redirect\("\/admin\/login"\)/, name);
  }
});

test("all admin CRUD endpoints run auth and origin guards", async () => {
  for (const route of ["circulars", "content", "documents", "media", "sections/[kind]"]) {
    const source = await read(`src/app/api/admin/${route}/route.ts`);
    assert.match(source, /guardMutation\(request\)/, route);
  }
  for (const route of ["content", "documents", "sections/[kind]"]) {
    const source = await read(`src/app/api/admin/${route}/route.ts`);
    assert.match(source, /guardAdminAccess\(\)/, route);
  }
});

test("seed and cleanup retain secure defaults", async () => {
  const auth = await read("src/server/config/auth.js");
  const login = await read("src/server/controller/auth.controller.js");
  const model = await read("src/server/model/auth.model.js");
  const files = await read("src/server/util/media-retention.mjs");
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /requireServerEnv\((["'])JWT_SECRET\1\)/);
  assert.match(auth, /jwt\.verify\(/);
  assert.match(login, /loginIsRateLimited/);
  assert.match(login, /checkMutationOrigin/);
  assert.match(model, /bcrypt\.hash\(this\.password, 12\)/);
  assert.match(files, /referencedMediaIds\(db\)/);
  assert.match(files, /bucket\.delete\(file\._id\)/);
});
