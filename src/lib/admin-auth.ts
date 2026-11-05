import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { WithId } from "mongodb";
import { getDatabase } from "@/src/server/config/database";
import { readDatabaseConfiguration } from "@/src/server/config/mongo-client.mjs";
import {
  ADMIN_COOKIE,
  isTrustedProxyRequest,
  readAppOrigin,
  readAuthConfiguration,
  trustedClientIp,
} from "@/src/server/config/auth.mjs";
import {
  createJwtSession,
  revokeJwtSession,
  validateJwtSession,
} from "@/src/server/auth/sessions.mjs";
import { verifyAdminPassword } from "@/src/server/auth/password.mjs";
import { findActiveAdmin, type AdminCredential } from "./admin-db";

export { ADMIN_COOKIE, trustedClientIp };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function isAdminConfigured() {
  try {
    readDatabaseConfiguration();
    readAuthConfiguration();
    return true;
  } catch {
    return false;
  }
}
export async function credentialsMatch(username: string, password: string) {
  if (!username || username.length > 90 || !password || password.length > 1024) return null;
  const admin = await findActiveAdmin(username);
  return (await verifyAdminPassword(password, admin)) ? admin : null;
}
export async function createAdminSession(admin: WithId<AdminCredential>) {
  return createJwtSession(await getDatabase(), admin);
}
export async function isAdminSessionValid(value?: string): Promise<boolean> {
  if (!value) return false;
  return (await validateJwtSession(value, getDatabase)) === "authorized";
}
export async function endAdminSession(value?: string) {
  return value ? revokeJwtSession(value, getDatabase) : true;
}
async function adminAccessState() {
  if (!isTrustedProxyRequest(await headers())) return "forbidden";
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return value ? validateJwtSession(value, getDatabase) : "unauthorized";
}
export async function getAdminAccess() {
  return (await adminAccessState()) === "authorized";
}
export function checkMutationOrigin(request: Request) {
  return (
    isTrustedProxyRequest(request.headers) && request.headers.get("origin") === readAppOrigin()
  );
}
export async function guardMutation(request: Request): Promise<NextResponse | null> {
  try {
    if (!checkMutationOrigin(request))
      return NextResponse.json({ error: "Origin verification failed." }, { status: 403 });
    return guardAdminAccess();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 });
  }
}
export async function guardAdminAccess(): Promise<NextResponse | null> {
  try {
    const state = await adminAccessState();
    if (state === "authorized") return null;
    if (state === "forbidden")
      return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
    const response = NextResponse.json({ error: "Administrator login required." }, { status: 401 });
    response.cookies.set(ADMIN_COOKIE, "", adminCookieOptions(0));
    return response;
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 });
  }
}

type LoginLimit = { _id: string; attempts: number; expiresAt: Date };
export async function loginIsRateLimited(ip: string, username: string): Promise<boolean> {
  const coll = (await getDatabase()).collection<LoginLimit>("loginLimits");
  await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const now = new Date();
  const limits = [
    { key: `account:${digest(username.trim().toLowerCase().slice(0, 90))}`, maximum: 8 },
    { key: `ip:${digest(ip.slice(0, 100))}`, maximum: 40 },
  ];
  const results = await Promise.all(
    limits.map(async ({ key, maximum }) => {
      const record = await coll.findOneAndUpdate(
        { _id: key },
        [
          {
            $set: {
              attempts: { $cond: [{ $gt: ["$expiresAt", now] }, { $add: ["$attempts", 1] }, 1] },
              expiresAt: {
                $cond: [
                  { $gt: ["$expiresAt", now] },
                  "$expiresAt",
                  new Date(now.getTime() + 15 * 60_000),
                ],
              },
            },
          },
        ],
        { upsert: true, returnDocument: "after" },
      );
      return !record || record.attempts > maximum;
    }),
  );
  return results.some(Boolean);
}
export async function clearLoginLimit(username: string) {
  const key = `account:${digest(username.trim().toLowerCase().slice(0, 90))}`;
  await (await getDatabase()).collection<LoginLimit>("loginLimits").deleteOne({ _id: key });
}
export function adminCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
