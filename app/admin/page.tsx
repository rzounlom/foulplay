import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin/is-admin";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminDashboard adminName={admin.name} />;
}
