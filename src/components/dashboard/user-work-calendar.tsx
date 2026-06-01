"use client";

import { useMemo, useState } from "react";
import type { Job, Personnel, Profile, WorkOrder } from "@/lib/types";
import { getWorkOrderTypeColor } from "@/lib/work-orders";
import { formatDate } from "@/lib/date-format";

type Props = {
  profile: Profile;
  personnel: Personnel[];
  jobs: Job[];
  workOrders: WorkOrder[];
  onOpenWorkOrders: () => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthTitle(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
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

  return personnel.find((person) => person.full_name.trim().toLowerCase() === profileName) ?? null;
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - firstOfMonth.getDay());

  const days: Date[] = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push(date);
  }

  return days;
}

export function UserWorkCalendar({ profile, personnel, jobs, workOrders, onOpenWorkOrders }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const currentPerson = findCurrentPersonnel(profile, personnel);
  const jobNameById = new Map(jobs.map((job) => [job.id, job.name]));

  const myWork = currentPerson
    ? workOrders.filter((order) => order.assigned_personnel_id === currentPerson.id)
    : [];

  const openWork = myWork.filter((order) => !["Complete", "Closed"].includes(order.status));
  const completedWork = myWork.filter((order) => ["Complete", "Closed"].includes(order.status));
  const unscheduledWork = openWork.filter((order) => !order.due_date);

  const workByDate = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();

    for (const order of openWork) {
      if (!order.due_date) continue;
      const current = map.get(order.due_date) ?? [];
      current.push(order);
      map.set(order.due_date, current);
    }

    return map;
  }, [openWork]);

  const days = buildCalendarDays(visibleMonth);
  const today = new Date();

  function previousMonth() {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
  }

  function nextMonth() {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
  }

  function currentMonth() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <section className="mt-4 space-y-4">
      <section className="rounded-3xl border-b-8 border-carpenter-red bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black">My Calendar</h2>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-black">{monthTitle(visibleMonth)}</h3>

          <div className="flex gap-2">
            <button className="btn-secondary" onClick={previousMonth}>Prev</button>
            <button className="btn-secondary" onClick={currentMonth}>Today</button>
            <button className="btn-secondary" onClick={nextMonth}>Next</button>
          </div>
        </div>

        <div className="grid grid-cols-7 overflow-hidden rounded-2xl border">
          {WEEKDAYS.map((day) => (
            <div key={day} className="border-b bg-slate-100 p-2 text-center text-xs font-black uppercase text-slate-600">
              {day}
            </div>
          ))}

          {days.map((date) => {
            const key = toDateKey(date);
            const orders = workByDate.get(key) ?? [];
            const inMonth = date.getMonth() === visibleMonth.getMonth();
            const isToday = isSameDate(date, today);

            return (
              <div
                key={key}
                className={`min-h-32 border-b border-r p-2 ${inMonth ? "bg-white" : "bg-slate-50 text-slate-400"} ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={`text-sm font-black ${isToday ? "rounded-full bg-blue-600 px-2 py-1 text-white" : ""}`}>
                    {date.getDate()}
                  </span>

                  {orders.length > 0 ? (
                    <span className="rounded-full bg-carpenter-red px-2 py-1 text-[10px] font-black text-white">
                      {orders.length}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  {orders.slice(0, 3).map((order) => (
                    <button
                      key={order.id}
                      className={`block w-full truncate rounded-lg border px-2 py-1 text-left text-[11px] font-black ${getWorkOrderTypeColor(order.work_type)}`}
                      onClick={onOpenWorkOrders}
                      title={`${order.description ?? order.title} | Due ${formatDate(order.due_date)}`}
                    >
                      {order.work_type}: {order.job_id ? jobNameById.get(order.job_id) ?? "Job" : "No job"}
                    </button>
                  ))}

                  {orders.length > 3 ? (
                    <button className="text-[11px] font-black text-blue-700" onClick={onOpenWorkOrders}>
                      +{orders.length - 3} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {unscheduledWork.length > 0 ? (
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="text-2xl font-black">No Due Date</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduledWork.map((order) => (
              <button
                key={order.id}
                className="rounded-2xl border bg-white p-3 text-left shadow-sm hover:border-blue-500"
                onClick={onOpenWorkOrders}
              >
                <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getWorkOrderTypeColor(order.work_type)}`}>
                  {order.work_type}
                </span>
                <div className="mt-2 font-black">{order.title}</div>
                <div className="text-sm text-slate-600">{order.description || "No description"}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
