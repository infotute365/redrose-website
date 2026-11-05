import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getFileInfo } from "prettier";

const mode = process.argv[2];
const destination = ".audit/format-before.json";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function supportedFiles(directory = ".") {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", ".backups", ".audit", ".private"].includes(item.name))
      continue;
    const filename = path.join(directory, item.name).replaceAll("\\", "/");
    if (item.isDirectory()) files.push(...(await supportedFiles(filename)));
    else {
      const info = await getFileInfo(filename, { ignorePath: ".prettierignore" });
      if (!info.ignored && info.inferredParser) files.push(filename.replace(/^\.\//, ""));
    }
  }
  return files;
}
if (mode === "before") {
  await mkdir(".audit", { recursive: true });
  const inventory = {};
  for (const file of await supportedFiles()) inventory[file] = digest(await readFile(file));
  await writeFile(destination, JSON.stringify(inventory));
  console.log(`Captured ${Object.keys(inventory).length} supported files before formatting.`);
} else if (mode === "after") {
  const inventory = JSON.parse(await readFile(destination, "utf8"));
  const changed = [];
  for (const [file, before] of Object.entries(inventory))
    if (before !== digest(await readFile(file))) changed.push(file);
  await writeFile(
    ".audit/format-result.json",
    JSON.stringify(
      { checked: Object.keys(inventory).length, changed: changed.length, files: changed },
      null,
      2,
    ),
  );
  console.log(
    `Formatting inventory: ${Object.keys(inventory).length} checked; ${changed.length} changed.`,
  );
} else {
  console.error("Use before or after.");
  process.exitCode = 1;
}
