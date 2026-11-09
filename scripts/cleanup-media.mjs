import nextEnv from "@next/env";
import mongoose from "mongoose";
import { cleanupOrphanMedia } from "../src/server/util/media-retention.mjs";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--dry-run")) {
  console.error("Unsupported cleanup option. Use --dry-run for an inspection.");
  process.exit(1);
}
try {
  const results = await cleanupOrphanMedia({ dryRun: args.includes("--dry-run") });
  console.log(`${args.includes("--dry-run") ? "DRY RUN" : "CLEANUP"}: ${JSON.stringify(results)}`);
} catch {
  console.error(
    "Media cleanup failed; no unverified deletion will be attempted. Check MongoDB connection and permissions.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {
    process.exitCode = 1;
  });
}
