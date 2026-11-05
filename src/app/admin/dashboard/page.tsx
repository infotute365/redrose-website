import { redirect } from "next/navigation";
import { getAdminAccess } from "@/src/lib/admin-auth";
import { getDocuments } from "@/src/lib/documents";
import { AdminDashboard } from "@/src/components/admin/AdminDashboard";
import { getCirculars } from "@/src/lib/circulars";
import { getAllSections } from "@/src/lib/dynamic-sections";
import { getHomepageBackground } from "@/src/server/homepage-background";

export const metadata = { title: "Admin Dashboard | Red Rose Academy" };
export default async function AdminDashboardPage() {
  if (!(await getAdminAccess())) redirect("/admin/login");
  const [documents, circulars, sections, background] = await Promise.all([
    getDocuments(),
    getCirculars(),
    getAllSections(),
    getHomepageBackground(),
  ]);
  return (
    <AdminDashboard
      initialDocuments={documents}
      initialCirculars={circulars}
      initialSlides={sections.slides}
      initialEvents={sections.events}
      background={background}
    />
  );
}
