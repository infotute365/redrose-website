import { redirect } from "next/navigation";
import { getAdminAccess } from "@/src/lib/admin-auth";
import { getHomepageBackground } from "@/src/server/homepage-background";
import { BackgroundManager } from "@/src/components/admin/BackgroundManager";
export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage Background | Red Rose Academy" };
export default async function BackgroundPage() {
  if (!(await getAdminAccess())) redirect("/admin/login");
  return <BackgroundManager initialBackground={await getHomepageBackground()} />;
}
