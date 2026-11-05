import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  createHash,
  createPrivateKey,
  randomBytes,
  randomUUID,
  X509Certificate,
} from "node:crypto";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import https from "node:https";
import { MongoClient } from "mongodb";
import { seedAdmin } from "../scripts/lib/admin-seed.mjs";
import { runDashboardBrowserChecks } from "./helpers/dashboard-browser.mjs";

const identifier = randomUUID().replaceAll("-", "");
const databaseName = `red_rose_proxy_test_${identifier}`;
const directory = path.resolve(".audit", `proxy-${identifier}`);
const nginx =
  process.env.ADMIN_TEST_NGINX_PATH ||
  (process.platform === "win32"
    ? path.resolve(".audit/tools/nginx-1.31.8/nginx.exe")
    : "/usr/sbin/nginx");
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function freePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}
async function run(executable, args) {
  const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.resume();
  child.stderr.resume();
  const [code] = await once(child, "exit");
  assert.equal(code, 0, "A local test helper failed.");
}
await test("production HTTPS, trusted Nginx proxy and dependency-failure behavior", async (t) => {
  try {
    await access(nginx);
  } catch {
    return t.skip("Set ADMIN_TEST_NGINX_PATH to a local Nginx executable.");
  }
  await mkdir(path.join(directory, "logs"), { recursive: true });
  await mkdir(path.join(directory, "temp"), { recursive: true });
  process.umask(0o077);
  await mkdir(".audit/tls", { recursive: true, mode: 0o700 });
  const keyPath = path.resolve(".audit/tls/private-key.pem");
  if (process.platform === "win32")
    await run("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "tests/helpers/create-test-certificate.ps1",
    ]);
  else
    await run("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-sha256",
      "-nodes",
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
      "-keyout",
      keyPath,
      "-out",
      ".audit/tls/certificate.pem",
    ]);
  const cert = await readFile(".audit/tls/certificate.pem");
  const jwkPath = path.resolve(".audit/tls/private-key.jwk");
  if (process.platform === "win32") {
    await writeFile(
      keyPath,
      createPrivateKey({ key: JSON.parse(await readFile(jwkPath, "utf8")), format: "jwk" }).export({
        type: "pkcs8",
        format: "pem",
      }),
      { mode: 0o600 },
    );
    await unlink(jwkPath);
  }
  const certificateSpki = createHash("sha256")
    .update(new X509Certificate(cert).publicKey.export({ type: "spki", format: "der" }))
    .digest("base64");
  const agent = new https.Agent({ ca: cert });
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const upstreamPort = await freePort();
  const tlsPort = await freePort();
  const origin = `https://127.0.0.1:${tlsPort}`;
  const username = "proxy-verification";
  const password = randomBytes(32).toString("base64url");
  const environment = {
    ...process.env,
    NODE_ENV: "production",
    APP_ORIGIN: origin,
    MONGODB_DATABASE: databaseName,
    JWT_SECRET: randomBytes(64).toString("base64url"),
    TRUST_PROXY: "true",
    PROXY_SHARED_SECRET: randomBytes(48).toString("base64url"),
  };
  delete environment.NODE_TEST_CONTEXT;
  let app;
  let proxy;
  let cookie;
  const prefix = `${directory.replaceAll("\\", "/")}/`;
  async function startApp() {
    app = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(upstreamPort),
      ],
      { env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    app.stdout.resume();
    app.stderr.resume();
    for (let i = 0; i < 100; i++) {
      if (app.exitCode !== null) throw new Error("The test application exited early.");
      try {
        if ((await fetch(`http://127.0.0.1:${upstreamPort}/admin/login`)).status === 200) return;
      } catch {}
      await pause(100);
    }
    throw new Error("Test application startup timed out.");
  }
  async function stopApp() {
    if (app && app.exitCode === null) {
      const stopped = once(app, "exit");
      app.kill();
      await stopped;
    }
  }
  function request(route, { method = "GET", headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
      const outgoing = https.request(
        new URL(route, origin),
        {
          agent,
          method,
          headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...headers },
          timeout: 30000,
        },
        (incoming) => {
          const chunks = [];
          incoming.on("data", (chunk) => chunks.push(chunk));
          incoming.on("end", () =>
            resolve({
              status: incoming.statusCode,
              headers: incoming.headers,
              body: Buffer.concat(chunks),
            }),
          );
        },
      );
      outgoing.on("error", reject);
      outgoing.on("timeout", () => outgoing.destroy(new Error("HTTPS test timeout")));
      outgoing.end(body);
    });
  }
  try {
    await client.connect();
    const db = client.db(databaseName);
    const real = client.db(process.env.MONGODB_DATABASE);
    for (const { name } of await real.listCollections().toArray()) {
      if (["admins", "adminSessions", "loginLimits"].includes(name)) continue;
      const rows = await real.collection(name).find().toArray();
      if (rows.length) await db.collection(name).insertMany(rows);
    }
    await seedAdmin(db, { username, password });
    await startApp();
    const configuration = `worker_processes 1;
pid logs/nginx.pid;
error_log logs/error.log warn;
events { worker_connections 128; }
http {
  access_log off;
  server {
    listen 127.0.0.1:${tlsPort} ssl;
    server_name localhost 127.0.0.1;
    ssl_certificate "${path.resolve(".audit/tls/certificate.pem").replaceAll("\\", "/")}";
    ssl_certificate_key "${keyPath.replaceAll("\\", "/")}";
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 210m;
    location / {
      proxy_pass http://127.0.0.1:${upstreamPort};
      proxy_http_version 1.1;
      proxy_set_header Host $http_host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Red-Rose-Proxy-Secret "${environment.PROXY_SHARED_SECRET}";
      proxy_buffering off;
      proxy_read_timeout 60s;
    }
  }
}
`;
    await writeFile(path.join(directory, "nginx.conf"), configuration, { mode: 0o600 });
    await run(nginx, ["-p", prefix, "-c", "nginx.conf", "-t"]);
    proxy = spawn(nginx, ["-p", prefix, "-c", "nginx.conf", "-g", "daemon off;"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    proxy.stdout.resume();
    proxy.stderr.resume();
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await request("/admin/login")).status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await pause(100);
    }
    assert.ok(ready, "Local Nginx HTTPS startup failed.");
    await t.test(
      "HTTPS cookies, origin checks and proxy overwriting prevent header spoofing and direct bypass",
      async () => {
        const login = await request("/api/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Real-IP": "203.0.113.1",
            "X-Forwarded-For": "203.0.113.1",
            "X-Red-Rose-Proxy-Secret": "attacker-supplied",
          },
          body: JSON.stringify({ username, password }),
        });
        assert.equal(login.status, 200);
        assert.deepEqual(JSON.parse(login.body), { ok: true });
        const header = login.headers["set-cookie"][0];
        assert.ok(/Secure/i.test(header), "The HTTPS cookie must be Secure.");
        assert.ok(/HttpOnly/i.test(header), "The HTTPS cookie must be HttpOnly.");
        assert.ok(/SameSite=Strict/i.test(header), "The HTTPS cookie must use SameSite Strict.");
        cookie = header.split(";")[0];
        assert.equal((await request("/api/admin/content")).status, 200);
        assert.equal(
          (
            await fetch(`http://127.0.0.1:${upstreamPort}/api/admin/content`, {
              headers: { Cookie: cookie, "x-real-ip": "127.0.0.1" },
            })
          ).status,
          403,
        );
        const ipKey = `ip:${createHash("sha256").update("127.0.0.1").digest("hex")}`;
        assert.ok(await db.collection("loginLimits").findOne({ _id: ipKey }));
        assert.equal(
          (
            await request("/api/admin/logout", {
              method: "POST",
              headers: { Origin: "https://attacker.example" },
            })
          ).status,
          403,
        );
        const page = await request("/admin/dashboard");
        assert.equal(page.status, 200);
        assert.ok(!page.headers["content-security-policy"].includes("unsafe-eval"));
        assert.equal(page.headers["content-security-policy"].split("default-src").length, 2);
        assert.match(page.headers["cache-control"], /private.*no-store/);
      },
    );
    await t.test("real browser login and logout work through TLS and Nginx", async (t) => {
      const result = await runDashboardBrowserChecks({
        origin,
        username,
        password,
        cache: path.join(directory, "browser"),
        certificateSpki,
        smokeOnly: true,
        report: (message) => console.log(message),
      });
      if (result.skipped) t.skip(result.skipped);
    });
    await t.test("GridFS supports streaming byte ranges over HTTPS", async () => {
      const file = await db.collection("media.files").findOne();
      if (!file) return;
      const route = `/api/media/${file._id}`;
      const response = await request(route, { headers: { Range: "bytes=0-31" } });
      assert.equal(response.status, 206);
      assert.equal(response.body.length, 32);
      assert.match(response.headers["content-range"], /^bytes 0-31\//);
      assert.equal(
        (await request(route, { headers: { Range: "bytes=999999999999-" } })).status,
        416,
      );
      const suffix = await request(route, { headers: { Range: "bytes=-16" } });
      assert.equal(suffix.status, 206);
      assert.equal(suffix.body.length, 16);
    });
    await t.test(
      "database outages fail closed without leaking credentials and logout can be retried",
      async () => {
        await stopApp();
        environment.MONGODB_URI = `mongodb://127.0.0.1:${await freePort()}`;
        await startApp();
        const responses = await Promise.all([
          request("/api/admin/content"),
          request("/api/admin/logout", { method: "POST" }),
          request("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          }),
        ]);
        for (const response of responses) {
          assert.equal(response.status, 503);
          assert.ok(!response.body.includes(password) && !response.body.includes("mongodb://"));
        }
        assert.ok(
          !responses[1].headers["set-cookie"],
          "Failed revocation must retain the cookie for retry.",
        );
        assert.equal(
          (
            await request("/api/admin/content", {
              headers: { Cookie: "red-rose-admin=invalid.jwt.token" },
            })
          ).status,
          401,
        );
      },
    );
  } finally {
    agent.destroy();
    if (proxy?.exitCode === null) {
      try {
        await run(nginx, ["-p", prefix, "-c", "nginx.conf", "-s", "quit"]);
      } catch {
        /* Always continue scoped cleanup. */
      }
      await Promise.race([once(proxy, "exit"), pause(3000)]);
      if (proxy.exitCode === null) {
        if (process.platform === "win32")
          await run("taskkill", ["/PID", String(proxy.pid), "/T", "/F"]);
        else proxy.kill();
      }
    }
    await stopApp();
    await client.db(databaseName).dropDatabase();
    await client.close();
    // Only this generated configuration contains the test proxy secret.
    await unlink(path.join(directory, "nginx.conf")).catch(() => {});
    await unlink(keyPath).catch(() => {});
  }
});
