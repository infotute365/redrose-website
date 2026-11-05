import { createHash } from "node:crypto";
import { ADMIN_SESSION_SECONDS } from "../config/auth.mjs";
import { signAdminJwt, verifyAdminJwt } from "./jwt.mjs";

export const sessionIdentifierHash = (identifier) =>
  createHash("sha256").update(identifier).digest("hex");
export async function createJwtSession(db, admin) {
  if (!admin?.active || admin.role !== "admin" || admin._id === undefined)
    throw new Error("An active administrator is required.");
  const signed = await signAdminJwt(String(admin._id), admin.sessionVersion);
  const sessions = db.collection("adminSessions");
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.insertOne({
    sessionType: "jwt-v1",
    tokenHash: sessionIdentifierHash(signed.jti),
    adminId: admin._id,
    adminSubject: String(admin._id),
    usernameNormalized: admin.usernameNormalized,
    sessionVersion: admin.sessionVersion,
    createdAt: new Date(signed.issuedAt * 1000),
    expiresAt: new Date(signed.expiresAt * 1000),
  });
  return { value: signed.token, maxAge: ADMIN_SESSION_SECONDS };
}
export async function validateJwtSession(value, database) {
  const claims = await verifyAdminJwt(value);
  if (!claims) return "unauthorized";
  const db = typeof database === "function" ? await database() : database;
  const session = await db.collection("adminSessions").findOne({
    sessionType: "jwt-v1",
    tokenHash: sessionIdentifierHash(claims.jti),
    adminSubject: claims.sub,
    sessionVersion: claims.sessionVersion,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!session || String(session.adminId) !== claims.sub) return "unauthorized";
  const admin = await db.collection("admins").findOne({ _id: session.adminId });
  if (!admin?.active || admin.sessionVersion !== claims.sessionVersion) return "unauthorized";
  if (admin.role !== "admin" || claims.role !== "admin") return "forbidden";
  return "authorized";
}
export async function revokeJwtSession(value, database) {
  const claims = await verifyAdminJwt(value);
  if (!claims) return false;
  const db = typeof database === "function" ? await database() : database;
  await db.collection("adminSessions").updateOne(
    {
      sessionType: "jwt-v1",
      tokenHash: sessionIdentifierHash(claims.jti),
      adminSubject: claims.sub,
    },
    { $set: { revokedAt: new Date() } },
  );
  return true;
}
