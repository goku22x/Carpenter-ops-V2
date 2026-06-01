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

function getCustomFieldLabels(type: string) {
  switch (type) {
    case "Survey":
      return [
        ["survey_scope", "Survey Scope / Stakeout Needed"],
        ["station_range", "Station / Area"],
        ["plan_link", "Plan / Dropbox Link"]
      ];
    case "Maintenance":
      return [
        ["issue", "Issue"],
        ["symptoms", "Symptoms / Notes"],
        ["downtime_impact", "Downtime Impact"]
      ];
    case "Mobilization":
      return [
        ["from_location", "From Location"],
        ["to_location", "To Location"],
        ["needed_by_time", "Needed By Time"]
      ];
    case "Trucking":
      return [
        ["material", "Material"],
        ["from_location", "From"],
        ["to_location", "To"],
        ["truck_count", "Truck Count"]
      ];
    case "Foreman Assignment":
      return [
        ["assignment_reason", "Assignment Reason"],
        ["start_date", "Start Date"],
        ["crew_notes", "Crew Notes"]
      ];
    case "Office":
      return [
        ["office_category", "Office Category"],
        ["document_needed", "Document / Info Needed"]
      ];
    default:
      return [["extra_notes", "Extra Notes"]];
  }
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
  const equipmentNameById = useMemo(() => new Map(equipment.map((e) => [e.id, `${e.name} #${e.equipment_number ?? "—"}`])), [equipment]);

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
    if (!form.title.trim()) return alert("Title is required.");

    setSaving(true);

    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/work-orders" : `/api/work-orders/${selectedId}`;

      const payload = {
        ...form,
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
          <button className="btn-primary" onClick={() => selectOrder("new")}>New Work Order</button>
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
              {deleting ? "Deleting..." : "Delete Work Order"}
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Work Type</label>
            <select
              className="input"
              value={form.work_type}
              onChange={(event) => setForm({ ...form, work_type: event.target.value, custom_fields: {} })}
            >
              {WORK_ORDER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Job</label>
            <select className="input" value={form.job_id} onChange={(event) => setForm({ ...form, job_id: event.target.value })}>
              <option value="">No job / general</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
            </select>
          </div>
        </div>

        <label className="label">Title</label>
        <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />

        <label className="label">Description</label>
        <textarea className="input min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />

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
            <label className="label">Due Date</label>
            <input className="input" type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Assigned To</label>
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
          <h3 className="font-black">Custom Fields: {form.work_type}</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {getCustomFieldLabels(form.work_type).map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  value={form.custom_fields[key] ?? ""}
                  onChange={(event) => updateCustomField(key, event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button className="btn-primary" disabled={saving} onClick={saveWorkOrder}>
            {saving ? "Saving..." : "Save Work Order"}
          </button>
        </div>
      </section>
    </section>
  );
}
