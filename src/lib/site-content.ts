import { getDatabase } from "@/src/server/config/database";
export type SiteOverrides = Record<string, string>;
export async function getSiteOverrides(strict = false): Promise<SiteOverrides> {
  if (!process.env.MONGODB_URI) return {};
  try {
    const record = await (await getDatabase()).collection("siteContent").findOne({ key: "public" });
    const overrides = record?.overrides;
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return {};
    return Object.fromEntries(
      Object.entries(overrides).filter(
        ([key, val]) => typeof key === "string" && typeof val === "string",
      ),
    ) as SiteOverrides;
  } catch (error) {
    if (strict) throw error;
    return {};
  }
}
