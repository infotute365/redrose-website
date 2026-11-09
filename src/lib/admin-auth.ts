import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDatabase } from "@/src/server/config/database";
import {
  jwtSecret,
  readAppOrigin,
  isTrustedProxyRequest,
  trustedClientIp,
} from "@/src/server/config/auth.js";
import { requireAdminSession } from "@/src/server/middleware/auth.middleware.js";
import { checkMutationOrigin } from "@/src/server/controller/auth.controller.js";

const ADMIN_COOKIE = "accessToken";
export { trustedClientIp, checkMutationOrigin };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function isAdminConfigured() {
  try {
    const uri = process.env.MONGODB_URI?.trim() || "";
    const db = /^mongodb(?:\+srv)?:\/\/[^/?]+\/([A-Za-z0-9_-]{1,63})(?:\?|$)/.exec(uri)?.[1];
    if (!db || process.env.MONGODB_DATABASE) return false;
    jwtSecret();
    readAppOrigin();
    return true;
  } catch {
    return false;
  }
}
async function adminAccessState() {
  if (!isTrustedProxyRequest(await headers())) return "forbidden";
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return (await requireAdminSession(token)) ? "authorized" : "unauthorized";
}
export async function getAdminAccess() {
  try {
    return (await adminAccessState()) === "authorized";
  } catch {
    return false;
  }
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
    return NextResponse.json({ error: "Administrator login required." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 });
  }
}

type LoginLimit = { _id: string; attempts: number; expiresAt: Date };
// MongoDB retains the index: create it at most once per running process.
// A failed attempt is retried on the next request rather than cached forever.
let loginLimitIndex: Promise<string> | undefined;
export async function loginIsRateLimited(ip: string, username: string): Promise<boolean> {
  const coll = (await getDatabase()).collection<LoginLimit>("loginLimits");
  if (!loginLimitIndex) {
    loginLimitIndex = coll
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((error) => {
        loginLimitIndex = undefined;
        throw error;
      });
  }
  await loginLimitIndex;
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
