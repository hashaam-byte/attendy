import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get org_user + org details
  const { data: orgUser } = await supabase
    .from("org_users")
    .select("role, organisation_id, organisations(name, industry, is_active, plan, plan_expires_at)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const org = orgUser.organisations as any;

  // Only education orgs use this product
  if (org?.industry !== "education") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Suspended org
  if (!org?.is_active) {
    redirect("/login?error=suspended");
  }

  // Gatemen go directly to scanner
  if (orgUser.role === "gateman") {
    redirect("/scanner");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          user={user}
          schoolName={org?.name ?? ""}
          role={orgUser.role}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}