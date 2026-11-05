import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);

/** @param {string} password */
export async function hashAdminPassword(password) {
  const passwordSalt = randomBytes(16).toString("hex");
  const key = /** @type {Buffer} */ (await deriveKey(password, passwordSalt, 64));
  return { passwordSalt, passwordHash: key.toString("hex") };
}

/**
 * Keep the existing scrypt format; derive a dummy key for unknown users too.
 * @param {string} password
 * @param {{passwordSalt: string, passwordHash: string} | null} credential
 */
export async function verifyAdminPassword(password, credential) {
  const valid = Boolean(
    credential &&
    /^[a-f0-9]{32}$/.test(credential.passwordSalt) &&
    /^[a-f0-9]{128}$/.test(credential.passwordHash),
  );
  const salt = valid && credential ? credential.passwordSalt : "0".repeat(32);
  const supplied = /** @type {Buffer} */ (await deriveKey(password, salt, 64));
  const stored =
    valid && credential ? Buffer.from(credential.passwordHash, "hex") : Buffer.alloc(64);
  return timingSafeEqual(supplied, stored) && valid;
}
