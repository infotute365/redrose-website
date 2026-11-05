import { getDatabase } from "@/src/server/config/database";

export type AdminCredential = {
  username: string;
  usernameNormalized: string;
  passwordSalt: string;
  passwordHash: string;
  role: "admin";
  active: boolean;
  sessionVersion: number;
  updatedAt: string;
};
export async function findAdmin(username: string) {
  const db = await getDatabase();
  return db
    .collection<AdminCredential>("admins")
    .findOne({ usernameNormalized: username.trim().toLowerCase() });
}
export async function findActiveAdmin(username: string) {
  const admin = await findAdmin(username);
  return admin?.active && admin.role === "admin" ? admin : null;
}
