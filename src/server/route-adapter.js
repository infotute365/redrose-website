import { login, logout, refreshToken } from "./controller/auth.controller.js";

export async function handleAuthRoute(action, request, helpers = {}) {
  if (action === "login") return login(request, helpers);
  if (action === "logout") return logout(request);
  if (action === "refresh") return refreshToken(request);
  throw new Error("Unknown authentication route");
}
