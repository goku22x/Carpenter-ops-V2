"use client";

import { useState } from "react";
import { ActiveWorkPanel } from "@/components/panels/active-work-panel";
import { CalendarPanel } from "@/components/panels/calendar-panel";
import { JobListPanel } from "@/components/panels/job-list-panel";
import { OperationsBoard } from "@/components/panels/operations-board";

const sampleJobs = [
  { id: "1", name: "Resort at Trailside", phases: {} },
  { id: "2", name: "Maumelle Shale Pit", phases: {} }
];

const sampleRequests = [
  { id: "r1", department: "Survey", priority: "High", status: "New", description: "Stake west entrance", job_id: "1" },
  { id: "r2", department: "Maintenance", priority: "Critical", status: "New", description: "Hydraulic leak on D6", job_id: "1" }
];

const sampleEquipment = [
  { id: "e1", name: "CAT D6 #1060", equipment_type: "Dozer", status: "Active", current_job_id: "1" },
  { id: "e2", name: "Water Truck #9503", equipment_type: "Water Truck", status: "Active", current_job_id: "1" }
];

export function Dashboard() {
  const [view, setView] = useState<"calendar" | "operations">("calendar");

  return (
    <main className="mx-auto max-w-[1600px] p-4">
      <header className="rounded-3xl border-b-8 border-carpenter-red bg-carpenter-black p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Carpenter Operations Hub</h1>
        <p className="text-sm text-slate-300">Jobs • Active Work • Equipment Board • Personnel</p>
      </header>

      <div className="my-4 flex gap-2 rounded-2xl bg-white p-3 shadow-sm">
        <button className={view === "calendar" ? "btn-primary" : "btn-secondary"} onClick={() => setView("calendar")}>
          Calendar View
        </button>
        <button className={view === "operations" ? "btn-primary" : "btn-secondary"} onClick={() => setView("operations")}>
          Operations Board
        </button>
      </div>

      {view === "calendar" ? (
        <section className="grid gap-4 lg:grid-cols-[420px_1fr_320px]">
          <ActiveWorkPanel requests={sampleRequests} />
          <CalendarPanel requests={sampleRequests} />
          <JobListPanel jobs={sampleJobs} requests={sampleRequests} equipment={sampleEquipment} />
        </section>
      ) : (
        <OperationsBoard jobs={sampleJobs} equipment={sampleEquipment} />
      )}
    </main>
  );
}
