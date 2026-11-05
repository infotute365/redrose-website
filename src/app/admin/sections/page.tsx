import { redirect } from "next/navigation";
import { getAdminAccess } from "@/src/lib/admin-auth";
import { getAllSections } from "@/src/lib/dynamic-sections";
import { SectionsManager } from "@/src/components/admin/SectionsManager";
import { getHomepageBackground } from "@/src/server/homepage-background";
export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage Sections | Red Rose Academy" };
export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!(await getAdminAccess())) redirect("/admin/login");
  const [sections, background, query] = await Promise.all([
    getAllSections(),
    getHomepageBackground(),
    searchParams,
  ]);
  const kind = query.tab === "events" ? "events" : "slides";
  return (
    <SectionsManager
      key={kind}
      initialSlides={sections.slides}
      initialEvents={sections.events}
      initialKind={kind}
      background={background}
    />
  );
}
