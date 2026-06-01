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
