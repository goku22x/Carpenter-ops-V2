import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Equipment, Job, Personnel, Profile, WorkOrder } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    redirect("/login");
  }

  const profileStatus = profile.status ?? (profile.active === false ? "disabled" : "active");

  if (profileStatus !== "active") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-4">
        <section className="rounded-3xl border-b-8 border-carpenter-red bg-carpenter-black p-8 text-center text-white shadow-xl">
          <h1 className="text-3xl font-black">Account Pending Approval</h1>
          <p className="mt-3 text-sm font-bold text-slate-300">
            Your account was created, but an admin still needs to approve it and assign your role before you can use Carpenter Operations Hub.
          </p>
          <p className="mt-4 rounded-2xl bg-white/10 p-3 text-xs font-black uppercase tracking-wide text-slate-200">
            Current status: {profileStatus}
          </p>
        </section>
      </main>
    );
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, job_phases(*)")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .returns<Job[]>();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("*")
    .order("equipment_type", { ascending: true })
    .order("name", { ascending: true })
    .returns<Equipment[]>();

  const { data: personnel } = await supabase
    .from("personnel")
    .select("*")
    .order("active", { ascending: false })
    .order("full_name", { ascending: true })
    .returns<Personnel[]>();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<WorkOrder[]>();

  return (
    <DashboardShell
      userEmail={authData.user.email ?? ""}
      profile={profile}
      initialJobs={jobs ?? []}
      initialEquipment={equipment ?? []}
      initialPersonnel={personnel ?? []}
      initialWorkOrders={workOrders ?? []}
    />
  );
}
