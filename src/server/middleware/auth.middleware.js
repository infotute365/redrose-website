import { readAccessUser } from "../config/auth.js";
import connectDB from "../config/database.js";

// Same server/middleware location and authorization pattern as St. Mary's.
export async function requireAdminSession(accessToken) {
  if (!accessToken) return null;
  try {
    await connectDB();
    return await readAccessUser(accessToken);
  } catch (error) {
    if (error?.status === 401) return null;
    throw error;
  }
}
