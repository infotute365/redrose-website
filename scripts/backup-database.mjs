import { BSON, MongoClient } from "mongodb";
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(
  process.env.BACKUP_ROOT || ".backups",
  `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`,
);
let client;
try {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DATABASE) throw new Error();
  await mkdir(path.join(directory, "database"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(directory, "source"), { mode: 0o700 });
  for (const item of [
    "src",
    "scripts",
    "tests",
    "components",
    "lib",
    "data",
    "public",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    ".env.example",
    ".gitignore",
    "README.md",
  ]) {
    await cp(item, path.join(directory, "source", item), { recursive: true });
  }
  const environmentFile = process.env.BACKUP_ENV_FILE || ".env.local";
  await cp(environmentFile, path.join(directory, "source", "private.env"));
  client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const manifest = {
    version: 1,
    database: db.databaseName,
    createdAt: new Date().toISOString(),
    collections: [],
  };
  for (const collection of await db.listCollections().toArray()) {
    if (collection.type !== "collection" || !/^[\w.-]+$/.test(collection.name)) throw new Error();
    const chunks = [];
    let count = 0;
    for await (const document of db.collection(collection.name).find()) {
      chunks.push(BSON.serialize(document));
      count++;
    }
    const bytes = Buffer.concat(chunks);
    const filename = `${collection.name}.bson`;
    await writeFile(path.join(directory, "database", filename), bytes, { mode: 0o600 });
    const metadata = {
      options: collection.options,
      indexes: await db.collection(collection.name).listIndexes().toArray(),
    };
    await writeFile(
      path.join(directory, "database", `${collection.name}.metadata.json`),
      BSON.EJSON.stringify(metadata),
      { mode: 0o600 },
    );
    const persisted = await readFile(path.join(directory, "database", filename));
    let offset = 0;
    let verifiedCount = 0;
    while (offset < persisted.length) {
      const length = persisted.readInt32LE(offset);
      if (length < 5 || offset + length > persisted.length) throw new Error();
      BSON.deserialize(persisted.subarray(offset, offset + length));
      verifiedCount++;
      offset += length;
    }
    if (verifiedCount !== count) throw new Error();
    manifest.collections.push({
      name: collection.name,
      count,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });
  console.log(
    `Private backup created and BSON records verified: ${path.relative(process.cwd(), directory)}`,
  );
  console.log(
    `Backed up ${manifest.collections.length} collections and the pre-migration source/configuration. Keep this directory private.`,
  );
} catch {
  console.error(
    "Backup failed. No authentication migration should run until a complete database/source backup is verified.",
  );
  process.exitCode = 1;
} finally {
  await client?.close();
}
