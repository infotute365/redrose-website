import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { GridFSBucket, MongoClient, ObjectId } from "mongodb";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { promptAdminCredentials } from "../scripts/lib/admin-prompt.mjs";
import { seedAdmin } from "../scripts/lib/admin-seed.mjs";
import { readDatabaseConfiguration } from "../src/server/config/mongo-client.mjs";
import { verifyAdminPassword } from "../src/server/auth/password.mjs";

// Opt-in local integration checks: npm run dev (or npm start), then npm run test:admin.
// No password, cookie or database connection string is included in test output.
const configuration = { ...readDatabaseConfiguration(), ...(await promptAdminCredentials()) };
const origin = new URL(
  process.env.ADMIN_TEST_ORIGIN || process.env.APP_ORIGIN || "http://localhost:3000",
).origin;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)) {
  throw new Error("Admin integration checks must target a local server.");
}
const digest = (value) => createHash("sha256").update(value).digest("hex");
const runId = randomUUID().replaceAll("-", "");
const testDatabaseName = `red_rose_admin_test_${runId}`;
const client = new MongoClient(configuration.uri, { serverSelectionTimeoutMS: 8000 });
const rateKeys = new Set();
const sessionHashes = new Set();
let cookie;
function accountKey(username) {
  return `account:${digest(username.trim().toLowerCase())}`;
}
function request(route, options = {}) {
  return fetch(new URL(route, origin), {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
    headers: {
      Origin: origin,
      ...(process.env.TRUST_PROXY === "true"
        ? { "x-red-rose-proxy-secret": process.env.PROXY_SHARED_SECRET, "x-real-ip": "192.0.2.10" }
        : {}),
      ...(options.headers || {}),
    },
  });
}
async function login(username, password, ip = "192.0.2.11") {
  rateKeys.add(accountKey(username));
  rateKeys.add(`ip:${digest(process.env.TRUST_PROXY === "true" ? ip : "direct-client")}`);
  const response = await request("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": ip,
    },
    body: JSON.stringify({ username, password }),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    const token = setCookie.match(/red-rose-admin=([^;]*)/)?.[1];
    if (token) sessionHashes.add(digest(decodeJwt(token).jti));
  }
  return response;
}
async function contentSnapshot(db) {
  const snapshot = {};
  for (const { name } of await db.listCollections().toArray()) {
    if (["admins", "adminSessions", "loginLimits"].includes(name)) continue;
    const rows = await db.collection(name).find().sort({ _id: 1 }).toArray();
    if (rows.length) snapshot[name] = digest(JSON.stringify(rows));
  }
  return snapshot;
}

