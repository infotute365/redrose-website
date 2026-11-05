import type { MetadataRoute } from "next";
import { publicOrigin } from "@/src/lib/public-pages";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  return {
    rules: {
      userAgent: "*",
      ...(origin ? { allow: "/", disallow: ["/admin", "/api/"] } : { disallow: "/" }),
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
