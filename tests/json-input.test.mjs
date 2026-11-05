import { test } from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../src/server/http/json.mjs";
const request = (body, headers = {}) =>
  new Request("http://localhost/test", { method: "POST", body, headers });
test("JSON bodies are bounded using both declared and actual byte lengths", async () => {
  assert.deepEqual(await readJsonBody(request('{"ok":true}'), 20), { ok: true });
  await assert.rejects(readJsonBody(request('"oversized"'), 4), (error) => error.status === 413);
  await assert.rejects(
    readJsonBody(request("{}", { "content-length": "1000000" }), 20),
    (error) => error.status === 413,
  );
  await assert.rejects(
    readJsonBody(request("not JSON")),
    (error) => error.status === 400 && !error.message.includes("not JSON"),
  );
});
