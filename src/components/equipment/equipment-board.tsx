"use client";

import type { Equipment, Job } from "@/lib/types";
import { equipmentTypeStyle, isTruckingType } from "@/lib/equipment-types";

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
  const style = equipmentTypeStyle(item.equipment_type, item.ownership_type);

  const statusClass =
    item.status === "Down" || item.status === "In Shop"
      ? "ring-2 ring-red-400"
      : item.status === "Transporting"
        ? "ring-2 ring-yellow-400"
        : "";

  return (
    <div className={`flex gap-3 rounded-2xl border p-3 shadow-sm ${style.cardClass} ${statusClass}`}>
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
        <div className="text-xs text-slate-500">#{item.equipment_number ?? "—"}</div>
        <div className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-black uppercase ${style.badgeClass}`}>
          {item.ownership_type === "Rental" ? "Rental" : item.equipment_type ?? "Other"}
        </div>
        <div className="mt-1 text-xs font-black uppercase">{item.status}</div>
        {item.ownership_type === "Rental" && item.rental_company ? (
          <div className="text-xs font-bold text-pink-800">{item.rental_company}</div>
        ) : null}
      </div>
    </div>
  );
}

function BoardGroup({ title, subtitle, items }: { title: string; subtitle: string; items: Equipment[] }) {
  return (
    <section className="rounded-3xl border-l-8 border-carpenter-red bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-xl font-black uppercase">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing here.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => <EquipmentCard key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}

export function EquipmentBoard({ equipment, jobs }: Props) {
  const unassigned = equipment.filter((item) => !item.current_job_id);

  return (
    <section className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-2xl font-black">Operations Board</h2>
        <p className="mt-1 text-sm text-slate-500">Heavy equipment and trucking split by job. Rentals are highlighted pink.</p>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => {
          const assigned = equipment.filter((item) => item.current_job_id === job.id);
          const heavyEquipment = assigned.filter((item) => !isTruckingType(item.equipment_type));
          const trucking = assigned.filter((item) => isTruckingType(item.equipment_type));

          return (
            <section key={job.id} className="space-y-3 rounded-3xl border-l-8 border-carpenter-red bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="text-2xl font-black uppercase">{job.name}</h3>
                  <p className="text-sm text-slate-500">{assigned.length} total assigned</p>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black">{assigned.length}</span>
              </div>

              <BoardGroup title="Equipment" subtitle={`${heavyEquipment.length} production/support equipment`} items={heavyEquipment} />
              <BoardGroup title="Trucking" subtitle={`${trucking.length} trucking/hauling assets`} items={trucking} />
            </section>
          );
        })}

        <section className="space-y-3 rounded-3xl border-l-8 border-slate-400 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-2xl font-black uppercase">Unassigned / Yard / Other</h3>
              <p className="text-sm text-slate-500">{unassigned.length} not assigned to a job</p>
            </div>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black">{unassigned.length}</span>
          </div>

          <BoardGroup title="Equipment" subtitle="Unassigned production/support equipment" items={unassigned.filter((item) => !isTruckingType(item.equipment_type))} />
          <BoardGroup title="Trucking" subtitle="Unassigned trucking/hauling assets" items={unassigned.filter((item) => isTruckingType(item.equipment_type))} />
        </section>
      </div>
    </section>
  );
}
