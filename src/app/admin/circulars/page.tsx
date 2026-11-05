import { redirect } from "next/navigation";
import { getAdminAccess } from "@/src/lib/admin-auth";
import { getCirculars } from "@/src/lib/circulars";
import { CircularManager } from "@/src/components/admin/CircularManager";
export const dynamic = "force-dynamic";
export const metadata = { title: "Circulars & Notices | Red Rose Academy" };
export default async function CircularsPage() {
  if (!(await getAdminAccess())) redirect("/admin/login");
  return <CircularManager initialCirculars={await getCirculars()} />;
}
