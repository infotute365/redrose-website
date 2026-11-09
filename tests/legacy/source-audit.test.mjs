import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");
async function walk(dir) {
  const entries = [];
  for (const f of await readdir(path.join(root, dir))) {
    const p = path.join(dir, f);
    if ((await stat(path.join(root, p))).isDirectory()) entries.push(...(await walk(p)));
    else entries.push(p);
  }
  return entries;
}

test("original school images and leadership photos are retained", async () => {
  const files = [
    "RedRoseLogoBBG.png",
    "home1.jpeg",
    "home2.jpeg",
    "home3.jpeg",
    "home4.jpeg",
    "Md.jpeg",
    "principal.jpg",
  ];
  for (const name of files)
    assert.ok((await stat(path.join(root, "public/images", name))).size > 1000, name);
});
test("original fee and TC PDFs are included", async () => {
  const items = JSON.parse(await read("public/uploads/documents.json"));
  assert.equal(items.length, 2);
  for (const item of items)
    assert.ok((await stat(path.join(root, "public", item.url.slice(1)))).size > 1000);
});
test("admin seed prompts for credentials and updates the matching admin password", async () => {
  const source = await read("scripts/seed-admin.mjs");
  assert.match(source, /promptAdminCredentials/);
  assert.match(source, /resetPassword: true/);
  assert.doesNotMatch(source, /ADMIN_USERNAME|ADMIN_PASSWORD/);
  assert.match(source, /seedAdmin/);
  const admin = await read("scripts/lib/admin-seed.mjs");
  assert.match(admin, /sessionVersion/);
  assert.match(admin, /setOnInsert/);
  assert.match(await read("scripts/seed-database.mjs"), /readDatabaseConfiguration/);
  assert.doesNotMatch(await read("scripts/seed-database.mjs"), /ADMIN_USERNAME|ADMIN_PASSWORD/);
  assert.doesNotMatch(source, /siteContent|seedStates|homeSlides|schoolEvents|circulars|documents/);
  assert.match(await read("scripts/seed-database.mjs"), /seedStates/);
});
test("all mutating public-content and media APIs use authenticated guards", async () => {
  for (const name of ["documents", "circulars", "content", "media", "sections/[kind]"]) {
    const source = await read(`src/app/api/admin/${name}/route.ts`);
    assert.match(source, /guardMutation\(request\)/, name);
  }
});
test("login uses signed JWTs with revocable database sessions and throttles attempts", async () => {
  const auth = await read("src/lib/admin-auth.ts");
  assert.match(await read("src/server/auth/jwt.mjs"), /randomBytes\(32\)/);
  assert.match(await read("src/server/auth/sessions.mjs"), /adminSessions/);
  assert.match(auth, /loginIsRateLimited/);
  assert.match(auth, /sameSite: "strict"/);
  const login = await read("src/app/api/admin/login/route.ts");
  assert.match(login, /loginIsRateLimited/);
});
test("file validation checks actual signatures, not MIME labels alone", async () => {
  const media = await read("src/lib/media.ts");
  for (const sig of ["%PDF-", "ffd8ff", "89504e470d0a1a0a", "GIF87a", "WEBP"])
    assert.ok(media.includes(sig));
  assert.match(media, /20 \* 1024 \* 1024/);
});
test("no maroon colors or rose styling classes in redesigned public JSX", async () => {
  const sources = (await walk("src/components/public")).filter((f) => f.endsWith(".tsx"));
  for (const p of sources) {
    const s = await read(p);
    assert.doesNotMatch(
      s,
      /\b(?:bg|text|border|ring|shadow|hover:bg|hover:text)-rose-\d{2,3}\b/,
      p,
    );
  }
});
test("visual content editing uses textContent rather than innerHTML", async () => {
  const runtime = await read("src/components/public/CmsRuntime.tsx");
  assert.match(runtime, /\.textContent/);
  assert.doesNotMatch(runtime, /innerHTML\s*=/);
});

test("approved homepage keeps original school identity and dynamic hero", async () => {
  const hero = await read("src/components/public/home/HomeExperience.tsx");
  const navbar = await read("src/components/public/layout/Navbar.tsx");
  assert.match(hero, /slide\.src/);
  assert.match(hero, /circulars\.slice/);
  assert.match(hero, /View All Notices & Circulars/);
  assert.match(hero, /href="\/gallery"/);
  assert.match(navbar, /Rongpur, Silchar, Assam/);
  assert.doesNotMatch(hero + navbar, /Guwahati|Don Bosco/);
  const mgr = await read("src/components/admin/SectionsManager.tsx");
  assert.match(mgr, /Current Homepage Background/);
  assert.match(mgr, /\/api\/admin\/media/);
});
test("gallery and circulars pages render published MongoDB records", async () => {
  assert.match(await read("src/app/gallery/page.tsx"), /getHomeSlides\(\)/);
  assert.match(await read("src/app/gallery/page.tsx"), /getSchoolEvents\(\)/);
  assert.match(await read("src/app/circulars/page.tsx"), /getCirculars\(\)/);
});
