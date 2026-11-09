import nextEnv from "@next/env";
import {
  normalizeAdminEmail,
  normalizeAdminName,
  validateStrongPassword,
} from "../src/server/util/validation.mjs";
import { readDatabaseConfiguration } from "./lib/mongo-client.mjs";
import { jwtSecret, readAppOrigin } from "../src/server/config/auth.js";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const checks = [
  ["MongoDB URI and database name", () => readDatabaseConfiguration()],
  ["Admin email", () => normalizeAdminEmail(process.env.ADMIN_INITIAL_EMAIL)],
  ["Admin name (max 12)", () => normalizeAdminName(process.env.ADMIN_INITIAL_NAME || "Rose Admin")],
  ["Admin password policy", () => validateStrongPassword(process.env.ADMIN_INITIAL_PASSWORD)],
  ["JWT private secret", () => jwtSecret()],
  ["Website origin", () => readAppOrigin()],
];
let failed = false;
for (const [label, validate] of checks) {
  try {
    validate();
    console.log(`PASS: ${label}`);
  } catch {
    failed = true;
    // Print fixed, non-secret-safe diagnostics. Never show input values.
    const message =
      label === "MongoDB URI and database name"
        ? "Set MONGODB_URI with the /red_rose_academy database name; do not configure a conflicting MONGODB_DATABASE."
        : label === "Admin email"
          ? "Set ADMIN_INITIAL_EMAIL to a valid private admin email in .env.local."
          : label === "Admin name (max 12)"
            ? "Set ADMIN_INITIAL_NAME to 1-12 characters."
            : label === "Admin password policy"
              ? "ADMIN_INITIAL_PASSWORD must have exactly 8 printable ASCII characters including uppercase, lowercase, number and symbol."
              : label === "JWT private secret"
                ? "Set JWT_SECRET to at least 32 bytes of random private text."
                : "Set APP_ORIGIN exactly to your website origin, including http://localhost:3000 for local development.";
    console.error(`FAIL: ${label}: ${message}`);
  }
}
if (failed) process.exitCode = 1;
else console.log("Seed configuration looks valid. MongoDB reachability has NOT been checked.");
