"use client";

import type { Job, Personnel, Profile, WorkOrder } from "@/lib/types";
import { getWorkOrderTypeColor } from "@/lib/work-orders";

type Props = {
  profile: Profile;
  personnel: Personnel[];
  jobs: Job[];
  workOrders: WorkOrder[];
  onOpenWorkOrders: () => void;
};

function dateKey(value: string | null | undefined) {
  return value || "No Due Date";
}

function prettyDate(value: string) {
  if (value === "No Due Date") return value;

  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function isOverdue(value: string | null | undefined) {
  if (!value) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${value}T00:00:00`);
  return due < today;
}

function findCurrentPersonnel(profile: Profile, personnel: Personnel[]) {
  const byEmail = personnel.find(
    (person) =>
      person.email &&
      profile.email &&
      person.email.toLowerCase() === profile.email.toLowerCase()
  );

  if (byEmail) return byEmail;

  const profileName = profile.full_name?.trim().toLowerCase();

  if (!profileName) return null;

  return (
    personnel.find((person) => person.full_name.trim().toLowerCase() === profileName) ?? null
  );
}

export function UserWorkCalendar({ profile, personnel, jobs, workOrders, onOpenWorkOrders }: Props) {
  const currentPerson = findCurrentPersonnel(profile, personnel);
  const jobNameById = new Map(jobs.map((job) => [job.id, job.name]));

  const myWork = currentPerson
    ? workOrders.filter((order) => order.assigned_personnel_id === currentPerson.id)
    : [];

  const openWork = myWork.filter((order) => !["Complete", "Closed"].includes(order.status));
  const completedWork = myWork.filter((order) => ["Complete", "Closed"].includes(order.status));

  const grouped = openWork.reduce((map, order) => {
    const key = dateKey(order.due_date);
    const current = map.get(key) ?? [];
    current.push(order);
    map.set(key, current);
    return map;
  }, new Map<string, WorkOrder[]>());

  const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => {
    if (a === "No Due Date") return 1;
    if (b === "No Due Date") return -1;
    return a.localeCompare(b);
  });

  return (
    <section className="mt-4 space-y-4">
      <section className="rounded-3xl border-b-8 border-carpenter-red bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">My Work Calendar</h2>
            <p className="mt-1 text-sm text-slate-500">
              {currentPerson
                ? `Assigned work for ${currentPerson.full_name}`
                : "No matching personnel record found for your login."}
            </p>
          </div>

          <button className="btn-primary" onClick={onOpenWorkOrders}>
            Open Work Orders
          </button>
        </div>

        {!currentPerson ? (
          <div className="mt-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
            Your user profile is not linked to a Personnel record yet. Match your Personnel email to your login email:
            <span className="ml-1 font-black">{profile.email}</span>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-500">Open Assigned</div>
          <div className="text-4xl font-black">{openWork.length}</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-500">Overdue</div>
          <div className="text-4xl font-black text-red-700">
            {openWork.filter((order) => isOverdue(order.due_date)).length}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-500">Completed / Closed</div>
          <div className="text-4xl font-black">{completedWork.length}</div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h3 className="text-2xl font-black">Calendar</h3>

        {openWork.length === 0 ? (
          <div className="mt-4 rounded-2xl border bg-slate-50 p-6 text-center">
            <div className="text-lg font-black">No assigned work right now.</div>
            <p className="mt-1 text-sm text-slate-500">
              Assigned work orders will show here by due date.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedGroups.map(([date, orders]) => (
              <section key={date} className={`rounded-2xl border p-3 ${date !== "No Due Date" && isOverdue(date) ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="mb-3 flex items-center justify-between gap-3 border-b pb-2">
                  <h4 className="text-lg font-black">{prettyDate(date)}</h4>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm">
                    {orders.length}
                  </span>
                </div>

                <div className="grid gap-3">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      className="rounded-2xl border bg-white p-3 text-left shadow-sm hover:border-blue-500"
                      onClick={onOpenWorkOrders}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getWorkOrderTypeColor(order.work_type)}`}>
                          {order.work_type}
                        </span>
                        <span className="text-xs font-black uppercase">{order.status}</span>
                      </div>

                      <div className="mt-2 font-black">{order.title}</div>

                      <div className="mt-1 text-sm text-slate-600">
                        {order.description || "No description"}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span>{order.job_id ? jobNameById.get(order.job_id) ?? "Job" : "No job"}</span>
                        <span>•</span>
                        <span>Priority: {order.priority}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
