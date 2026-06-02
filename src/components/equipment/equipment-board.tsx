"use client";

import { useMemo, useState } from "react";
import type { Equipment, Job, Personnel, Profile, WorkOrder } from "@/lib/types";
import { EQUIPMENT_TYPES, equipmentStatusDot, equipmentTypeStyle } from "@/lib/equipment-types";
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
  onJobsChanged?: () => Promise<void> | void;
};

type PersonnelWithJob = Personnel & {
  current_job_id?: string | null;
  assigned_job_id?: string | null;
};

type PhaseLike = NonNullable<Job["job_phases"]>[number];


const QUICK_REQUESTS = ["Survey", "Maintenance", "Mobilization", "Trucking", "Foreman Assignment", "Office"] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PhaseForm = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  progress_percent: number | null;
  sort_order: number;
};

type JobEditForm = {
  name: string;
  address: string;
  owner: string;
  site_contact: string;
  dropbox_url: string;
  notes: string;
  phases: PhaseForm[];
};

function phasesFromJob(job: Job): PhaseForm[] {
  const phases = [...(job.job_phases ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (phases.length === 0) {
    return [
      "Earthwork",
      "Storm Drain",
      "Sewer",
      "Water",
      "Custom 1",
      "Custom 2"
    ].map((name, index) => ({
      name,
      start_date: null,
      end_date: null,
      progress_percent: 0,
      sort_order: index
    }));
  }

  return phases.map((phase, index) => ({
    name: phase.name || phase.phase || `Phase ${index + 1}`,
    start_date: phase.start_date,
    end_date: phase.end_date,
    progress_percent: phase.progress_percent ?? 0,
    sort_order: phase.sort_order ?? index
  }));
}

function jobEditFormFromJob(job: Job): JobEditForm {
  return {
    name: job.name ?? "",
    address: job.address ?? "",
    owner: job.owner ?? "",
    site_contact: job.site_contact ?? "",
    dropbox_url: job.dropbox_url ?? "",
    notes: job.notes ?? "",
    phases: phasesFromJob(job)
  };
}

function normalizeSaveUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}


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

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthTitle(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    days.push(next);
  }

  return days;
}

