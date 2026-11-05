import type { MetadataRoute } from "next";
import { publicOrigin, publicPages } from "@/src/lib/public-pages";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  return origin
    ? Object.keys(publicPages).map((pathname) => ({ url: new URL(pathname, origin).href }))
    : [];
}
