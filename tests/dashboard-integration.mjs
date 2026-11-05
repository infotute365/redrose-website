import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import sharp from "sharp";
import { MongoClient, ObjectId } from "mongodb";
import { seedAdmin } from "../scripts/lib/admin-seed.mjs";
import { SignJWT, decodeJwt } from "jose";

const runId = randomUUID().replaceAll("-", "");
const testName = `red_rose_dashboard_test_${runId}`;
const username = "dashboard-verification";
const password = randomBytes(32).toString("base64url");
const cache = path.resolve("node_modules/.cache/red-rose-dashboard");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
let server;
let serverEnvironment;
let origin;
let cookie;
let background;
let newMedia;
let sourceBytes;

async function freePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}
async function fingerprint(db) {
  const output = {};
  for (const { name } of await db.listCollections().toArray()) {
    if (["loginLimits", "adminSessions"].includes(name)) continue;
    output[name] = hash(
      JSON.stringify(await db.collection(name).find().sort({ _id: 1 }).toArray()),
    );
  }
  return output;
}
async function sourceFingerprint() {
  const files = [
    ".env.local",
    "src/app/globals.css",
    "src/lib/admin-auth.ts",
    "src/server/auth/password.mjs",
    "scripts/seed-admin.mjs",
  ];
  async function walk(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await walk(file);
      else files.push(file);
    }
  }
  for (const directory of ["public", "data", "src/components/public", "src/lib/content"])
    await walk(directory);
  return Object.fromEntries(
    await Promise.all(files.map(async (file) => [file, hash(await readFile(file))])),
  );
}
async function startServer() {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      new URL(origin).port,
    ],
    { env: serverEnvironment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error("The isolated application server exited before becoming ready.");
    try {
      if (
        (await fetch(`${origin}/admin/login`, { signal: AbortSignal.timeout(1000) })).status === 200
      )
        return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The isolated application server did not become ready.");
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const stopped = once(server, "exit");
  server.kill();
  await Promise.race([
    stopped,
    new Promise((resolve) => {
      const timer = setTimeout(resolve, 5000);
      timer.unref();
    }),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
async function request(route, { auth = true, ...options } = {}) {
  return fetch(new URL(route, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    ...options,
    headers: {
      Origin: origin,
      "x-red-rose-proxy-secret": serverEnvironment.PROXY_SHARED_SECRET,
      "x-real-ip": "192.0.2.10",
      ...(auth && cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
}
async function jsonRequest(route, method, body, options) {
  return request(route, {
    ...options,
    method,
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
}
async function currentBackground() {
  const response = await request("/api/admin/sections/slides?view=background");
  assert.equal(response.status, 200);
  return (await response.json()).background;
}
function backgroundChange(current, change) {
  return {
    action: "background",
    id: current.slideId,
    expectedSrc: current.src,
    expectedRevision: current.revision,
    ...change,
  };
}
function withoutBackgroundFields(item) {
  return Object.fromEntries(
    Object.entries(item).filter(
      ([key]) =>
        !["src", "backgroundRevision", "backgroundPosition", "previousBackground"].includes(key),
    ),
  );
}

await test("dashboard and homepage background integration in an isolated database", async (t) => {
  await mkdir(cache, { recursive: true });
  await client.connect();
  const real = client.db(process.env.MONGODB_DATABASE || "red_rose_academy");
  const db = client.db(testName);
  const beforeReal = await fingerprint(real);
  const beforeFiles = await sourceFingerprint();
  try {
    // Copy school records for realistic checks. Real accounts, sessions and limits
    // are neither copied nor edited; the test account exists only in this database.
    for (const { name } of await real.listCollections().toArray()) {
      if (["admins", "adminSessions", "loginLimits"].includes(name)) continue;
      const records = await real.collection(name).find().toArray();
      if (records.length) await db.collection(name).insertMany(records);
    }
    if (!(await db.collection("homeSlides").countDocuments()))
      await db
        .collection("homeSlides")
        .insertMany(JSON.parse(await readFile("data/seed-slides.json", "utf8")));
    const originalSlides = await db.collection("homeSlides").find().toArray();
    const originalSiteContent = await db.collection("siteContent").findOne({ key: "public" });
    await seedAdmin(db, { username, password });
    const port = await freePort();
    origin = `http://127.0.0.1:${port}`;
    serverEnvironment = {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_DATABASE: testName,
      APP_ORIGIN: origin,
      ADMIN_USERNAME: username,
      ADMIN_PASSWORD: password,
      JWT_SECRET: randomBytes(64).toString("base64url"),
      TRUST_PROXY: "true",
      PROXY_SHARED_SECRET: randomBytes(48).toString("base64url"),
    };
    delete serverEnvironment.NODE_TEST_CONTEXT;
    await startServer();
    const login = await jsonRequest(
      "/api/admin/login",
      "POST",
      { username, password },
      { auth: false },
    );
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie").split(";")[0];

    await t.test(
      "JWT authorization rejects altered claims, disabled accounts, stale versions and legacy sessions",
      async () => {
        const token = cookie.slice(cookie.indexOf("=") + 1);
        const claims = decodeJwt(token);
        const key = Buffer.from(serverEnvironment.JWT_SECRET, "base64url");
        const check = async (value, status) =>
          assert.equal(
            (
              await request("/api/admin/content", {
                headers: { Cookie: `red-rose-admin=${value}` },
              })
            ).status,
            status,
          );
        await check(token.slice(0, -8) + "invalid0", 401);
        await check("legacy-opaque-session", 401);
        for (const payload of [
          { ...claims, iss: "wrong-issuer" },
          { ...claims, aud: "wrong-audience" },
          { ...claims, sub: "missing-admin" },
          { ...claims, exp: claims.iat - 1 },
          { ...claims, sessionVersion: claims.sessionVersion + 1 },
        ]) {
          await check(
            await new SignJWT(payload).setProtectedHeader({ alg: "HS256", typ: "JWT" }).sign(key),
            401,
          );
        }
        await check(
          await new SignJWT({ ...claims, role: "student" })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .sign(key),
          403,
        );
        const admin = await db.collection("admins").findOne({ usernameNormalized: username });
        for (const [change, status] of [
          [{ active: false }, 401],
          [{ role: "student" }, 403],
          [{ sessionVersion: admin.sessionVersion + 1 }, 401],
        ]) {
          try {
            await db.collection("admins").updateOne({ _id: admin._id }, { $set: change });
            await check(token, status);
          } finally {
            await db.collection("admins").replaceOne({ _id: admin._id }, admin);
          }
        }
        await check(token, 200);
        assert.equal(
          (
            await request("/api/admin/login", {
              auth: false,
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: "x".repeat(5000), password: "x" }),
            })
          ).status,
          413,
        );
        assert.equal(
          (
            await jsonRequest("/api/admin/content", "PUT", {
              key: "footer:t:0",
              value: "x".repeat(70000),
            })
          ).status,
          413,
        );
        assert.equal(
          (
            await request("/api/admin/content", {
              headers: { "x-red-rose-proxy-secret": "spoofed", "x-forwarded-for": "192.0.2.1" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await jsonRequest(
              "/api/admin/content",
              "PUT",
              {},
              { headers: { Origin: "https://attacker.example", Host: "attacker.example" } },
            )
          ).status,
          403,
        );
        for (const route of [
          "content",
          "documents",
          "circulars",
          "sections/slides",
          "sections/events",
        ]) {
          for (const body of [null, [], "invalid"])
            assert.equal(
              (await jsonRequest(`/api/admin/${route}`, "PATCH", body)).status,
              route === "content" ? 405 : 400,
            );
        }
        const response = await request("/admin/dashboard");
        const policy = response.headers.get("content-security-policy");
        assert.ok(policy.includes("'nonce-"));
        assert.ok(!policy.includes("'unsafe-eval'"));
        assert.ok(
          !policy
            .split(";")
            .find((value) => value.trim().startsWith("script-src "))
            .includes("'unsafe-inline'"),
        );
        assert.match(response.headers.get("cache-control"), /private.*no-store/);
      },
    );

    await t.test("all admin screens require a server-verified session", async () => {
      for (const route of [
        "dashboard",
        "background",
        "editor",
        "documents",
        "circulars",
        "sections?tab=slides",
        "sections?tab=events",
      ]) {
        const anonymous = await request(`/admin/${route}`, { auth: false });
        assert.ok([303, 307].includes(anonymous.status), route);
        assert.equal((await request(`/admin/${route}`)).status, 200, route);
      }
      assert.equal(
        (await request("/api/admin/sections/slides?view=background", { auth: false })).status,
        401,
      );
      assert.equal(
        (
          await jsonRequest(
            "/api/admin/sections/slides",
            "PATCH",
            { action: "background" },
            { auth: false },
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/api/admin/media?purpose=homepage-background", {
            auth: false,
            method: "POST",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await jsonRequest(
            "/api/admin/sections/slides",
            "PATCH",
            {},
            { headers: { Origin: "https://invalid.example" } },
          )
        ).status,
        403,
      );
    });
    await t.test("the background manager targets the exact first published slide", async () => {
      const first = await db
        .collection("homeSlides")
        .findOne({ isPublished: { $ne: false } }, { sort: { displayOrder: 1, id: 1 } });
      background = await currentBackground();
      assert.equal(background.slideId, first.id);
      assert.ok(background.src);
      assert.equal(await db.collection("admins").countDocuments(), 1);
    });
    await t.test("invalid, oversized and disguised image uploads are rejected", async () => {
      for (const [bytes, name, type, status] of [
        [Buffer.from("<svg/>"), "invalid.svg", "image/svg+xml", 400],
        [Buffer.from("GIF89a"), "invalid.gif", "image/gif", 400],
        [Buffer.from("89504e470d0a1a0a", "hex"), "broken.png", "image/png", 400],
        [Buffer.from("not an image"), "fake.jpg", "image/jpeg", 400],
        [Buffer.alloc(20 * 1024 * 1024 + 1), "oversize.png", "image/png", 413],
      ]) {
        const form = new FormData();
        form.set("file", new File([bytes], name, { type }));
        assert.equal(
          (
            await request("/api/admin/media?purpose=homepage-background", {
              method: "POST",
              body: form,
            })
          ).status,
          status,
          name,
        );
      }
    });
    await t.test(
      "4K uploads are decoded, optimized and stored at a permanent GridFS URL",
      async () => {
        sourceBytes = await sharp({
          create: { width: 4096, height: 2304, channels: 3, background: "#167f84" },
        })
          .png()
          .toBuffer();
        await writeFile(path.join(cache, "test-background.png"), sourceBytes);
        await writeFile(path.join(cache, "invalid.svg"), "<svg/>");
        await writeFile(path.join(cache, "oversize.png"), Buffer.alloc(20 * 1024 * 1024 + 1));
        const form = new FormData();
        form.set("file", new File([sourceBytes], "../../background.png", { type: "image/png" }));
        const response = await request("/api/admin/media?purpose=homepage-background", {
          method: "POST",
          body: form,
        });
        assert.equal(response.status, 201);
        newMedia = await response.json();
        assert.match(newMedia.url, /^\/api\/media\/[a-f0-9]{24}$/);
        assert.equal(newMedia.width, 3840);
        assert.equal(newMedia.height, 2160);
        const file = await db.collection("media.files").findOne({ _id: new ObjectId(newMedia.id) });
        assert.match(file.filename, /^asset-[a-f0-9-]{36}\.webp$/);
        assert.equal(file.metadata.contentType, "image/webp");
        const download = await request(newMedia.url, { auth: false });
        assert.equal(download.status, 200);
        assert.equal(download.headers.get("content-type"), "image/webp");
        const image = await sharp(Buffer.from(await download.arrayBuffer())).metadata();
        assert.equal(image.width, 3840);
        assert.equal(image.height, 2160);
        for (const format of ["jpeg", "webp"]) {
          const bytes = await sharp(sourceBytes)
            .resize({ width: 2000 })
            .toFormat(format)
            .toBuffer();
          const upload = new FormData();
          upload.set("file", new File([bytes], `supported.${format}`, { type: `image/${format}` }));
          const response = await request("/api/admin/media?purpose=homepage-background", {
            method: "POST",
            body: upload,
          });
          assert.equal(response.status, 201, format);
          assert.equal((await response.json()).width, 2000);
        }
      },
    );
    await t.test(
      "background-only save preserves every text, order, permission and other slide field",
      async () => {
        const before = await db.collection("homeSlides").findOne({ id: background.slideId });
        const others = await db
          .collection("homeSlides")
          .find({ id: { $ne: background.slideId } })
          .sort({ id: 1 })
          .toArray();
        const response = await jsonRequest(
          "/api/admin/sections/slides",
          "PATCH",
          backgroundChange(background, { src: newMedia.url, position: "top" }),
        );
        assert.equal(response.status, 200);
        const after = await db.collection("homeSlides").findOne({ id: background.slideId });
        assert.deepEqual(withoutBackgroundFields(after), withoutBackgroundFields(before));
        assert.deepEqual(
          await db
            .collection("homeSlides")
            .find({ id: { $ne: background.slideId } })
            .sort({ id: 1 })
            .toArray(),
          others,
        );
        assert.equal(after.previousBackground.src, background.src);
        assert.equal(after.backgroundPosition, "top");
        const publicPage = await request("/", { auth: false });
        assert.equal(publicPage.status, 200);
        const html = await publicPage.text();
        assert.ok(html.includes(newMedia.url) || html.includes(encodeURIComponent(newMedia.url)));
        assert.ok(html.includes("object-position:top"));
      },
    );
    await t.test(
      "stale saves, unsafe paths, invalid positions and competing editor writes fail",
      async () => {
        assert.equal(
          (
            await jsonRequest(
              "/api/admin/sections/slides",
              "PATCH",
              backgroundChange(background, { src: "/images/home2.jpeg" }),
            )
          ).status,
          409,
        );
        const current = await currentBackground();
        const staleSlide = await db.collection("homeSlides").findOne({ id: current.slideId });
        assert.equal(
          (
            await jsonRequest("/api/admin/sections/slides", "PATCH", {
              ...staleSlide,
              expectedRevision: current.revision - 1,
            })
          ).status,
          409,
        );
        for (const change of [
          { position: "unsafe" },
          { src: "/images/../secret.png" },
          { src: "https://invalid.example/image.png" },
          { src: "/api/media/000000000000000000000000" },
        ]) {
          assert.equal(
            (
              await jsonRequest(
                "/api/admin/sections/slides",
                "PATCH",
                backgroundChange(current, change),
              )
            ).status,
            400,
          );
        }
        assert.equal((await jsonRequest("/api/admin/sections/slides", "PATCH", null)).status, 400);
        assert.equal(
          (
            await jsonRequest("/api/admin/content", "PUT", {
              key: "page:/:i:0",
              value: "/images/home2.jpeg",
            })
          ).status,
          409,
        );
        assert.equal((await currentBackground()).src, newMedia.url);
      },
    );
    await t.test(
      "the published image and position persist after a real Next.js restart",
      async () => {
        await stopServer();
        await startServer();
        const current = await currentBackground();
        assert.equal(current.src, newMedia.url);
        assert.equal(current.position, "top");
        assert.equal((await request(current.src, { auth: false })).status, 200);
      },
    );
    await t.test("restore swaps the previous image and preserves the slideshow", async () => {
      const before = await currentBackground();
      const count = await db.collection("homeSlides").countDocuments();
      const response = await jsonRequest(
        "/api/admin/sections/slides",
        "PATCH",
        backgroundChange(before, { restore: true }),
      );
      assert.equal(response.status, 200);
      const current = await currentBackground();
      assert.equal(current.src, background.src);
      assert.equal(current.position, background.position);
      assert.equal(current.previous.src, newMedia.url);
      assert.equal(await db.collection("homeSlides").countDocuments(), count);
    });
    await t.test(
      "an existing visual-editor hero image is preserved until an explicit background save",
      async () => {
        const current = await currentBackground();
        await db
          .collection("homeSlides")
          .updateOne({ id: current.slideId }, { $unset: { backgroundRevision: "" } });
        await db
          .collection("siteContent")
          .updateOne(
            { key: "public" },
            { $set: { "overrides.page:/:i:0": "/images/home2.jpeg" } },
            { upsert: true },
          );
        const legacy = await currentBackground();
        assert.equal(legacy.src, "/images/home2.jpeg");
        const response = await jsonRequest(
          "/api/admin/sections/slides",
          "PATCH",
          backgroundChange(legacy, { src: newMedia.url }),
        );
        assert.equal(response.status, 200);
        assert.equal((await currentBackground()).src, newMedia.url);
        assert.equal((await currentBackground()).previous.src, "/images/home2.jpeg");
        assert.equal(
          (await db.collection("siteContent").findOne({ key: "public" })).overrides["page:/:i:0"],
          "/images/home2.jpeg",
        );
      },
    );
    await t.test("the last published homepage slide cannot be hidden or deleted", async () => {
      const current = await currentBackground();
      const slides = await db.collection("homeSlides").find().toArray();
      await db
        .collection("homeSlides")
        .updateMany({ id: { $ne: current.slideId } }, { $set: { isPublished: false } });
      const item = await db.collection("homeSlides").findOne({ id: current.slideId });
      assert.equal(
        (await jsonRequest("/api/admin/sections/slides", "PATCH", { ...item, isPublished: false }))
          .status,
        400,
      );
      assert.equal(
        (await jsonRequest("/api/admin/sections/slides", "DELETE", { id: current.slideId })).status,
        400,
      );
      for (const slide of slides)
        await db
          .collection("homeSlides")
          .updateOne(
            { _id: slide._id },
            slide.isPublished === undefined
              ? { $unset: { isPublished: "" } }
              : { $set: { isPublished: slide.isPublished } },
          );
    });
    await t.test(
      "document upload, replacement, title edit, stable download links and deletion work",
      async () => {
        const documents = JSON.parse(await readFile("public/uploads/documents.json", "utf8"));
        const bytes = await readFile(path.join("public", documents[0].url.slice(1)));
        await writeFile(path.join(cache, "test-document.pdf"), bytes);
        const form = new FormData();
        form.set("title", "Temporary document check");
        form.set("category", "fees");
        form.set("files", new File([bytes], "test.pdf", { type: "application/pdf" }));
        const response = await request("/api/admin/documents", { method: "POST", body: form });
        assert.equal(response.status, 201);
        const document = (await response.json()).documents[0];
        const replacement = new FormData();
        replacement.set("id", document.id);
        replacement.set("file", new File([bytes], "replacement.pdf", { type: "application/pdf" }));
        const replaced = await request("/api/admin/documents", {
          method: "PATCH",
          body: replacement,
        });
        assert.equal(replaced.status, 200);
        assert.equal((await replaced.json()).document.url, document.url);
        const downloadRedirect = await request(document.url, { auth: false });
        assert.equal(downloadRedirect.status, 307);
        assert.match(downloadRedirect.headers.get("location"), /^\/api\/media\/[a-f0-9]{24}$/);
        assert.equal(
          (
            await jsonRequest("/api/admin/documents", "PATCH", {
              id: document.id,
              title: "Updated verification document",
            })
          ).status,
          200,
        );
        assert.equal(
          (await jsonRequest("/api/admin/documents", "DELETE", { id: document.id })).status,
          200,
        );
      },
    );
    await t.test(
      "circular and event create, edit, promote, publish and delete contracts remain working",
      async () => {
        const form = new FormData();
        form.set("title", "Temporary notice check");
        form.set("description", "Temporary verification details.");
        form.set("noticeDate", "2026-11-05");
        const pdfBytes = await readFile(path.join(cache, "test-document.pdf"));
        form.set("file", new File([pdfBytes], "notice.pdf", { type: "application/pdf" }));
        const response = await request("/api/admin/circulars", { method: "POST", body: form });
        assert.equal(response.status, 201);
        const notice = (await response.json()).circular;
        assert.ok(
          (await (await request("/circulars", { auth: false })).text()).includes(notice.title),
        );
        assert.ok(
          Buffer.from(await (await request(notice.pdfUrl, { auth: false })).arrayBuffer()).equals(
            pdfBytes,
          ),
        );
        assert.equal(
          (
            await jsonRequest("/api/admin/circulars", "PATCH", {
              ...notice,
              title: "Updated temporary notice",
            })
          ).status,
          200,
        );
        assert.equal(
          (await jsonRequest("/api/admin/circulars", "PATCH", { id: notice.id })).status,
          200,
        );
        assert.equal(
          (await jsonRequest("/api/admin/circulars", "DELETE", { id: notice.id })).status,
          200,
        );
        const item = {
          title: "Temporary event check",
          description: "Verification only.",
          category: "School life",
          image: "/images/events/Event1.jpeg",
          alt: "Test",
          isPublished: true,
          displayOrder: 50,
        };
        const event = await jsonRequest("/api/admin/sections/events", "POST", item);
        assert.equal(event.status, 201);
        const created = (await event.json()).item;
        assert.ok(
          (await (await request("/gallery", { auth: false })).text()).includes(created.title),
        );
        assert.equal(
          (
            await jsonRequest("/api/admin/sections/events", "PATCH", {
              ...created,
              image: "/images/home2.jpeg",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await jsonRequest("/api/admin/sections/events", "PATCH", {
              ...created,
              isPublished: false,
            })
          ).status,
          200,
        );
        assert.ok(
          !(await (await request("/gallery", { auth: false })).text()).includes(created.title),
        );
        assert.equal(
          (await jsonRequest("/api/admin/sections/events", "DELETE", { slug: created.slug }))
            .status,
          200,
        );
      },
    );
    await t.test("existing authentication and seed integration checks still pass", async () => {
      const child = spawn(
        process.execPath,
        ["--env-file=.env.local", "--test", "tests/admin-integration.mjs"],
        {
          env: {
            ...serverEnvironment,
            ADMIN_TEST_ORIGIN: origin,
            ADMIN_TEST_SECURE: "true",
            ADMIN_TEST_STATIC_DIR: ".next/static",
          },
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk) => {
        output += chunk;
      });
      const [code] = await once(child, "exit");
      // The child checks never print secrets; still suppress its output unless a failure occurs.
      if (code) {
        console.log(output.replaceAll(password, "[redacted]"));
      }
      assert.equal(code, 0);
      assert.ok(
        /(?:pass 13|# pass 13)/.test(output),
        "The existing test runner must execute all thirteen checks.",
      );
      console.log("Existing admin integration suite: 13/13 passed in the isolated database.");
    });
    await t.test("real browser background, editor, navigation and logout flows", async (t) => {
      // Start visual checks from the original school photographs in the test copy.
      for (const slide of originalSlides)
        await db.collection("homeSlides").replaceOne({ _id: slide._id }, slide);
      await db
        .collection("siteContent")
        .replaceOne({ key: "public" }, originalSiteContent || { key: "public", overrides: {} }, {
          upsert: true,
        });
      const { runDashboardBrowserChecks } = await import("./helpers/dashboard-browser.mjs");
      const result = await runDashboardBrowserChecks({
        origin,
        username,
        password,
        cache,
        proxySecret: serverEnvironment.PROXY_SHARED_SECRET,
        report: (message) => console.log(message),
      });
      if (result.skipped) t.skip(result.skipped);
    });
    await t.test(
      "all original database records, credentials and public assets remain untouched",
      async () => {
        assert.deepEqual(await fingerprint(real), beforeReal);
        assert.deepEqual(await sourceFingerprint(), beforeFiles);
      },
    );
  } finally {
    await stopServer();
    if (testName === `red_rose_dashboard_test_${runId}`) await db.dropDatabase();
    await client.close();
  }
});
