"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Equipment, Job, Personnel, Profile } from "@/lib/types";
import { JobsModule } from "@/components/jobs/jobs-module";
import { EquipmentModule } from "@/components/equipment/equipment-module";
import { EquipmentBoard } from "@/components/equipment/equipment-board";
import { PersonnelModule } from "@/components/personnel/personnel-module";

type Props = {
  userEmail: string;
  profile: Profile;
  initialJobs: Job[];
  initialEquipment: Equipment[];
  initialPersonnel: Personnel[];
};

export function DashboardShell({ userEmail, profile, initialJobs, initialEquipment, initialPersonnel }: Props) {
  const supabase = createClient();
  const [view, setView] = useState<"jobs" | "personnel" | "equipment" | "active" | "operations">("jobs");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [personnel, setPersonnel] = useState<Personnel[]>(initialPersonnel);
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

  async function refreshJobs() {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error ?? "Could not refresh jobs.");
    }

    setJobs(data);
    return data as Job[];
  }

  async function refreshEquipment() {
    const res = await fetch("/api/equipment", { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error ?? "Could not refresh equipment.");
    }

    setEquipment(data);
    return data as Equipment[];
  }

  async function refreshPersonnel() {
    const res = await fetch("/api/personnel", { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error ?? "Could not refresh personnel.");
    }

    setPersonnel(data);
    return data as Personnel[];
  }

  return (
    <main className="mx-auto max-w-[1600px] p-4">
      <header className="rounded-3xl border-b-8 border-carpenter-red bg-carpenter-black p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Carpenter Operations Hub</h1>
        <p className="mt-1 text-sm font-bold text-slate-300">Production V2 • Admin delete actions</p>
      </header>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-black">
          Signed in as {userEmail}
          <span className="ml-2 rounded-full bg-slate-200 px-2 py-1 text-xs uppercase">{profile.role}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={view === "jobs" ? "btn-primary" : "btn-secondary"} onClick={() => setView("jobs")}>Jobs</button>
          <button className={view === "personnel" ? "btn-primary" : "btn-secondary"} onClick={() => setView("personnel")}>Personnel</button>
          <button className={view === "equipment" ? "btn-primary" : "btn-secondary"} onClick={() => setView("equipment")}>Equipment</button>
          <button className={view === "active" ? "btn-primary" : "btn-secondary"} onClick={() => setView("active")}>Active Work</button>
          <button className={view === "operations" ? "btn-primary" : "btn-secondary"} onClick={() => setView("operations")}>Operations Board</button>
          <button className="btn-secondary" disabled={loggingOut} onClick={handleLogout}>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>

      {view === "jobs" ? (
        <JobsModule
          initialJobs={jobs}
          isAdmin={profile.role === "admin"}
          onJobsChanged={async () => {
            await refreshJobs();
            await refreshEquipment();
          }}
        />
      ) : null}

      {view === "personnel" ? (
        <PersonnelModule
          personnel={personnel}
          isAdmin={profile.role === "admin"}
          onPersonnelChanged={async () => {
            await refreshPersonnel();
          }}
        />
      ) : null}

      {view === "equipment" ? (
        <EquipmentModule
          equipment={equipment}
          jobs={jobs}
          isAdmin={profile.role === "admin"}
          onEquipmentChanged={async () => {
            await refreshEquipment();
          }}
        />
      ) : null}

      {view === "operations" ? (
        <EquipmentBoard equipment={equipment} jobs={jobs} />
      ) : null}

      {view === "active" ? (
        <section className="card mt-4">
          <h2 className="text-2xl font-black">Active Work</h2>
          <p className="mt-2 text-sm text-slate-500">This module comes next.</p>
        </section>
      ) : null}
    </main>
  );
}
