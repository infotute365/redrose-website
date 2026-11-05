import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const npmCli = process.env.npm_execpath || process.argv[2];
if (!npmCli)
  throw new Error("Invoke through npm run verify:production, or supply npm-cli.js as an argument.");
await mkdir(".audit", { recursive: true });
const environment = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`,
};
const results = { node: process.version, startedAt: new Date().toISOString(), checks: [] };
async function check(label, args, npm = true) {
  console.log(`\n${label}`);
  const child = spawn(process.execPath, npm ? [npmCli, ...args] : args, {
    env: environment,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (bytes) => {
    process.stdout.write(bytes);
    output += bytes;
  });
  child.stderr.on("data", (bytes) => {
    process.stderr.write(bytes);
    output += bytes;
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  results.checks.push({ command: label, exitCode: code });
  await writeFile(
    path.join(".audit", `${results.checks.length.toString().padStart(2, "0")}-verification.log`),
    output,
    { mode: 0o600 },
  );
  await writeFile(".audit/final-checks.json", JSON.stringify(results, null, 2), { mode: 0o600 });
  if (code !== 0) throw new Error(`${label} failed. Correct the issue before continuing.`);
}
try {
  await check("npm ci", ["ci"]);
  await check("format inventory before", ["scripts/format-inventory.mjs", "before"], false);
  await check("npm run format", ["run", "format"]);
  await check("format inventory after", ["scripts/format-inventory.mjs", "after"], false);
  await check("npm run format:check", ["run", "format:check"]);
  await check("npx tsc --noEmit", ["exec", "--", "tsc", "--noEmit"]);
  await check("npm run lint", ["run", "lint"]);
  await check("npm run test:security", ["run", "test:security"]);
  await check("npm run build", ["run", "build"]);
  await check("npm audit --omit=dev", ["audit", "--omit=dev"]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
