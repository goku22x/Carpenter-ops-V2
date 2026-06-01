"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Job, Profile } from "@/lib/types";
import { JobsModule } from "@/components/jobs/jobs-module";

type Props = {
  userEmail: string;
  profile: Profile;
  initialJobs: Job[];
};

export function DashboardShell({ userEmail, profile, initialJobs }: Props) {
  const supabase = createClient();
  const [view, setView] = useState<"jobs" | "active" | "operations">("jobs");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Logout failed.");
      setLoggingOut(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1600px] p-4">
      <header className="rounded-3xl border-b-8 border-carpenter-red bg-carpenter-black p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Carpenter Operations Hub</h1>
        <p className="mt-1 text-sm font-bold text-slate-300">Production V2 • Jobs foundation</p>
      </header>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-black">
          Signed in as {userEmail}
          <span className="ml-2 rounded-full bg-slate-200 px-2 py-1 text-xs uppercase">{profile.role}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={view === "jobs" ? "btn-primary" : "btn-secondary"} onClick={() => setView("jobs")}>Jobs</button>
          <button className={view === "active" ? "btn-primary" : "btn-secondary"} onClick={() => setView("active")}>Active Work</button>
          <button className={view === "operations" ? "btn-primary" : "btn-secondary"} onClick={() => setView("operations")}>Operations Board</button>
          <button className="btn-secondary" disabled={loggingOut} onClick={handleLogout}>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>

      {view === "jobs" ? (
        <JobsModule initialJobs={initialJobs} isAdmin={profile.role === "admin"} />
      ) : (
        <section className="card mt-4">
          <h2 className="text-2xl font-black">{view === "active" ? "Active Work" : "Operations Board"}</h2>
          <p className="mt-2 text-sm text-slate-500">This module comes next after the Jobs foundation is solid.</p>
        </section>
      )}
    </main>
  );
}
