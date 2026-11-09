import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";

let source = await readFile(".env.local", "utf8");
const existing = parseEnv(source);
const additions = {};
for (const [name, bytes] of [
  ["JWT_SECRET", 64],
  ["PROXY_SHARED_SECRET", 48],
]) {
  if (existing[name]) {
    if (name === "JWT_SECRET" && Buffer.byteLength(existing[name]) < 32)
      throw new Error("JWT_SECRET must contain at least 32 bytes");
    if (name === "PROXY_SHARED_SECRET" && Buffer.byteLength(existing[name]) < 32)
      throw new Error("PROXY_SHARED_SECRET must contain at least 32 bytes");
  } else additions[name] = randomBytes(bytes).toString("base64url");
}
for (const [name, value] of Object.entries({
  TRUST_PROXY: "false",
})) {
  if (!existing[name]) additions[name] = value;
}
if (Object.keys(additions).length) {
  source = source.replace(
    /^#.*(?:no signing secret|no JWT.*secret|no JWT\/session signing secret).*\r?\n/gim,
    "",
  );
  await writeFile(
    ".env.local",
    `${source.trimEnd()}\n\n# Private JWT authentication and optional trusted reverse proxy.\n${Object.entries(
      additions,
    )
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`,
    { mode: 0o600 },
  );
}
console.log(
  "Private JWT/proxy configuration is present. Existing credentials were preserved; no secret values were displayed.",
);
