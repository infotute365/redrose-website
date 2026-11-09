import { handleAuthRoute } from "@/src/server/route-adapter.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAuthRoute("logout", request);
}