function phaseInitials(name: string | null | undefined) {
  const clean = (name ?? "").trim();
  if (!clean) return "PH";

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function getDefaultCalendarMonth(phases: PhaseLike[]) {
  const dated = phases
    .map((phase) => parseDate(phase.start_date))
    .filter((date): date is Date => Boolean(date));

  if (dated.length > 0) {
    const first = new Date(Math.min(...dated.map((date) => date.getTime())));
    return new Date(first.getFullYear(), first.getMonth(), 1);
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
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

function PhaseList({ phases }: { phases: PhaseLike[] }) {
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

function PhaseMonthCalendar({ phases }: { phases: PhaseLike[] }) {
  const sorted = [...phases].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const [visibleMonth, setVisibleMonth] = useState(() => getDefaultCalendarMonth(sorted));

  const datedPhases = sorted
    .map((phase, index) => ({
      phase,
      index,
      start: parseDate(phase.start_date),
      end: parseDate(phase.end_date)
    }))
    .filter((item): item is { phase: PhaseLike; index: number; start: Date; end: Date } => Boolean(item.start && item.end));

  if (datedPhases.length === 0) {
    return <EmptyBox text="Add phase start/end dates to show the construction calendar." />;
  }

  const days = buildMonthDays(visibleMonth);
  const today = new Date();

  function previousMonth() {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
  }

  function nextMonth() {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
  }

  function resetMonth() {
    setVisibleMonth(getDefaultCalendarMonth(sorted));
  }

  function phasesForDay(day: Date) {
    return datedPhases.filter(({ start, end }) => {
      const current = new Date(day);
      current.setHours(12, 0, 0, 0);
      return current >= start && current <= end;
    });
  }

  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-black">Construction Calendar</h4>
          <p className="text-xs font-bold text-slate-500">
            Colored phase chips show what is planned on each calendar day.
          </p>
        </div>

        <div className="flex gap-2">
          <button className="btn-secondary" onClick={previousMonth}>Prev</button>
          <button className="btn-secondary" onClick={resetMonth}>Project</button>
          <button className="btn-secondary" onClick={nextMonth}>Next</button>
        </div>
      </div>

      <div className="mt-3 text-center text-lg font-black">{monthTitle(visibleMonth)}</div>

      <div className="mt-3 grid grid-cols-7 overflow-hidden rounded-2xl border">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="border-b bg-slate-100 p-2 text-center text-xs font-black uppercase text-slate-600">
            {weekday}
          </div>
        ))}

        {days.map((day) => {
          const activePhases = phasesForDay(day);
          const inMonth = day.getMonth() === visibleMonth.getMonth();
          const isToday = isSameDate(day, today);

          return (
            <div
              key={dateKey(day)}
              className={`min-h-28 border-b border-r p-2 ${inMonth ? "bg-white" : "bg-slate-50 text-slate-400"} ${isToday ? "ring-2 ring-red-500 ring-inset" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`text-xs font-black ${isToday ? "rounded-full bg-red-600 px-2 py-1 text-white" : ""}`}>
                  {day.getDate()}
                </span>

                {activePhases.length > 0 ? (
                  <span className="text-[10px] font-black text-slate-400">
                    {activePhases.length}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                {activePhases.slice(0, 4).map(({ phase, index }) => {
                  const percent = Math.max(0, Math.min(100, phase.progress_percent ?? 0));
                  const label = phaseInitials(phase.name || phase.phase);

                  return (
                    <div
                      key={`${dateKey(day)}-${phase.id ?? index}`}
                      className={`truncate rounded-md px-1.5 py-1 text-[10px] font-black text-black ${phaseColorClass(index)}`}
                      title={`${phase.name || phase.phase} • ${formatDate(phase.start_date)} - ${formatDate(phase.end_date)} • ${percent}%`}
                    >
                      {label} {percent}%
                    </div>
                  );
                })}

                {activePhases.length > 4 ? (
                  <div className="text-[10px] font-black text-slate-500">
                    +{activePhases.length - 4} more
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {sorted.map((phase, index) => (
          <div key={phase.id ?? `${phase.name}-${index}`} className="flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-[10px] font-black">
            <span className={`h-3 w-3 rounded-full ${phaseColorClass(index)}`} />
            <span>{phaseInitials(phase.name || phase.phase)} = {phase.name || phase.phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EquipmentBoard({ equipment, jobs, personnel = [], workOrders = [], profile, onWorkOrdersChanged, onJobsChanged }: Props) {
  const personnelWithJob = personnel as PersonnelWithJob[];
  const currentPerson = getCurrentPerson(profile, personnelWithJob);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [quickRequestJobId, setQuickRequestJobId] = useState<string | null>(null);
  const [quickRequestType, setQuickRequestType] = useState<string>("Survey");
  const [quickRequestForm, setQuickRequestForm] = useState<Record<string, string>>({});
  const [quickSaving, setQuickSaving] = useState(false);
  const isAdmin = profile?.role === "admin";
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobEditForm, setJobEditForm] = useState<JobEditForm | null>(null);
  const [savingJob, setSavingJob] = useState(false);

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



  function openRequestForm(jobId: string, type: string) {
    setQuickRequestJobId(jobId);
    setQuickRequestType(type);
    setQuickRequestForm({});
  }

  function updateQuickRequestField(key: string, value: string) {
    setQuickRequestForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function closeRequestForm() {
    setQuickRequestJobId(null);
    setQuickRequestType("Survey");
    setQuickRequestForm({});
  }

  function getRequestTitle(type: string) {
    switch (type) {
      case "Survey":
        return "Survey Request";
      case "Maintenance":
        return "Maintenance Request";
      case "Mobilization":
        return "Mobilization Request";
      case "Trucking":
        return "Trucking Request";
      case "Foreman Assignment":
        return "Foreman Assignment";
      case "Office":
        return "Office Request";
      default:
        return `${type} Request`;
    }
  }

  function buildRequestPayload(jobId: string, type: string) {
    const fields = quickRequestForm;

    if (type === "Survey") {
      if (!fields.survey_type || !fields.location_details) {
        throw new Error("Survey request needs survey type and location/details.");
      }

      return {
        job_id: jobId,
        work_type: type,
        title: "Survey Request",
        description: fields.location_details,
        priority: fields.priority || "Medium",
        status: "New",
        assigned_personnel_id: null,
        related_equipment_id: null,
        due_date: fields.due_date || null,
        custom_fields: {
          survey_type: fields.survey_type
        }
      };
    }

    if (type === "Maintenance") {
      if (!fields.related_equipment_id || !fields.issue) {
        throw new Error("Maintenance request needs equipment and issue.");
      }

      return {
        job_id: jobId,
        work_type: type,
        title: "Maintenance Request",
        description: fields.issue,
        priority: fields.priority || "Medium",
        status: "New",
        assigned_personnel_id: null,
        related_equipment_id: fields.related_equipment_id,
        due_date: fields.due_date || null,
        custom_fields: {
          can_run: fields.can_run || ""
        }
      };
    }

    if (type === "Mobilization") {
      if (!fields.equipment_type_needed) {
        throw new Error("Mobilization request needs equipment type.");
      }

      return {
        job_id: jobId,
        work_type: type,
        title: "Mobilization Request",
        description: fields.notes || `${fields.equipment_type_needed} needed`,
        priority: fields.priority || "Medium",
        status: "New",
        assigned_personnel_id: null,
        related_equipment_id: null,
        due_date: fields.due_date || null,
        custom_fields: {
          equipment_type_needed: fields.equipment_type_needed,
          quantity: fields.quantity || "1"
        }
      };
    }

    if (type === "Trucking") {
      if (!fields.truck_count || !fields.load_count) {
        throw new Error("Trucking request needs # trucks and # loads.");
      }

      return {
        job_id: jobId,
        work_type: type,
        title: "Trucking Request",
        description: fields.notes || `${fields.truck_count} trucks / ${fields.load_count} loads`,
        priority: fields.priority || "Medium",
        status: "New",
        assigned_personnel_id: null,
        related_equipment_id: null,
        due_date: fields.due_date || null,
        custom_fields: {
          truck_count: fields.truck_count,
          load_count: fields.load_count,
          material: fields.material || ""
        }
      };
    }

    if (type === "Foreman Assignment") {
      return {
        job_id: jobId,
        work_type: type,
        title: "Foreman Assignment",
        description: fields.notes || "Assign foreman / crew.",
        priority: fields.priority || "Medium",
        status: "New",
        assigned_personnel_id: null,
        related_equipment_id: null,
        due_date: fields.due_date || null,
        custom_fields: {
          foreman_name: fields.foreman_name || ""
        }
      };
    }

    if (type === "Office") {
      if (!fields.request_details) {
        throw new Error("Office request needs what you need.");
      }

      return {
        job_id: jobId,
        work_type: type,
        title: "Office Request",
        description: fields.request_details,
        priority: fields.priority || "Medium",
        status: "New",
        assigned_personnel_id: null,
        related_equipment_id: null,
        due_date: fields.due_date || null,
        custom_fields: {}
      };
    }

    return {
      job_id: jobId,
      work_type: type,
      title: getRequestTitle(type),
      description: fields.notes || getDefaultRequestDescription(type),
      priority: fields.priority || "Medium",
      status: "New",
      assigned_personnel_id: null,
      related_equipment_id: null,
      due_date: fields.due_date || null,
      custom_fields: {}
    };
  }

  function startJobEdit(job: Job) {
    if (!isAdmin) return;
    setEditingJobId(job.id);
    setJobEditForm(jobEditFormFromJob(job));
  }

  function cancelJobEdit() {
    setEditingJobId(null);
    setJobEditForm(null);
  }

  function updateJobPhase(index: number, updates: Partial<PhaseForm>) {
    if (!jobEditForm) return;

    setJobEditForm({
      ...jobEditForm,
      phases: jobEditForm.phases.map((phase, phaseIndex) =>
        phaseIndex === index ? { ...phase, ...updates } : phase
      )
    });
  }

  function addJobPhase() {
    if (!jobEditForm) return;

    setJobEditForm({
      ...jobEditForm,
      phases: [
        ...jobEditForm.phases,
        {
          name: `Custom ${jobEditForm.phases.length + 1}`,
          start_date: null,
          end_date: null,
          progress_percent: 0,
          sort_order: jobEditForm.phases.length
        }
      ]
    });
  }

  function deleteJobPhase(index: number) {
    if (!jobEditForm) return;

    if (jobEditForm.phases.length <= 1) {
      alert("A job needs at least one phase.");
      return;
    }

    setJobEditForm({
      ...jobEditForm,
      phases: jobEditForm.phases
        .filter((_, phaseIndex) => phaseIndex !== index)
        .map((phase, phaseIndex) => ({ ...phase, sort_order: phaseIndex }))
    });
  }

  async function saveJobFromOperations(jobId: string) {
    if (!isAdmin) return alert("Admin only.");
    if (!jobEditForm) return;
    if (!jobEditForm.name.trim()) return alert("Job name is required.");

    const cleanPhases = jobEditForm.phases
      .map((phase, index) => ({
        ...phase,
        name: phase.name.trim(),
        progress_percent: Math.max(0, Math.min(100, Number(phase.progress_percent) || 0)),
        sort_order: index
      }))
      .filter((phase) => phase.name.length > 0);

    if (cleanPhases.length === 0) {
      return alert("At least one phase is required.");
    }

    setSavingJob(true);

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...jobEditForm,
          dropbox_url: normalizeSaveUrl(jobEditForm.dropbox_url) || null,
          phases: cleanPhases
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");

      await onJobsChanged?.();
      setEditingJobId(null);
      setJobEditForm(null);
      alert("Job info saved.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingJob(false);
    }
  }

  async function createQuickRequest(jobId: string, type: string) {
    setQuickSaving(true);

    try {
      const payload = buildRequestPayload(jobId, type);

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not create request.");

      closeRequestForm();
      await onWorkOrdersChanged?.();
      alert(`${type} request created.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not create request.");
    } finally {
      setQuickSaving(false);
    }
  }

  function RequestFormFields({ jobId }: { jobId: string }) {
    const jobEquipment = equipment.filter((item) => item.current_job_id === jobId);

    const priorityField = (
      <div>
        <label className="label">Priority</label>
        <select
          className="input bg-white"
          value={quickRequestForm.priority ?? "Medium"}
          onChange={(event) => updateQuickRequestField("priority", event.target.value)}
        >
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
    );

    const dueDateField = (
      <div>
        <label className="label">Need By</label>
        <input
          className="input bg-white"
          type="date"
          value={quickRequestForm.due_date ?? ""}
          onChange={(event) => updateQuickRequestField("due_date", event.target.value)}
        />
      </div>
    );

    if (quickRequestType === "Survey") {
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Survey Type *</label>
              <select
                className="input bg-white"
                value={quickRequestForm.survey_type ?? ""}
                onChange={(event) => updateQuickRequestField("survey_type", event.target.value)}
              >
                <option value="">Select</option>
                <option value="Stakeout">Stakeout</option>
                <option value="As-Built">As-Built</option>
                <option value="Topo">Topo</option>
                <option value="Control">Control</option>
                <option value="Model Check">Model Check</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {dueDateField}
            {priorityField}
          </div>

          <div>
            <label className="label">Location / What Needed *</label>
            <textarea
              className="input min-h-24 bg-white"
              placeholder="Example: Stake MH-12 to MH-15 sewer, curb line at west entrance, as-built storm run..."
              value={quickRequestForm.location_details ?? ""}
              onChange={(event) => updateQuickRequestField("location_details", event.target.value)}
            />
          </div>
        </div>
      );
    }

    if (quickRequestType === "Maintenance") {
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Equipment *</label>
              <select
                className="input bg-white"
                value={quickRequestForm.related_equipment_id ?? ""}
                onChange={(event) => updateQuickRequestField("related_equipment_id", event.target.value)}
              >
                <option value="">Select equipment</option>
                {jobEquipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} #{item.equipment_number ?? "—"}
                  </option>
                ))}
                {equipment
                  .filter((item) => item.current_job_id !== jobId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} #{item.equipment_number ?? "—"} (Other)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">Can it run?</label>
              <select
                className="input bg-white"
                value={quickRequestForm.can_run ?? ""}
                onChange={(event) => updateQuickRequestField("can_run", event.target.value)}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No - Down">No - Down</option>
                <option value="Barely / Needs checked">Barely / Needs checked</option>
              </select>
            </div>

            {priorityField}
          </div>

          <div>
            <label className="label">Issue *</label>
            <textarea
              className="input min-h-24 bg-white"
              placeholder="Example: hydraulic leak, flat tire, won't start, service needed..."
              value={quickRequestForm.issue ?? ""}
              onChange={(event) => updateQuickRequestField("issue", event.target.value)}
            />
          </div>
        </div>
      );
    }

    if (quickRequestType === "Mobilization") {
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="label">Equipment Type *</label>
              <select
                className="input bg-white"
                value={quickRequestForm.equipment_type_needed ?? ""}
                onChange={(event) => updateQuickRequestField("equipment_type_needed", event.target.value)}
              >
                <option value="">Select type</option>
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Quantity</label>
              <input
                className="input bg-white"
                placeholder="1"
                value={quickRequestForm.quantity ?? ""}
                onChange={(event) => updateQuickRequestField("quantity", event.target.value)}
              />
            </div>

            {dueDateField}
            {priorityField}
          </div>

          <div>
            <label className="label">Move Notes</label>
            <textarea
              className="input min-h-20 bg-white"
              placeholder="Where from, where to, timing, access notes..."
              value={quickRequestForm.notes ?? ""}
              onChange={(event) => updateQuickRequestField("notes", event.target.value)}
            />
          </div>
        </div>
      );
    }

    if (quickRequestType === "Trucking") {
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="label"># Trucks *</label>
              <input
                className="input bg-white"
                placeholder="4"
                value={quickRequestForm.truck_count ?? ""}
                onChange={(event) => updateQuickRequestField("truck_count", event.target.value)}
              />
            </div>

            <div>
              <label className="label"># Loads *</label>
              <input
                className="input bg-white"
                placeholder="120"
                value={quickRequestForm.load_count ?? ""}
                onChange={(event) => updateQuickRequestField("load_count", event.target.value)}
              />
            </div>

            <div>
              <label className="label">Material</label>
              <input
                className="input bg-white"
                placeholder="Dirt, rock, select fill"
                value={quickRequestForm.material ?? ""}
                onChange={(event) => updateQuickRequestField("material", event.target.value)}
              />
            </div>

            {dueDateField}
          </div>

          <div>
            <label className="label">Haul Notes</label>
            <textarea
              className="input min-h-20 bg-white"
              placeholder="From/to, start time, truck type, dump location..."
              value={quickRequestForm.notes ?? ""}
              onChange={(event) => updateQuickRequestField("notes", event.target.value)}
            />
          </div>
        </div>
      );
    }

    if (quickRequestType === "Foreman Assignment") {
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Requested Foreman</label>
              <input
                className="input bg-white"
                placeholder="Optional"
                value={quickRequestForm.foreman_name ?? ""}
                onChange={(event) => updateQuickRequestField("foreman_name", event.target.value)}
              />
            </div>
            {dueDateField}
            {priorityField}
          </div>

          <div>
            <label className="label">Crew / Assignment Notes</label>
            <textarea
              className="input min-h-20 bg-white"
              placeholder="Start date, crew needs, special instructions..."
              value={quickRequestForm.notes ?? ""}
              onChange={(event) => updateQuickRequestField("notes", event.target.value)}
            />
          </div>
        </div>
      );
    }

    if (quickRequestType === "Office") {
      return (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {dueDateField}
            {priorityField}
          </div>

          <div>
            <label className="label">What do you need? *</label>
            <textarea
              className="input min-h-24 bg-white"
              placeholder="Plans, paperwork, contact info, ticket, invoice, permit, etc."
              value={quickRequestForm.request_details ?? ""}
              onChange={(event) => updateQuickRequestField("request_details", event.target.value)}
            />
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input min-h-20 bg-white"
          placeholder="What needs done?"
          value={quickRequestForm.notes ?? ""}
          onChange={(event) => updateQuickRequestField("notes", event.target.value)}
        />
      </div>
    );
  }

  return (
    <section className="mt-4 space-y-4">
      <div className="card">
        <h2 className="text-2xl font-black">Operations Board</h2>
        <p className="mt-1 text-sm text-slate-500">
          Home screen for daily operations. Expand a job to see project files, construction calendar, and quick request buttons.
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
                        onClick={() => openRequestForm(job.id, type)}
                      >
                        + {type}
                      </button>
                    ))}
                  </div>

                  {quickRequestJobId === job.id ? (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="font-black">Create {quickRequestType} Request</h4>
                          <p className="text-xs font-bold text-slate-600">
                            This opens the correct form for the selected department and preloads this job.
                          </p>
                        </div>
                        <button className="btn-secondary" disabled={quickSaving} onClick={closeRequestForm}>
                          Close
                        </button>
                      </div>

                      <div className="mt-3 rounded-2xl border bg-white/70 p-3">
                        <RequestFormFields jobId={job.id} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="btn-primary" disabled={quickSaving} onClick={() => createQuickRequest(job.id, quickRequestType)}>
                          {quickSaving ? "Creating..." : `Submit ${quickRequestType} Request`}
                        </button>
                        <button className="btn-secondary" disabled={quickSaving} onClick={closeRequestForm}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 xl:grid-cols-[1.1fr_1.7fr]">
                    <div className="rounded-2xl border bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-black">Job Info</h4>
                        {isAdmin && editingJobId !== job.id ? (
                          <button className="btn-secondary" onClick={() => startJobEdit(job)}>
                            Edit Job Info
                          </button>
                        ) : null}
                      </div>

                      {isAdmin && editingJobId === job.id && jobEditForm ? (
                        <div className="mt-3 space-y-3">
                          <label className="label">Job Name</label>
                          <input
                            className="input bg-white"
                            value={jobEditForm.name}
                            onChange={(event) => setJobEditForm({ ...jobEditForm, name: event.target.value })}
                          />

                          <label className="label">Address</label>
                          <input
                            className="input bg-white"
                            value={jobEditForm.address}
                            onChange={(event) => setJobEditForm({ ...jobEditForm, address: event.target.value })}
                          />

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="label">Owner</label>
                              <input
                                className="input bg-white"
                                value={jobEditForm.owner}
                                onChange={(event) => setJobEditForm({ ...jobEditForm, owner: event.target.value })}
                              />
                            </div>

                            <div>
                              <label className="label">Site Contact</label>
                              <input
                                className="input bg-white"
                                value={jobEditForm.site_contact}
                                onChange={(event) => setJobEditForm({ ...jobEditForm, site_contact: event.target.value })}
                              />
                            </div>
                          </div>

                          <label className="label">Project Files Link</label>
                          <input
                            className="input bg-white"
                            placeholder="Paste Dropbox/project folder URL"
                            value={jobEditForm.dropbox_url}
                            onChange={(event) => setJobEditForm({ ...jobEditForm, dropbox_url: event.target.value })}
                          />

                          <label className="label">Notes</label>
                          <textarea
                            className="input min-h-24 bg-white"
                            value={jobEditForm.notes}
                            onChange={(event) => setJobEditForm({ ...jobEditForm, notes: event.target.value })}
                          />

                          <div className="rounded-2xl border bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-black">Phases</h4>
                              <button className="btn-secondary" onClick={addJobPhase}>+ Add Phase</button>
                            </div>

                            <div className="mt-3 space-y-3">
                              {jobEditForm.phases.map((phase, index) => (
                                <div key={index} className="rounded-xl border bg-slate-50 p-3">
                                  <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_90px_auto]">
                                    <div>
                                      <label className="label mt-0">Phase</label>
                                      <input
                                        className="input bg-white"
                                        value={phase.name}
                                        onChange={(event) => updateJobPhase(index, { name: event.target.value })}
                                      />
                                    </div>

                                    <div>
                                      <label className="label mt-0">Start</label>
                                      <input
                                        className="input bg-white"
                                        type="date"
                                        value={phase.start_date ?? ""}
                                        onChange={(event) => updateJobPhase(index, { start_date: event.target.value || null })}
                                      />
                                    </div>

                                    <div>
                                      <label className="label mt-0">End</label>
                                      <input
                                        className="input bg-white"
                                        type="date"
                                        value={phase.end_date ?? ""}
                                        onChange={(event) => updateJobPhase(index, { end_date: event.target.value || null })}
                                      />
                                    </div>

                                    <div>
                                      <label className="label mt-0">%</label>
                                      <input
                                        className="input bg-white"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={phase.progress_percent ?? 0}
                                        onChange={(event) => updateJobPhase(index, { progress_percent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })}
                                      />
                                    </div>

                                    <div className="flex items-end">
                                      <button className="btn-danger w-full" onClick={() => deleteJobPhase(index)}>
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button className="btn-primary" disabled={savingJob} onClick={() => saveJobFromOperations(job.id)}>
                              {savingJob ? "Saving..." : "Save Job Info"}
                            </button>
                            <button className="btn-secondary" disabled={savingJob} onClick={cancelJobEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 space-y-1 text-sm">
                            <div><span className="font-black">Address:</span> {job.address || "—"}</div>
                            <div><span className="font-black">Owner:</span> {job.owner || "—"}</div>
                            <div><span className="font-black">Site Contact:</span> {job.site_contact || "—"}</div>
                          </div>

                          <div className="mt-4">
                            <h4 className="font-black">Phase Details</h4>
                            <PhaseList phases={sortedPhases} />
                          </div>
                        </>
                      )}
                    </div>

                    <PhaseMonthCalendar phases={sortedPhases} />
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
