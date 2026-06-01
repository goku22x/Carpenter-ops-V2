"use client";

import type { Equipment, Job } from "@/lib/types";

type Props = {
  equipment: Equipment[];
  jobs: Job[];
};

function imagePath(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return value;
  return `/equipment-images/${value}`;
}

function EquipmentCard({ item }: { item: Equipment }) {
  const statusClass =
    item.status === "Down" || item.status === "In Shop"
      ? "border-red-300 bg-red-50"
      : item.status === "Transporting"
        ? "border-yellow-300 bg-yellow-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`flex gap-3 rounded-2xl border p-3 shadow-sm ${statusClass}`}>
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border bg-white">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePath(item.photo_url)} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-400">NO IMG</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="font-black leading-tight">{item.name}</div>
        <div className="text-xs text-slate-500">{item.equipment_type ?? "Uncategorized"} • #{item.equipment_number ?? "—"}</div>
        <div className="mt-1 text-xs font-black uppercase">{item.status}</div>
      </div>
    </div>
  );
}

export function EquipmentBoard({ equipment, jobs }: Props) {
  const unassigned = equipment.filter((item) => !item.current_job_id);

  return (
    <section className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-2xl font-black">Operations Board</h2>
        <p className="mt-1 text-sm text-slate-500">Equipment grouped by current job assignment.</p>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => {
          const assigned = equipment.filter((item) => item.current_job_id === job.id);

          return (
            <section key={job.id} className="rounded-3xl border-l-8 border-carpenter-red bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="text-xl font-black uppercase">{job.name}</h3>
                  <p className="text-sm text-slate-500">{assigned.length} equipment assigned</p>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black">{assigned.length}</span>
              </div>

              {assigned.length === 0 ? (
                <p className="text-sm text-slate-500">No equipment assigned.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {assigned.map((item) => <EquipmentCard key={item.id} item={item} />)}
                </div>
              )}
            </section>
          );
        })}

        <section className="rounded-3xl border-l-8 border-slate-400 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-xl font-black uppercase">Unassigned / Yard / Other</h3>
              <p className="text-sm text-slate-500">{unassigned.length} equipment not assigned to a job</p>
            </div>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black">{unassigned.length}</span>
          </div>

          {unassigned.length === 0 ? (
            <p className="text-sm text-slate-500">Everything is assigned.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {unassigned.map((item) => <EquipmentCard key={item.id} item={item} />)}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
