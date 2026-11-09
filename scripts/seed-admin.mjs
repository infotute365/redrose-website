import nextEnv from "@next/env";
import mongoose from "mongoose";
import connectDB from "../src/server/config/database.js";
import { provisionAdmin } from "../src/server/util/provisionAdmin.js";
import {
  normalizeAdminEmail,
  normalizeAdminName,
  validateStrongPassword,
} from "../src/server/util/validation.mjs";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const args = process.argv.slice(2);
const reset = args.includes("--reset-password") || args.includes("--repair-password");
const safeErrors = new Set([
  "Unsupported seed option",
  "ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD are required for provisioning",
  "Invalid email address",
  "Admin password must be exactly 8 characters with uppercase, lowercase, a number and a symbol",
  "Admin name must be 1 to 12 characters (letters, numbers, spaces, _ . -)",
  "MONGODB_URI is not configured",
  "Existing account is not an administrator",
  "Refusing to reset a disabled account; review its status separately",
  "Cannot reset an account that does not exist",
  "An administrator already exists; initial provisioning cannot add another account",
]);

function safeFailureMessage(error) {
  if (safeErrors.has(error?.message)) return error.message;
  if (error?.code === 18)
    return "MongoDB authentication failed. Check the database user, password and authSource privately.";
  if (error?.code === 13)
    return "MongoDB permission denied. Check the configured database user permissions.";
  if (error?.name === "MongoParseError")
    return "MONGODB_URI has an invalid format. Check its syntax privately.";
  if (
    ["MongooseServerSelectionError", "MongoServerSelectionError", "MongoNetworkError"].includes(
      error?.name,
    )
  )
    return "Cannot connect to MongoDB. Check the service, configured address, network access and database authentication.";
  return "Check the database and provisioning safeguards in docs/RED_ROSE_ADMIN_SETUP.md.";
}
async function main() {
  if (args.some((arg) => !["--reset-password", "--repair-password"].includes(arg)))
    throw new Error("Unsupported seed option");
  const email = process.env.ADMIN_INITIAL_EMAIL;
  const name = process.env.ADMIN_INITIAL_NAME || "Rose Admin";
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password)
    throw new Error("ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD are required for provisioning");
  // Catch configuration mistakes before opening a database connection.
  normalizeAdminEmail(email);
  normalizeAdminName(name);
  validateStrongPassword(password);
  await connectDB();
  console.log(await provisionAdmin({ email, name, password, reset }));
}
main()
  .catch((error) => {
    // Only fixed, known messages are safe to print. Driver messages can contain
    // connection strings; never echo arbitrary errors, credentials or stack traces.
    console.error(`Administrator provisioning failed: ${safeFailureMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      console.error("Could not close the provisioning database connection.");
      process.exitCode = 1;
    }
  });
