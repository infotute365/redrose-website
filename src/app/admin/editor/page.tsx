import { redirect } from "next/navigation";
import { getAdminAccess } from "@/src/lib/admin-auth";
import { ContentStudio } from "@/src/components/admin/ContentStudio";
export const dynamic = "force-dynamic";
export const metadata = { title: "Website Editor | Red Rose Academy" };
export default async function ContentEditorPage() {
  if (!(await getAdminAccess())) redirect("/admin/login");
  return <ContentStudio />;
}
