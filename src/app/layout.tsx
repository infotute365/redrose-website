import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SiteChrome } from "@/src/components/shared/SiteChrome";
import { MotionProvider } from "@/src/components/shared/MotionProvider";
import { getSiteOverrides } from "@/src/lib/site-content";
import { publicOrigin, publicPages } from "@/src/lib/public-pages";

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-public-pathname") || "/";
  const origin = publicOrigin();
  const title = publicPages[pathname] || "Red Rose Academy";
  const description =
    "Red Rose Academy school information, facilities, academic documents and announcements in Silchar, Assam.";
  return {
    title: { default: title, template: "%s" },
    description,
    ...(origin && publicPages[pathname]
      ? {
          metadataBase: new URL(origin),
          alternates: { canonical: new URL(pathname, origin).href },
          openGraph: {
            title,
            description,
            siteName: "Red Rose Academy",
            locale: "en_IN",
            type: "website",
            url: new URL(pathname, origin).href,
            images: [
              {
                url: new URL("/images/home1.jpeg", origin).href,
                alt: "Red Rose Academy school building",
              },
            ],
          },
        }
      : {}),
  };
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce-based CSP requires request-time HTML, including otherwise static pages.
  const pathname = (await headers()).get("x-public-pathname") || "/";
  // The admin pages never render public CMS overrides; skip that database read.
  const initialOverrides = pathname.startsWith("/admin") ? {} : await getSiteOverrides();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <MotionProvider>
          <SiteChrome initialOverrides={initialOverrides}>{children}</SiteChrome>
        </MotionProvider>
      </body>
    </html>
  );
}
