"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Equipment, Job, Personnel, Profile, WorkOrder } from "@/lib/types";
import { JobsModule } from "@/components/jobs/jobs-module";
import { EquipmentModule } from "@/components/equipment/equipment-module";
import { EquipmentBoard } from "@/components/equipment/equipment-board";
import { PersonnelModule } from "@/components/personnel/personnel-module";
import { WorkOrdersModule } from "@/components/work-orders/work-orders-module";
import { UserWorkCalendar } from "@/components/dashboard/user-work-calendar";

type Props = {
  userEmail: string;
  profile: Profile;
  initialJobs: Job[];
  initialEquipment: Equipment[];
  initialPersonnel: Personnel[];
  initialWorkOrders: WorkOrder[];
};

export function DashboardShell({ userEmail, profile, initialJobs, initialEquipment, initialPersonnel, initialWorkOrders }: Props) {
  const supabase = createClient();
  const [view, setView] = useState<"calendar" | "jobs" | "personnel" | "equipment" | "work" | "operations">("operations");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [personnel, setPersonnel] = useState<Personnel[]>(initialPersonnel);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
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
    if (!res.ok) throw new Error(data?.error ?? "Could not refresh jobs.");
    setJobs(data);
    return data as Job[];
  }

  async function refreshEquipment() {
    const res = await fetch("/api/equipment", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not refresh equipment.");
    setEquipment(data);
    return data as Equipment[];
  }

  async function refreshPersonnel() {
    const res = await fetch("/api/personnel", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not refresh personnel.");
    setPersonnel(data);
    return data as Personnel[];
  }

  async function refreshWorkOrders() {
    const res = await fetch("/api/work-orders", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not refresh work orders.");
    setWorkOrders(data);
    return data as WorkOrder[];
  }

  return (
    <main className="mx-auto max-w-[1600px] p-4">
      <header className="rounded-3xl border-b-8 border-carpenter-red bg-carpenter-black p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Carpenter Operations Hub</h1>
        <p className="mt-1 text-sm font-bold text-slate-300">Production V2 • Operations Board home</p>
      </header>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-black">
          Signed in as {userEmail}
          <span className="ml-2 rounded-full bg-slate-200 px-2 py-1 text-xs uppercase">{profile.role}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={view === "operations" ? "btn-primary" : "btn-secondary"} onClick={() => setView("operations")}>Operations Board</button>
          <button className={view === "calendar" ? "btn-primary" : "btn-secondary"} onClick={() => setView("calendar")}>My Calendar</button>
          <button className={view === "work" ? "btn-primary" : "btn-secondary"} onClick={() => setView("work")}>Work Orders</button>
          {profile.role === "admin" ? (
            <button className={view === "jobs" ? "btn-primary" : "btn-secondary"} onClick={() => setView("jobs")}>Job Setup</button>
          ) : null}
          <button className={view === "personnel" ? "btn-primary" : "btn-secondary"} onClick={() => setView("personnel")}>Personnel</button>
          <button className={view === "equipment" ? "btn-primary" : "btn-secondary"} onClick={() => setView("equipment")}>Equipment</button>
          <button className="btn-secondary" disabled={loggingOut} onClick={handleLogout}>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>

      {view === "calendar" ? (
        <UserWorkCalendar
          profile={profile}
          personnel={personnel}
          jobs={jobs}
          workOrders={workOrders}
          onOpenWorkOrders={() => setView("work")}
        />
      ) : null}

      {view === "jobs" && profile.role === "admin" ? (
        <JobsModule
          initialJobs={jobs}
          isAdmin={profile.role === "admin"}
          onJobsChanged={async () => {
            await refreshJobs();
            await refreshEquipment();
          }}
        />
      ) : null}

      {view === "work" ? (
        <WorkOrdersModule
          workOrders={workOrders}
          jobs={jobs}
          equipment={equipment}
          personnel={personnel}
          isAdmin={profile.role === "admin"}
          onWorkOrdersChanged={async () => {
            await refreshWorkOrders();
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
        <EquipmentBoard
          equipment={equipment}
          jobs={jobs}
          personnel={personnel}
          workOrders={workOrders}
          profile={profile}
          onWorkOrdersChanged={async () => {
            await refreshWorkOrders();
          }}
        />
      ) : null}
    </main>
  );
}
