"use client";

import { useMemo, useState } from "react";
import type { Equipment, Job, Personnel, Profile, WorkOrder } from "@/lib/types";
import { equipmentStatusDot, equipmentTypeStyle } from "@/lib/equipment-types";
import { phaseColorClass } from "@/lib/phases";
import { formatDate } from "@/lib/date-format";
import { getWorkOrderTypeColor } from "@/lib/work-orders";

type Props = {
  equipment: Equipment[];
  jobs: Job[];
  personnel?: Personnel[];
  workOrders?: WorkOrder[];
  profile?: Profile;
  onWorkOrdersChanged?: () => Promise<void> | void;
};

type PersonnelWithJob = Personnel & {
  current_job_id?: string | null;
  assigned_job_id?: string | null;
};

const QUICK_REQUESTS = ["Survey", "Maintenance", "Mobilization", "Trucking", "Foreman Assignment", "Office"] as const;

function imagePath(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return value;
  return `/equipment-images/${value}`;
}

function normalizeUrl(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function openUrl(value: string | null | undefined) {
  const url = normalizeUrl(value);
  if (!url) {
    alert("No project files link has been added for this job yet.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function isOpenWorkOrder(order: WorkOrder) {
  return !["Complete", "Closed"].includes(order.status);
}

function isImportantWorkOrder(order: WorkOrder) {
  return ["Critical", "High"].includes(order.priority) || ["New", "Waiting"].includes(order.status);
}

function getCurrentPerson(profile: Profile | undefined, personnel: PersonnelWithJob[]) {
  if (!profile) return null;

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

function getDefaultRequestDescription(type: string) {
  return `${type} request created from Operations Board.`;
}

function EquipmentCard({ item }: { item: Equipment }) {
  const style = equipmentTypeStyle(item.equipment_type, item.ownership_type);

  return (
    <div className={`flex gap-3 rounded-2xl border border-l-4 p-3 shadow-sm ${style.cardClass} ${style.accentClass}`}>
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border bg-white">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePath(item.photo_url)} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-400">NO IMG</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="font-black leading-tight">{item.name}</div>
          <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${equipmentStatusDot(item.status)}`} title={item.status} />
        </div>

        <div className="text-xs text-slate-500">#{item.equipment_number ?? "—"}</div>

        <div className={`mt-1 inline-block rounded-full border px-2 py-1 text-[10px] font-black uppercase ${style.badgeClass}`}>
          {item.ownership_type === "Rental" ? "Rental" : item.equipment_type ?? "Other"}
        </div>

        <div className="mt-1 text-xs font-black uppercase text-slate-600">{item.status}</div>

        {item.ownership_type === "Rental" && item.rental_company ? (
          <div className="text-xs font-bold text-pink-800">{item.rental_company}</div>
        ) : null}
      </div>
    </div>
  );
}

function CountBadge({ label, count, warn = false }: { label: string; count: number; warn?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-2 text-center ${warn ? "bg-red-100 text-red-800" : "bg-slate-100"}`}>
      <div className="text-2xl font-black">{count}</div>
      <div className="text-[10px] font-black uppercase text-slate-500">{label}</div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</div>;
}

function PhaseMiniCalendar({ phases }: { phases: NonNullable<Job["job_phases"]> }) {
  const sorted = [...phases].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (sorted.length === 0) return <p className="mt-2 text-sm text-slate-500">No phases set up.</p>;

  return (
    <div className="mt-2 space-y-2">
      {sorted.map((phase, index) => {
        const percent = Math.max(0, Math.min(100, phase.progress_percent ?? 0));

        return (
          <div key={phase.id ?? `${phase.name}-${index}`} className="rounded-xl border bg-white p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-3 w-3 shrink-0 rounded-full ${phaseColorClass(index)}`} />
                <div className="truncate text-sm font-black">{phase.name || phase.phase}</div>
              </div>
              <div className="text-sm font-black">{percent}%</div>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full ${phaseColorClass(index)}`} style={{ width: `${percent}%` }} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
              <div className="rounded-lg bg-slate-100 p-2">
                <div className="uppercase text-slate-400">Start</div>
                <div>{formatDate(phase.start_date)}</div>
              </div>
              <div className="rounded-lg bg-slate-100 p-2">
                <div className="uppercase text-slate-400">End</div>
                <div>{formatDate(phase.end_date)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EquipmentBoard({ equipment, jobs, personnel = [], workOrders = [], profile, onWorkOrdersChanged }: Props) {
  const personnelWithJob = personnel as PersonnelWithJob[];
  const currentPerson = getCurrentPerson(profile, personnelWithJob);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [quickRequestJobId, setQuickRequestJobId] = useState<string | null>(null);
  const [quickRequestType, setQuickRequestType] = useState<string>("Survey");
  const [quickRequestNote, setQuickRequestNote] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const activeJobs = jobs.filter((job) => job.active !== false);
  const assignedJobIds = new Set<string>();

  if (currentPerson) {
    for (const order of workOrders) {
      if (order.assigned_personnel_id === currentPerson.id && order.job_id && isOpenWorkOrder(order)) assignedJobIds.add(order.job_id);
    }

    for (const person of personnelWithJob) {
      if (person.id === currentPerson.id) {
        if (person.current_job_id) assignedJobIds.add(person.current_job_id);
        if (person.assigned_job_id) assignedJobIds.add(person.assigned_job_id);
      }
    }
  }

  const unassignedEquipment = equipment.filter((item) => !item.current_job_id);
  const unassignedOpenOrders = workOrders.filter((order) => !order.job_id && isOpenWorkOrder(order));

  const boardRows = useMemo(() => {
    return activeJobs
      .map((job) => {
        const assignedEquipment = equipment.filter((item) => item.current_job_id === job.id);
        const assignedPersonnel = personnelWithJob.filter(
          (person) => person.active !== false && (person.current_job_id === job.id || person.assigned_job_id === job.id)
        );
        const jobWorkOrders = workOrders.filter((order) => order.job_id === job.id);
        const openWorkOrders = jobWorkOrders.filter(isOpenWorkOrder);
        const importantOpenOrders = openWorkOrders.filter(isImportantWorkOrder);
        const sortedPhases = [...(job.job_phases ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const assignedToMe = assignedJobIds.has(job.id);

        return {
          job,
          assignedEquipment,
          assignedPersonnel,
          openWorkOrders,
          importantOpenOrders,
          sortedPhases,
          assignedToMe,
          sortScore: (assignedToMe ? 10000 : 0) + importantOpenOrders.length * 100 + openWorkOrders.length * 10 + assignedEquipment.length
        };
      })
      .sort((a, b) => b.sortScore - a.sortScore || a.job.name.localeCompare(b.job.name));
  }, [activeJobs, equipment, personnelWithJob, workOrders, assignedJobIds]);

  async function createQuickRequest(jobId: string, type: string) {
    const description = quickRequestNote.trim() || getDefaultRequestDescription(type);
    setQuickSaving(true);

    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          work_type: type,
          title: `${type} Request`,
          description,
          priority: "Medium",
          status: "New",
          assigned_personnel_id: null,
          related_equipment_id: null,
          due_date: null,
          custom_fields: {}
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not create request.");

      setQuickRequestJobId(null);
      setQuickRequestType("Survey");
      setQuickRequestNote("");
      await onWorkOrdersChanged?.();
      alert(`${type} request created.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not create request.");
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <section className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-2xl font-black">Operations Board</h2>
        <p className="mt-1 text-sm text-slate-500">
          Home screen for daily operations. Equipment cards are subtle; the small status dot shows active/down/transporting state.
        </p>
      </div>

      <div className="grid gap-4">
        {boardRows.map(({ job, assignedEquipment, assignedPersonnel, openWorkOrders, importantOpenOrders, sortedPhases, assignedToMe }) => {
          const expanded = expandedJobId === job.id;
          const foreman = assignedPersonnel.find((person) => person.position?.toLowerCase().includes("foreman")) ?? assignedPersonnel[0];

          return (
            <section key={job.id} className={`rounded-3xl border-l-8 bg-white p-4 shadow-sm ${assignedToMe ? "border-blue-600 ring-2 ring-blue-200" : "border-carpenter-red"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button className="text-left" onClick={() => setExpandedJobId(expanded ? null : job.id)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black">{expanded ? "▲" : "▼"}</span>
                    <h3 className="text-2xl font-black uppercase">{job.name}</h3>
                    {assignedToMe ? <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-800">My Job</span> : null}
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-500">{foreman ? `Foreman: ${foreman.full_name}` : "Foreman: not assigned"}</p>
                </button>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                  <CountBadge label="Personnel" count={assignedPersonnel.length} />
                  <CountBadge label="Equipment" count={assignedEquipment.length} />
                  <CountBadge label="Requests" count={openWorkOrders.length} warn={importantOpenOrders.length > 0} />
                </div>
              </div>

              <div className="mt-3">
                <h4 className="mb-2 text-sm font-black uppercase text-slate-500">Equipment on Job</h4>
                {assignedEquipment.length === 0 ? (
                  <EmptyBox text="No equipment assigned to this job." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {assignedEquipment.map((item) => <EquipmentCard key={item.id} item={item} />)}
                  </div>
                )}
              </div>

              {expanded ? (
                <div className="mt-4 grid gap-4 border-t pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => openUrl(job.dropbox_url)}>Open Project Files</button>
                    {QUICK_REQUESTS.map((type) => (
                      <button
                        key={type}
                        className={quickRequestJobId === job.id && quickRequestType === type ? "btn-primary" : "btn-secondary"}
                        onClick={() => {
                          setQuickRequestJobId(job.id);
                          setQuickRequestType(type);
                          setQuickRequestNote("");
                        }}
                      >
                        + {type}
                      </button>
                    ))}
                  </div>

                  {quickRequestJobId === job.id ? (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                      <h4 className="font-black">Create {quickRequestType} Request</h4>
                      <label className="label">Notes</label>
                      <textarea className="input min-h-20 bg-white" placeholder="What needs done?" value={quickRequestNote} onChange={(event) => setQuickRequestNote(event.target.value)} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="btn-primary" disabled={quickSaving} onClick={() => createQuickRequest(job.id, quickRequestType)}>
                          {quickSaving ? "Creating..." : "Create Request"}
                        </button>
                        <button className="btn-secondary" disabled={quickSaving} onClick={() => setQuickRequestJobId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border bg-slate-50 p-3">
                      <h4 className="font-black">Job Info</h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <div><span className="font-black">Address:</span> {job.address || "—"}</div>
                        <div><span className="font-black">Owner:</span> {job.owner || "—"}</div>
                        <div><span className="font-black">Site Contact:</span> {job.site_contact || "—"}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-slate-50 p-3 lg:col-span-2">
                      <h4 className="font-black">Phase Calendar</h4>
                      <PhaseMiniCalendar phases={sortedPhases} />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border bg-white p-3">
                      <h4 className="font-black">Personnel ({assignedPersonnel.length})</h4>
                      {assignedPersonnel.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">Personnel job assignment is not fully set up yet.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {assignedPersonnel.map((person) => (
                            <div key={person.id} className="rounded-xl bg-slate-50 p-2 text-sm">
                              <div className="font-black">{person.full_name}</div>
                              <div className="text-xs text-slate-500">{person.position || person.department || "Personnel"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border bg-white p-3">
                      <h4 className="font-black">Open Requests ({openWorkOrders.length})</h4>
                      {openWorkOrders.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">No open work orders for this job.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {openWorkOrders.slice(0, 6).map((order) => (
                            <div key={order.id} className="rounded-xl bg-slate-50 p-2 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getWorkOrderTypeColor(order.work_type)}`}>{order.work_type}</span>
                                <span className="text-[10px] font-black uppercase">{order.status}</span>
                              </div>
                              <div className="mt-1 font-black">{order.title}</div>
                              <div className="text-xs text-slate-500">{order.description || "No description"}</div>
                            </div>
                          ))}
                          {openWorkOrders.length > 6 ? <div className="text-xs font-black text-slate-500">+{openWorkOrders.length - 6} more open requests</div> : null}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border bg-white p-3">
                      <h4 className="font-black">Notes</h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{job.notes || "No job notes."}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}

        <section className="rounded-3xl border-l-8 border-slate-400 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-2xl font-black uppercase">Unassigned / Yard / Other</h3>
              <p className="text-sm text-slate-500">{unassignedEquipment.length} equipment not assigned to a job • {unassignedOpenOrders.length} open requests without a job</p>
            </div>
          </div>

          {unassignedEquipment.length === 0 ? (
            <EmptyBox text="No unassigned equipment." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {unassignedEquipment.map((item) => <EquipmentCard key={item.id} item={item} />)}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
