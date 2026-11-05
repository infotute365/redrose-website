"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/src/components/public/layout/Footer";
import { Navbar } from "@/src/components/public/layout/Navbar";
import { CmsRuntime } from "@/src/components/public/CmsRuntime";
import type { SiteOverrides } from "@/src/lib/site-content";

export function SiteChrome({
  children,
  initialOverrides,
}: {
  children: React.ReactNode;
  initialOverrides: SiteOverrides;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && (
        <div data-cms-scope="header">
          <Navbar />
        </div>
      )}
      <div data-cms-scope="page" className="flex flex-1 flex-col">
        {children}
      </div>
      {!isAdmin && (
        <div data-cms-scope="footer">
          <Footer />
        </div>
      )}
      {!isAdmin && <CmsRuntime initialOverrides={initialOverrides} />}
    </>
  );
}
