import AuthModel from "../model/auth.model.js";
import { normalizeAdminEmail, normalizeAdminName, validateStrongPassword } from "./validation.mjs";

export async function provisionAdmin({
  email,
  name = "Rose Admin",
  password,
  reset = false,
  model = AuthModel,
}) {
  const normalizedEmail = normalizeAdminEmail(email);
  const fullname = normalizeAdminName(name);
  validateStrongPassword(password);
  await model.init(); // Ensure the unique email index exists before concurrent seeds.
  const existing = await model.findOne({ email: normalizedEmail });
  if (existing) {
    if (!["admin", "super-admin"].includes(existing.role))
      throw new Error("Existing account is not an administrator");
    if (!reset) return "Administrator already exists; no changes were made.";
    if (!existing.isActive)
      throw new Error("Refusing to reset a disabled account; review its status separately");
    existing.password = password; // The existing model save hook hashes this value.
    existing.sessionVersion = (existing.sessionVersion || 0) + 1;
    existing.refreshToken = null;
    existing.refreshTokenHistory = [];
    existing.expiry = null;
    await existing.save();
    return "Administrator password reset; all previous sessions revoked.";
  }
  if (reset) throw new Error("Cannot reset an account that does not exist");
  if (await model.exists({ role: { $in: ["admin", "super-admin"] } }))
    throw new Error(
      "An administrator already exists; initial provisioning cannot add another account",
    );
  try {
    await model.create({
      fullname,
      email: normalizedEmail,
      password,
      role: "super-admin",
      isActive: true,
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    return "Administrator already exists; no changes were made.";
  }
  return "Initial administrator account created successfully.";
}
