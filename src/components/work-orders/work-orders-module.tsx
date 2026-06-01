"use client";

import { useMemo, useState } from "react";
import type { Equipment, Job, Personnel, WorkOrder } from "@/lib/types";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_TYPES,
  getWorkOrderTypeColor
} from "@/lib/work-orders";

type Props = {
  workOrders: WorkOrder[];
  jobs: Job[];
  equipment: Equipment[];
  personnel: Personnel[];
  isAdmin: boolean;
  onWorkOrdersChanged: () => Promise<void> | void;
};

const emptyForm = {
  job_id: "",
  work_type: "Survey",
  title: "",
  description: "",
  priority: "Medium",
  status: "New",
  assigned_personnel_id: "",
  related_equipment_id: "",
  due_date: "",
  custom_fields: {} as Record<string, string>
};

function getDefaultTitle(workType: string) {
  switch (workType) {
    case "Survey":
      return "Survey Request";
    case "Maintenance":
      return "Maintenance Request";
    case "Mobilization":
      return "Move Equipment";
    case "Trucking":
      return "Trucking Request";
    case "Foreman Assignment":
      return "Assign Foreman";
    case "Office":
      return "Office Request";
    default:
      return "General Work Order";
  }
}

function getSimplePrompt(workType: string) {
  switch (workType) {
    case "Survey":
      return "What do you need surveyed or staked?";
    case "Maintenance":
      return "What is wrong?";
    case "Mobilization":
      return "What needs moved?";
    case "Trucking":
      return "What hauling/trucking do you need?";
    case "Foreman Assignment":
      return "Who needs assigned to this job?";
    case "Office":
      return "What do you need from the office?";
    default:
      return "What needs done?";
  }
}

