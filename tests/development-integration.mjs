import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import { MongoClient } from "mongodb";
import { seedAdmin } from "../scripts/lib/admin-seed.mjs";
import { runDashboardBrowserChecks } from "./helpers/dashboard-browser.mjs";

await test("development React debugging and hydration work with the development-only eval allowance", async (t) => {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const databaseName = `red_rose_dev_test_${randomUUID().replaceAll("-", "")}`;
  const username = "development-verification";
  const password = randomBytes(32).toString("base64url");
  const proxySecret = randomBytes(48).toString("base64url");
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  let server;
  try {
    await client.connect();
    const real = client.db(process.env.MONGODB_DATABASE);
    const db = client.db(databaseName);
    for (const { name } of await real.listCollections().toArray()) {
      if (["admins", "adminSessions", "loginLimits"].includes(name)) continue;
      const rows = await real.collection(name).find().toArray();
      if (rows.length) await db.collection(name).insertMany(rows);
    }
    await seedAdmin(db, { username, password });
    const environment = {
      ...process.env,
      NODE_ENV: "development",
      APP_ORIGIN: origin,
      MONGODB_DATABASE: databaseName,
      JWT_SECRET: randomBytes(64).toString("base64url"),
      TRUST_PROXY: "true",
      PROXY_SHARED_SECRET: proxySecret,
    };
    delete environment.NODE_TEST_CONTEXT;
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
      { env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.resume();
    server.stderr.resume();
    let response;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null)
        throw new Error(
          "The isolated development server exited early; another dev server may own this project's lock.",
        );
      try {
        response = await fetch(`${origin}/admin/login`);
        if (response.status === 200) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(response?.status, 200);
    assert.ok(response.headers.get("content-security-policy").includes("'unsafe-eval'"));
    const result = await runDashboardBrowserChecks({
      origin,
      username,
      password,
      proxySecret,
      cache: path.resolve(".audit/development-browser"),
      smokeOnly: true,
      development: true,
      report: (message) => console.log(message),
    });
    if (result.skipped) t.skip(result.skipped);
  } finally {
    if (server?.exitCode === null) {
      if (process.platform === "win32") {
        // next dev starts a child server; terminate only this test's process tree.
        const stop = spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
        await once(stop, "exit");
      } else {
        server.kill();
        await once(server, "exit");
      }
    }
    await client.db(databaseName).dropDatabase();
    await client.close();
  }
});
