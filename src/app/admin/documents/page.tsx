import { redirect } from "next/navigation";
import { getAdminAccess } from "@/src/lib/admin-auth";
import { getDocuments } from "@/src/lib/documents";
import { DocumentsManager } from "@/src/components/admin/DocumentsManager";
export const dynamic = "force-dynamic";
export const metadata = { title: "Documents & PDFs | Red Rose Academy" };
export default async function DocumentsPage() {
  if (!(await getAdminAccess())) redirect("/admin/login");
  return <DocumentsManager initialDocuments={await getDocuments()} />;
}