function CustomFields({
  workType,
  fields,
  update
}: {
  workType: string;
  fields: Record<string, string>;
  update: (key: string, value: string) => void;
}) {
  if (workType === "Survey") {
    return (
      <div className="grid gap-3">
        <div>
          <label className="label">Survey Type</label>
          <select className="input" value={fields.survey_type ?? ""} onChange={(e) => update("survey_type", e.target.value)}>
            <option value="">Select</option>
            <option value="Stakeout">Stakeout</option>
            <option value="Topo / Asbuilt">Topo / Asbuilt</option>
            <option value="Control">Control</option>
            <option value="Machine Model / Surface Check">Machine Model / Surface Check</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Area / Station / Line</label>
          <input className="input" placeholder="MH-12 to MH-15, north entrance curb, etc." value={fields.area ?? ""} onChange={(e) => update("area", e.target.value)} />
        </div>
        <div>
          <label className="label">Plan / Dropbox Link</label>
          <input className="input" placeholder="Optional" value={fields.plan_link ?? ""} onChange={(e) => update("plan_link", e.target.value)} />
        </div>
      </div>
    );
  }

  if (workType === "Maintenance") {
    return (
      <div className="grid gap-3">
        <div>
          <label className="label">Can it still run?</label>
          <select className="input" value={fields.can_run ?? ""} onChange={(e) => update("can_run", e.target.value)}>
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No - Down">No - Down</option>
            <option value="Barely / Needs checked">Barely / Needs checked</option>
          </select>
        </div>
        <div>
          <label className="label">Issue</label>
          <input className="input" placeholder="Hydraulic leak, flat tire, won't start" value={fields.issue ?? ""} onChange={(e) => update("issue", e.target.value)} />
        </div>
        <div>
          <label className="label">Photo / Notes Link</label>
          <input className="input" placeholder="Optional" value={fields.photo_link ?? ""} onChange={(e) => update("photo_link", e.target.value)} />
        </div>
      </div>
    );
  }

  if (workType === "Mobilization") {
    return (
      <div className="grid gap-3">
        <div>
          <label className="label">From</label>
          <input className="input" placeholder="Current job, yard, shop, etc." value={fields.from_location ?? ""} onChange={(e) => update("from_location", e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" placeholder="Destination job or site" value={fields.to_location ?? ""} onChange={(e) => update("to_location", e.target.value)} />
        </div>
        <div>
          <label className="label">When needed?</label>
          <input className="input" placeholder="Tomorrow morning, before lunch, ASAP" value={fields.when_needed ?? ""} onChange={(e) => update("when_needed", e.target.value)} />
        </div>
      </div>
    );
  }

  if (workType === "Trucking") {
    return (
      <div className="grid gap-3">
        <div>
          <label className="label">Material</label>
          <input className="input" placeholder="Dirt, rock, asphalt, select fill, etc." value={fields.material ?? ""} onChange={(e) => update("material", e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">From</label>
            <input className="input" value={fields.from_location ?? ""} onChange={(e) => update("from_location", e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" value={fields.to_location ?? ""} onChange={(e) => update("to_location", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Truck Count</label>
            <input className="input" placeholder="4 quads" value={fields.truck_count ?? ""} onChange={(e) => update("truck_count", e.target.value)} />
          </div>
          <div>
            <label className="label">Start Time</label>
            <input className="input" placeholder="7 AM" value={fields.start_time ?? ""} onChange={(e) => update("start_time", e.target.value)} />
          </div>
        </div>
      </div>
    );
  }

  if (workType === "Foreman Assignment") {
    return (
      <div className="grid gap-3">
        <div>
          <label className="label">Foreman Requested</label>
          <input className="input" placeholder="Name or leave blank if unknown" value={fields.foreman_name ?? ""} onChange={(e) => update("foreman_name", e.target.value)} />
        </div>
        <div>
          <label className="label">Start Date / Time</label>
          <input className="input" placeholder="Monday morning" value={fields.start_when ?? ""} onChange={(e) => update("start_when", e.target.value)} />
        </div>
        <div>
          <label className="label">Crew Notes</label>
          <input className="input" placeholder="Pipe crew, grading crew, etc." value={fields.crew_notes ?? ""} onChange={(e) => update("crew_notes", e.target.value)} />
        </div>
      </div>
    );
  }

  if (workType === "Office") {
    return (
      <div className="grid gap-3">
        <div>
          <label className="label">Office Request Type</label>
          <select className="input" value={fields.office_type ?? ""} onChange={(e) => update("office_type", e.target.value)}>
            <option value="">Select</option>
            <option value="Plans / Documents">Plans / Documents</option>
            <option value="Submittal / Paperwork">Submittal / Paperwork</option>
            <option value="Billing / Ticket">Billing / Ticket</option>
            <option value="Contact Info">Contact Info</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">What info/document is needed?</label>
          <input className="input" value={fields.office_need ?? ""} onChange={(e) => update("office_need", e.target.value)} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="label">Extra Details</label>
      <input className="input" value={fields.extra_notes ?? ""} onChange={(e) => update("extra_notes", e.target.value)} />
    </div>
  );
}

export function WorkOrdersModule({ workOrders, jobs, equipment, personnel, isAdmin, onWorkOrdersChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | "new">(workOrders[0]?.id ?? "new");
  const selected = workOrders.find((order) => order.id === selectedId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState("All");

  const [form, setForm] = useState(() =>
    selected
      ? {
          job_id: selected.job_id ?? "",
          work_type: selected.work_type,
          title: selected.title,
          description: selected.description ?? "",
          priority: selected.priority,
          status: selected.status,
          assigned_personnel_id: selected.assigned_personnel_id ?? "",
          related_equipment_id: selected.related_equipment_id ?? "",
          due_date: selected.due_date ?? "",
          custom_fields: (selected.custom_fields ?? {}) as Record<string, string>
        }
      : emptyForm
  );

  const jobNameById = useMemo(() => new Map(jobs.map((job) => [job.id, job.name])), [jobs]);
  const personNameById = useMemo(() => new Map(personnel.map((p) => [p.id, p.full_name])), [personnel]);
  const filteredOrders = workOrders.filter((order) => filter === "All" || order.work_type === filter);

  function selectOrder(order: WorkOrder | "new") {
    if (order === "new") {
      setSelectedId("new");
      setForm(emptyForm);
      return;
    }

    setSelectedId(order.id);
    setForm({
      job_id: order.job_id ?? "",
      work_type: order.work_type,
      title: order.title,
      description: order.description ?? "",
      priority: order.priority,
      status: order.status,
      assigned_personnel_id: order.assigned_personnel_id ?? "",
      related_equipment_id: order.related_equipment_id ?? "",
      due_date: order.due_date ?? "",
      custom_fields: (order.custom_fields ?? {}) as Record<string, string>
    });
  }

  function setWorkType(type: string) {
    setForm({
      ...form,
      work_type: type,
      title: form.title || getDefaultTitle(type),
      custom_fields: {}
    });
  }

  function updateCustomField(key: string, value: string) {
    setForm({
      ...form,
      custom_fields: {
        ...form.custom_fields,
        [key]: value
      }
    });
  }

  async function saveWorkOrder() {
    const title = form.title.trim() || getDefaultTitle(form.work_type);
    if (!form.description.trim()) return alert("Please answer the main question.");

    setSaving(true);

    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/work-orders" : `/api/work-orders/${selectedId}`;

      const payload = {
        ...form,
        title,
        job_id: form.job_id || null,
        assigned_personnel_id: form.assigned_personnel_id || null,
        related_equipment_id: form.related_equipment_id || null,
        due_date: form.due_date || null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");

      await onWorkOrdersChanged();
      if (data?.id) setSelectedId(data.id);

      alert("Work order saved.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkOrder() {
    if (!isAdmin) return alert("Admin only.");
    if (selectedId === "new") return;

    const ok = confirm(`Delete work order "${selected?.title ?? "this work order"}"?`);
    if (!ok) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/work-orders/${selectedId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Delete failed.");

      await onWorkOrdersChanged();
      selectOrder("new");
      alert("Work order deleted.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[440px_1fr]">
      <aside className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Work Orders</h2>
          <button className="btn-primary" onClick={() => selectOrder("new")}>New</button>
        </div>

        <label className="label">Filter</label>
        <select className="input" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="All">All</option>
          {WORK_ORDER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>

        <div className="mt-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No work orders yet.</p>
          ) : (
            filteredOrders.map((order) => (
              <button
                key={order.id}
                className={`w-full rounded-2xl border p-3 text-left ${selectedId === order.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
                onClick={() => selectOrder(order)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getWorkOrderTypeColor(order.work_type)}`}>
                    {order.work_type}
                  </span>
                  <span className="text-xs font-black uppercase">{order.status}</span>
                </div>

                <div className="mt-2 font-black">{order.title}</div>
                <div className="text-xs text-slate-500">{order.job_id ? jobNameById.get(order.job_id) ?? "Job" : "No job"}</div>
                <div className="text-xs text-slate-500">Assigned: {order.assigned_personnel_id ? personNameById.get(order.assigned_personnel_id) ?? "Person" : "Unassigned"}</div>
                <div className="mt-1 text-xs font-bold">Priority: {order.priority}</div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">{selectedId === "new" ? "New Work Order" : "Work Order Info"}</h2>
          {isAdmin && selectedId !== "new" ? (
            <button className="btn-danger" disabled={deleting} onClick={deleteWorkOrder}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {WORK_ORDER_TYPES.map((type) => (
            <button
              key={type}
              className={`rounded-2xl border px-3 py-3 text-sm font-black ${form.work_type === type ? getWorkOrderTypeColor(type) : "border-slate-200 bg-white text-slate-700"}`}
              onClick={() => setWorkType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <label className="label">Job</label>
        <select className="input" value={form.job_id} onChange={(event) => setForm({ ...form, job_id: event.target.value })}>
          <option value="">No job / general</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
        </select>

        <label className="label">Main Question</label>
        <textarea
          className="input min-h-24 text-base"
          placeholder={getSimplePrompt(form.work_type)}
          value={form.description}
          onChange={(event) => {
            const value = event.target.value;
            setForm({
              ...form,
              description: value,
              title: form.title || getDefaultTitle(form.work_type)
            });
          }}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              {WORK_ORDER_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {WORK_ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Need By</label>
            <input className="input" type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Assign To</label>
            <select className="input" value={form.assigned_personnel_id} onChange={(event) => setForm({ ...form, assigned_personnel_id: event.target.value })}>
              <option value="">Unassigned</option>
              {personnel.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Related Equipment</label>
            <select className="input" value={form.related_equipment_id} onChange={(event) => setForm({ ...form, related_equipment_id: event.target.value })}>
              <option value="">None</option>
              {equipment.map((item) => <option key={item.id} value={item.id}>{item.name} #{item.equipment_number ?? "—"}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-slate-50 p-3">
          <h3 className="font-black">{form.work_type} Details</h3>
          <p className="mt-1 text-xs text-slate-500">Short form. Only the questions needed for this department.</p>
          <div className="mt-3">
            <CustomFields workType={form.work_type} fields={form.custom_fields} update={updateCustomField} />
          </div>
        </div>

        <div className="mt-4">
          <button className="btn-primary w-full sm:w-auto" disabled={saving} onClick={saveWorkOrder}>
            {saving ? "Saving..." : "Submit Work Order"}
          </button>
        </div>
      </section>
    </section>
  );
}
