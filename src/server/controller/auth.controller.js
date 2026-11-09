import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import AuthModel from "../model/auth.model.js";
import { readJsonBody } from "../http/json.mjs";
import connectDB from "../config/database.js";
import { normalizeAdminEmail } from "../util/validation.mjs";
import {
  isAdmin,
  safeUser,
  issueTokens,
  setAuthCookies,
  clearAuthCookies,
  hashRefreshToken,
  readAccessUser,
  REFRESH_SECONDS,
  readAppOrigin,
  isTrustedProxyRequest,
} from "../config/auth.js";

const noStore = { "Cache-Control": "no-store" };
const failure = (message, status) =>
  NextResponse.json({ error: message }, { status, headers: noStore });

export function checkMutationOrigin(request) {
  return (
    isTrustedProxyRequest(request.headers) && request.headers.get("origin") === readAppOrigin()
  );
}

export const login = async (request, { loginIsRateLimited, clearLoginLimit, trustedClientIp }) => {
  let email, password;
  try {
    if (!checkMutationOrigin(request)) return failure("Origin verification failed.", 403);
    const body = await readJsonBody(request, 4096);
    if (!body || Array.isArray(body) || typeof body !== "object")
      return failure("Invalid login request.", 400);
    email = normalizeAdminEmail(body.email);
    password = body.password;
    if (typeof password !== "string" || !password || password.length > 4096)
      return failure("Email and password are required.", 400);
  } catch {
    return failure("Invalid login request or Origin configuration.", 400);
  }
  try {
    await connectDB();
    const ip = trustedClientIp(request.headers);
    if (!ip) return failure("Trusted proxy verification failed.", 403);
    if (await loginIsRateLimited(ip, email))
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900", ...noStore } },
      );
    const user = await AuthModel.findOne({ email }).select("+password");
    const dummyHash = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
    const valid = await bcrypt.compare(password, user?.password || dummyHash);
    if (!valid || !isAdmin(user)) return failure("Invalid credentials.", 401);
    const previousVersion = user.sessionVersion || 0;
    const currentVersion = previousVersion + 1;
    const tokens = issueTokens({ ...user.toObject(), sessionVersion: currentVersion });
    const updated = await AuthModel.updateOne(
      { _id: user._id, sessionVersion: { $in: [previousVersion, null] } },
      {
        $set: {
          refreshToken: hashRefreshToken(tokens.refreshToken),
          refreshTokenHistory: [],
          expiry: new Date(Date.now() + REFRESH_SECONDS * 1000),
          lastLogin: new Date(),
          sessionVersion: currentVersion,
        },
      },
    );
    if (!updated.modifiedCount) return failure("Please retry login.", 409);
    await clearLoginLimit(email);
    return setAuthCookies(
      NextResponse.json({ ok: true, user: safeUser(user) }, { headers: noStore }),
      tokens,
    );
  } catch {
    return failure("Login is temporarily unavailable.", 503);
  }
};

export const logout = async (request) => {
  try {
    if (!checkMutationOrigin(request)) return failure("Origin verification failed.", 403);
  } catch {
    return failure("Authentication service unavailable.", 503);
  }
  const access = request.cookies.get("accessToken")?.value;
  const refresh = request.cookies.get("refreshToken")?.value;
  try {
    await connectDB();
    let current = null;
    if (access) {
      try {
        current = await readAccessUser(access);
      } catch (error) {
        if (error?.status !== 401) throw error;
      }
    }
    const filter = current
      ? { _id: current._id }
      : refresh
        ? { refreshToken: hashRefreshToken(refresh) }
        : null;
    if (filter)
      await AuthModel.updateOne(filter, {
        $set: { refreshToken: null, refreshTokenHistory: [], expiry: null },
        $inc: { sessionVersion: 1 },
      });
    return clearAuthCookies(NextResponse.json({ ok: true }, { headers: noStore }));
  } catch {
    return failure("Session revocation temporarily unavailable. Please retry logout.", 503);
  }
};

// Refresh token rotation is identical in purpose to St. Mary's, so the UI can
// stay logged in beyond the 15 minute access-token lifetime without exposure to JS.
export const refreshToken = async (request) => {
  try {
    if (!checkMutationOrigin(request)) return failure("Origin verification failed.", 403);
    const refresh = request.cookies.get("refreshToken")?.value;
    if (!refresh || !/^[A-Za-z0-9_-]{43}$/.test(refresh))
      return failure("Administrator login required.", 401);
    const storedToken = hashRefreshToken(refresh);
    await connectDB();
    const user = await AuthModel.findOne({
      refreshToken: storedToken,
      expiry: { $gt: new Date() },
      isActive: true,
    }).select("+refreshToken");
    if (!isAdmin(user)) return failure("Administrator login required.", 401);
    const tokens = issueTokens(user);
    const updated = await AuthModel.updateOne(
      {
        _id: user._id,
        refreshToken: storedToken,
        sessionVersion: user.sessionVersion,
        expiry: { $gt: new Date() },
      },
      {
        $set: {
          refreshToken: hashRefreshToken(tokens.refreshToken),
          expiry: new Date(Date.now() + REFRESH_SECONDS * 1000),
        },
        $push: { refreshTokenHistory: { $each: [storedToken], $slice: -64 } },
      },
    );
    if (!updated.modifiedCount) return failure("Session changed. Please sign in again.", 401);
    return setAuthCookies(NextResponse.json({ ok: true }, { headers: noStore }), tokens);
  } catch {
    return failure("Session refresh temporarily unavailable.", 503);
  }
};