await test("admin provisioning and live authentication", async (t) => {
  await client.connect();
  const db = client.db(configuration.databaseName);
  const isolated = client.db(testDatabaseName);
  const beforeContent = await contentSnapshot(db);
  const beforeAdmin = await db
    .collection("admins")
    .findOne({ usernameNormalized: configuration.username.toLowerCase() });
  try {
    assert.ok(beforeAdmin, "Run npm run seed:admin before integration checks.");
    await t.test(
      "seeding is idempotent and never overwrites existing credentials or content",
      async () => {
        assert.equal(
          await seedAdmin(db, {
            ...configuration,
            password: randomBytes(32).toString("base64url"),
          }),
          "exists",
        );
        const after = await db.collection("admins").findOne({ _id: beforeAdmin._id });
        assert.ok(
          after.passwordHash === beforeAdmin.passwordHash,
          "Existing password hash was preserved.",
        );
        assert.ok(after.passwordSalt === beforeAdmin.passwordSalt, "Existing salt was preserved.");
        assert.equal(after.sessionVersion, beforeAdmin.sessionVersion);
        assert.deepEqual(await contentSnapshot(db), beforeContent);
      },
    );
    await t.test(
      "concurrent first-run seeds create one administrator and no school collections",
      async () => {
        const password = randomBytes(32).toString("base64url");
        const results = await Promise.all(
          Array.from({ length: 8 }, (_, i) =>
            seedAdmin(isolated, { username: `initial-${i}`, password }),
          ),
        );
        assert.equal(results.filter((result) => result === "created").length, 1);
        assert.equal(await isolated.collection("admins").countDocuments(), 1);
        assert.deepEqual(
          (await isolated.listCollections().toArray()).map((item) => item.name),
          ["admins"],
        );
        const admin = await isolated.collection("admins").findOne();
        assert.ok(await verifyAdminPassword(password, admin));
        assert.equal(admin.role, "admin");
        assert.equal(admin.active, true);
        assert.ok(!Object.hasOwn(admin, "password"));
        const replacement = randomBytes(32).toString("base64url");
        await isolated
          .collection("adminSessions")
          .insertOne({ usernameNormalized: admin.usernameNormalized });
        assert.equal(
          await seedAdmin(isolated, {
            username: admin.username,
            password: replacement,
            resetPassword: true,
          }),
          "reset",
        );
        const reset = await isolated.collection("admins").findOne({ _id: admin._id });
        assert.equal(reset.sessionVersion, admin.sessionVersion + 1);
        assert.ok(await verifyAdminPassword(replacement, reset));
        assert.ok(!(await verifyAdminPassword(password, reset)));
        assert.equal(await isolated.collection("adminSessions").countDocuments(), 1);
        assert.ok((await isolated.collection("adminSessions").findOne()).revokedAt instanceof Date);
      },
    );
    await t.test("public pages and login form load without authentication", async () => {
      for (const route of [
        "/",
        "/gallery",
        "/circulars",
        "/pages/about-us",
        "/pages/fee-structure",
        "/pages/tc-format",
        "/admin/login",
      ]) {
        const response = await request(route);
        assert.equal(response.status, 200, route);
        const html = await response.text();
        assert.ok(!html.includes(configuration.password), "No admin password appears in HTML.");
        if (route === "/admin/login") {
          assert.match(html, /name="username"/);
          assert.match(html, /type="password"/);
        }
      }
    });
    await t.test("every protected admin API rejects anonymous access", async () => {
      const routes = [
        ["GET", "content"],
        ["GET", "documents"],
        ["GET", "sections/slides"],
        ["GET", "sections/events"],
        ["PUT", "content"],
        ["DELETE", "content"],
        ["POST", "documents"],
        ["PATCH", "documents"],
        ["DELETE", "documents"],
        ["POST", "circulars"],
        ["PATCH", "circulars"],
        ["DELETE", "circulars"],
        ["POST", "media"],
        ...["slides", "events"].flatMap((kind) =>
          ["POST", "PATCH", "DELETE"].map((method) => [method, `sections/${kind}`]),
        ),
      ];
      for (const [method, route] of routes)
        assert.equal(
          (await request(`/api/admin/${route}`, { method })).status,
          401,
          `${method} ${route}`,
        );
      for (const route of [
        "/admin/dashboard",
        "/admin/editor",
        "/admin/sections",
        "/admin/background",
        "/admin/documents",
        "/admin/circulars",
      ]) {
        const response = await request(route);
        assert.ok([303, 307].includes(response.status), route);
        assert.ok(response.headers.get("location")?.endsWith("/admin/login"));
      }
    });
    await t.test(
      "invalid input, cross-origin requests and wrong credentials are rejected",
      async () => {
        assert.equal(
          (
            await request("/api/admin/login", {
              method: "POST",
              headers: { Origin: "https://invalid.example" },
            })
          ).status,
          403,
        );
        for (const body of ["null", "[]", "{}", "invalid-json"]) {
          assert.equal(
            (
              await request("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
              })
            ).status,
            400,
          );
        }
        assert.equal(
          (await login(configuration.username, `${configuration.password}incorrect`)).status,
          401,
        );
        assert.equal((await login(`unknown-${runId}`, configuration.password)).status, 401);
      },
    );
    await t.test("configured credentials create a signed revocable JWT cookie", async () => {
      const response = await login(configuration.username.toUpperCase(), configuration.password);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
      const header = response.headers.get("set-cookie") || "";
      assert.ok(/; HttpOnly/i.test(header));
      assert.ok(/; SameSite=Strict/i.test(header));
      assert.ok(/; Path=\//i.test(header));
      assert.ok(/; Max-Age=28800/i.test(header));
      assert.equal(/; Secure/i.test(header), process.env.ADMIN_TEST_SECURE === "true");
      cookie = header.split(";")[0];
      const token = cookie.slice(cookie.indexOf("=") + 1);
      const claims = decodeJwt(token);
      assert.equal(decodeProtectedHeader(token).alg, "HS256");
      assert.equal(claims.sub, String(beforeAdmin._id));
      assert.equal(claims.iss, process.env.JWT_ISSUER || "red-rose-academy");
      assert.equal(claims.aud, process.env.JWT_AUDIENCE || "red-rose-admin");
      assert.equal(claims.exp - claims.iat, 28800);
      const session = await db
        .collection("adminSessions")
        .findOne({ tokenHash: digest(claims.jti), sessionType: "jwt-v1" });
      assert.ok(session);
      assert.ok(
        !JSON.stringify(session).includes(token),
        "The database stores the token hash only.",
      );
      for (const route of ["content", "documents", "sections/slides", "sections/events"]) {
        const protectedResponse = await request(`/api/admin/${route}`, {
          headers: { Cookie: cookie },
        });
        assert.equal(protectedResponse.status, 200, route);
        const body = await protectedResponse.text();
        assert.ok(
          !body.includes(configuration.password) && !body.includes(token),
          "No authentication secrets appear in API bodies.",
        );
      }
      for (const route of [
        "/admin/dashboard",
        "/admin/editor",
        "/admin/sections",
        "/admin/background",
        "/admin/documents",
        "/admin/circulars",
      ]) {
        const response = await request(route, { headers: { Cookie: cookie } });
        assert.equal(response.status, 200, route);
        const html = await response.text();
        assert.ok(!html.includes(configuration.password) && !html.includes(token));
      }
      assert.equal(
        (
          await request("/api/admin/content", {
            method: "PUT",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: "{}",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/api/admin/media", {
            method: "POST",
            headers: { Cookie: cookie },
            body: new FormData(),
          })
        ).status,
        400,
      );
    });
    await t.test("authenticated media uploads retain their MIME type and exact bytes", async () => {
      const bytes = await readFile("public/images/RedRoseLogoBBG.png");
      const form = new FormData();
      form.append("file", new File([bytes], `integration-${runId}.png`, { type: "image/png" }));
      const response = await request("/api/admin/media", {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      });
      assert.equal(response.status, 201);
      const media = await response.json();
      assert.ok(/^[a-f0-9]{24}$/.test(media.id));
      try {
        const download = await request(media.url);
        assert.equal(download.status, 200);
        assert.equal(download.headers.get("content-type"), "image/png");
        assert.ok(Buffer.from(await download.arrayBuffer()).equals(bytes));
      } finally {
        await new GridFSBucket(db, { bucketName: "media" }).delete(new ObjectId(media.id));
      }
      const invalid = new FormData();
      invalid.append("file", new File(["invalid"], "invalid.png", { type: "image/png" }));
      assert.equal(
        (
          await request("/api/admin/media", {
            method: "POST",
            headers: { Cookie: cookie },
            body: invalid,
          })
        ).status,
        400,
      );
    });
    await t.test("logout revokes the server session and prevents cookie replay", async () => {
      const response = await request("/api/admin/logout", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      assert.equal(response.status, 200);
      assert.ok(/Max-Age=0/i.test(response.headers.get("set-cookie") || ""));
      assert.equal(
        (await request("/api/admin/content", { headers: { Cookie: cookie } })).status,
        401,
      );
    });
    await t.test("expired sessions are rejected before TTL cleanup", async () => {
      const response = await login(configuration.username, configuration.password);
      assert.equal(response.status, 200);
      const expiredCookie = response.headers.get("set-cookie").split(";")[0];
      const token = expiredCookie.slice(expiredCookie.indexOf("=") + 1);
      await db
        .collection("adminSessions")
        .updateOne(
          { tokenHash: digest(decodeJwt(token).jti) },
          { $set: { expiresAt: new Date(0) } },
        );
      assert.equal(
        (await request("/api/admin/content", { headers: { Cookie: expiredCookie } })).status,
        401,
      );
    });
    await t.test("account throttling is atomic and resists rotating client IPs", async () => {
      const username = `limit-${runId}`;
      const responses = await Promise.all(
        Array.from({ length: 16 }, (_, i) => login(username, "incorrect", `198.51.100.${i + 1}`)),
      );
      assert.equal(responses.filter((response) => response.status === 401).length, 8);
      assert.equal(responses.filter((response) => response.status === 429).length, 8);
      assert.ok(
        responses
          .filter((response) => response.status === 429)
          .every((response) => response.headers.get("retry-after") === "900"),
      );
    });
    await t.test("IP throttling resists rotating usernames", async () => {
      if (process.env.TRUST_PROXY !== "true") return;
      const responses = await Promise.all(
        Array.from({ length: 41 }, (_, i) =>
          login(`ip-${runId}-${i}`, "incorrect", "203.0.113.100"),
        ),
      );
      assert.equal(responses.filter((response) => response.status === 401).length, 40);
      assert.equal(responses.filter((response) => response.status === 429).length, 1);
    });
    await t.test(
      "browser JavaScript contains no configured password or live session token",
      async () => {
        async function scan(directory) {
          for (const entry of await readdir(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) await scan(file);
            else if (/\.(js|map)$/.test(file)) {
              const source = await readFile(file, "utf8");
              for (const value of [
                configuration.password,
                process.env.JWT_SECRET,
                process.env.PROXY_SHARED_SECRET,
              ].filter(Boolean))
                assert.ok(
                  !source.includes(value),
                  "A browser bundle exposed private configuration.",
                );
              if (cookie)
                assert.ok(
                  !source.includes(cookie.slice(cookie.indexOf("=") + 1)),
                  "A browser bundle exposed a session token.",
                );
            }
          }
        }
        await scan(process.env.ADMIN_TEST_STATIC_DIR || ".next/dev/static");
        assert.deepEqual(
          await contentSnapshot(db),
          beforeContent,
          "Integration checks preserve all school content.",
        );
      },
    );
  } finally {
    // Only delete exact test-created records and this run's dedicated test database.
    await db.collection("loginLimits").deleteMany({ _id: { $in: [...rateKeys] } });
    await db.collection("adminSessions").deleteMany({ tokenHash: { $in: [...sessionHashes] } });
    if (testDatabaseName === `red_rose_admin_test_${runId}`) await isolated.dropDatabase();
    await client.close();
  }
});
