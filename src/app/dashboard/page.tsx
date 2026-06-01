import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Job, Profile } from "@/lib/types";

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

  return (
    <DashboardShell
      userEmail={authData.user.email ?? ""}
      profile={profile}
      initialJobs={jobs ?? []}
    />
  );
}
