"use client";

import { useMemo, useState } from "react";
import type { Equipment, Job, Personnel, WorkOrder } from "@/lib/types";
import { EQUIPMENT_TYPES } from "@/lib/equipment-types";
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
  title: "Survey Request",
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
    case "Survey": return "Survey Request";
    case "Maintenance": return "Maintenance Request";
    case "Mobilization": return "Mobilization Request";
    case "Trucking": return "Trucking Request";
    case "Foreman Assignment": return "Foreman Assignment";
    case "Office": return "Office Request";
    default: return "General Work Order";
  }
}

function routeDepartment(workType: string) {
  switch (workType) {
    case "Survey": return "Survey";
    case "Maintenance": return "Maintenance";
    case "Mobilization": return "Mobilization";
    case "Trucking": return "Trucks";
    case "Foreman Assignment": return "Earthwork";
    case "Office": return "Office";
    default: return "Other";
  }
}

function inferJobFromEquipment(equipment: Equipment[], equipmentId: string) {
  return equipment.find((eq) => eq.id === equipmentId)?.current_job_id ?? "";
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

  const queueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const type of WORK_ORDER_TYPES) counts.set(type, 0);
    for (const order of workOrders) counts.set(order.work_type, (counts.get(order.work_type) ?? 0) + 1);
    return counts;
  }, [workOrders]);

  const filteredOrders = workOrders.filter((order) => filter === "All" || order.work_type === filter);

  const assignablePersonnel = useMemo(() => {
    const department = routeDepartment(form.work_type);
    return personnel.filter((person) => {
      if (!person.active) return false;
      if (department === "Other") return true;
      return person.department === department || person.position === department;
    });
  }, [personnel, form.work_type]);

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
      ...emptyForm,
      work_type: type,
      title: getDefaultTitle(type),
      priority: form.priority || "Medium",
      status: selectedId === "new" ? "New" : form.status
    });
  }

  function updateCustomField(key: string, value: string) {
    setForm({
      ...form,
      custom_fields: { ...form.custom_fields, [key]: value }
    });
  }

  function updateRelatedEquipment(equipmentId: string) {
    const inferredJobId = inferJobFromEquipment(equipment, equipmentId);
    setForm({
      ...form,
      related_equipment_id: equipmentId,
      job_id: form.work_type === "Maintenance" && inferredJobId ? inferredJobId : form.job_id
    });
  }

  async function saveWorkOrder() {
    const title = getDefaultTitle(form.work_type);
    let description = form.description.trim();

    if (form.work_type === "Survey") {
      if (!form.job_id || !form.custom_fields.survey_type || !description) return alert("Survey needs job, survey type, and location/details.");
    }
    if (form.work_type === "Maintenance") {
      if (!form.related_equipment_id || !description) return alert("Maintenance needs equipment and issue.");
    }
    if (form.work_type === "Mobilization") {
      if (!form.job_id || !form.custom_fields.equipment_type_needed) return alert("Mobilization needs job and equipment type.");
      description = description || `${form.custom_fields.equipment_type_needed} needed`;
    }
    if (form.work_type === "Trucking") {
      if (!form.job_id || !form.custom_fields.truck_count || !form.custom_fields.load_count) return alert("Trucking needs job, # trucks, and # loads.");
      description = description || `${form.custom_fields.truck_count} trucks / ${form.custom_fields.load_count} loads`;
    }
    if (form.work_type === "Foreman Assignment") {
      if (!form.job_id) return alert("Foreman assignment needs a job.");
      description = description || form.custom_fields.foreman_name || "Assign foreman";
    }
    if (form.work_type === "Office") {
      if (!description) return alert("Office request needs what you need.");
    }

    setSaving(true);
    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/work-orders" : `/api/work-orders/${selectedId}`;

      const payload = {
        ...form,
        title,
        description,
        job_id: form.job_id || null,
        assigned_personnel_id: isAdmin ? form.assigned_personnel_id || null : null,
        related_equipment_id: form.related_equipment_id || null,
        due_date: form.due_date || null,
        status: isAdmin ? form.status : "New"
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
      alert("Work order submitted.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkOrder() {
    if (!isAdmin) return alert("Admin only.");
    if (selectedId === "new") return;

    const ok = confirm(`Delete "${selected?.title ?? "this work order"}"?`);
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

  function JobField({ required = false }: { required?: boolean }) {
    return (
      <div>
        <label className="label">Job{required ? " *" : ""}</label>
        <select className="input text-base" value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })}>
          <option value="">Select job</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
        </select>
      </div>
    );
  }

  function NeedByField() {
    return (
      <div>
        <label className="label">Need By</label>
        <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>
    );
  }

  function PriorityField() {
    return (
      <div>
        <label className="label">Priority</label>
        <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {WORK_ORDER_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </select>
      </div>
    );
  }

  function AdminControls() {
    if (!isAdmin) return null;

    return (
      <div className="mt-4 rounded-2xl border border-slate-300 bg-slate-50 p-3">
        <h3 className="font-black">Admin Controls</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {WORK_ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assign To ({routeDepartment(form.work_type)})</label>
            <select className="input" value={form.assigned_personnel_id} onChange={(e) => setForm({ ...form, assigned_personnel_id: e.target.value })}>
              <option value="">Unassigned</option>
              {assignablePersonnel.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
            {assignablePersonnel.length === 0 ? (
              <p className="mt-1 text-xs font-bold text-red-700">No active personnel found for this department.</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  function FormBody() {
    if (form.work_type === "Survey") {
      return (
        <div className="space-y-3">
          <JobField required />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Survey Type *</label>
              <select className="input text-base" value={form.custom_fields.survey_type ?? ""} onChange={(e) => updateCustomField("survey_type", e.target.value)}>
                <option value="">Select</option>
                <option value="Stakeout">Stakeout</option>
                <option value="As-Built">As-Built</option>
                <option value="Topo">Topo</option>
                <option value="Control">Control</option>
                <option value="Model Check">Model Check</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <NeedByField />
          </div>
          <div>
            <label className="label">Location / What Needed *</label>
            <textarea className="input min-h-24 text-base" placeholder="Example: Stake MH-12 to MH-15 sewer." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <PriorityField />
        </div>
      );
    }

    if (form.work_type === "Maintenance") {
      return (
        <div className="space-y-3">
          <div>
            <label className="label">Equipment *</label>
            <select className="input text-base" value={form.related_equipment_id} onChange={(e) => updateRelatedEquipment(e.target.value)}>
              <option value="">Select equipment</option>
              {equipment.map((item) => <option key={item.id} value={item.id}>{item.name} #{item.equipment_number ?? "—"}</option>)}
            </select>
          </div>
          <JobField />
          <div>
            <label className="label">Issue *</label>
            <textarea className="input min-h-24 text-base" placeholder="Example: hydraulic leak, flat tire, won't start." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Can it run?</label>
              <select className="input" value={form.custom_fields.can_run ?? ""} onChange={(e) => updateCustomField("can_run", e.target.value)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No - Down">No - Down</option>
                <option value="Barely / Needs checked">Barely / Needs checked</option>
              </select>
            </div>
            <PriorityField />
          </div>
        </div>
      );
    }

    if (form.work_type === "Mobilization") {
      return (
        <div className="space-y-3">
          <JobField required />
          <div>
            <label className="label">Equipment Type Needed *</label>
            <select className="input text-base" value={form.custom_fields.equipment_type_needed ?? ""} onChange={(e) => updateCustomField("equipment_type_needed", e.target.value)}>
              <option value="">Select type</option>
              {EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Quantity</label>
              <input className="input" placeholder="1" value={form.custom_fields.quantity ?? ""} onChange={(e) => updateCustomField("quantity", e.target.value)} />
            </div>
            <NeedByField />
            <PriorityField />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-20" placeholder="Anything special about the move?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      );
    }

    if (form.work_type === "Trucking") {
      return (
        <div className="space-y-3">
          <JobField required />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label"># Trucks *</label>
              <input className="input text-base" placeholder="4" value={form.custom_fields.truck_count ?? ""} onChange={(e) => updateCustomField("truck_count", e.target.value)} />
            </div>
            <div>
              <label className="label"># Loads *</label>
              <input className="input text-base" placeholder="120" value={form.custom_fields.load_count ?? ""} onChange={(e) => updateCustomField("load_count", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Material</label>
              <input className="input" placeholder="Dirt, rock, select fill" value={form.custom_fields.material ?? ""} onChange={(e) => updateCustomField("material", e.target.value)} />
            </div>
            <NeedByField />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-20" placeholder="Truck type, from/to, start time, haul notes." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      );
    }

    if (form.work_type === "Foreman Assignment") {
      return (
        <div className="space-y-3">
          <JobField required />
          <NeedByField />
          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-20" placeholder="Crew notes, start date, special instructions." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      );
    }

    if (form.work_type === "Office") {
      return (
        <div className="space-y-3">
          <JobField />
          <div>
            <label className="label">What do you need? *</label>
            <textarea className="input min-h-24 text-base" placeholder="Plans, paperwork, contact info, ticket, etc." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NeedByField />
            <PriorityField />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <JobField />
        <div>
          <label className="label">What needs done? *</label>
          <textarea className="input min-h-24 text-base" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <PriorityField />
      </div>
    );
  }

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[420px_1fr]">
      <aside className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Work Orders</h2>
          <button className="btn-primary" onClick={() => selectOrder("new")}>New</button>
        </div>

        <label className="label">Queue</label>
        <select className="input" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="All">All Work Orders ({workOrders.length})</option>
          {WORK_ORDER_TYPES.map((type) => <option key={type} value={type}>{type} ({queueCounts.get(type) ?? 0})</option>)}
        </select>

        <div className="mt-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No work orders in this queue.</p>
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

        <div className="mt-4 rounded-2xl border bg-white p-3">
          <FormBody />
        </div>

        <AdminControls />

        <div className="mt-4">
          <button className="btn-primary w-full sm:w-auto" disabled={saving} onClick={saveWorkOrder}>
            {saving ? "Saving..." : "Submit Work Order"}
          </button>
        </div>
      </section>
    </section>
  );
}
