"use client";

import { useEffect, useMemo, useState } from "react";
import type { Equipment, Job } from "@/lib/types";
import { EQUIPMENT_STATUSES, EQUIPMENT_TYPES } from "@/lib/equipment-types";

type Props = {
  equipment: Equipment[];
  jobs: Job[];
  isAdmin: boolean;
  onEquipmentChanged: () => Promise<void> | void;
};

const emptyForm = {
  name: "",
  equipment_number: "",
  equipment_type: "",
  status: "Active",
  current_job_id: "",
  current_site: "",
  photo_url: "",
  notes: ""
};

function imagePath(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return value;
  return `/equipment-images/${value}`;
}

export function EquipmentModule({ equipment, jobs, isAdmin, onEquipmentChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | "new">(equipment[0]?.id ?? "new");
  const selected = equipment.find((item) => item.id === selectedId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() =>
    selected
      ? {
          name: selected.name,
          equipment_number: selected.equipment_number ?? "",
          equipment_type: selected.equipment_type ?? "",
          status: selected.status ?? "Active",
          current_job_id: selected.current_job_id ?? "",
          current_site: selected.current_site ?? "",
          photo_url: selected.photo_url ?? "",
          notes: selected.notes ?? ""
        }
      : emptyForm
  );

  const jobNameById = useMemo(() => new Map(jobs.map((job) => [job.id, job.name])), [jobs]);

  useEffect(() => {
    if (selectedId === "new") return;

    const freshSelected = equipment.find((item) => item.id === selectedId);

    if (!freshSelected && equipment.length > 0) {
      selectItem(equipment[0]);
    }
  }, [equipment, selectedId]);

  function selectItem(item: Equipment | "new") {
    if (item === "new") {
      setSelectedId("new");
      setForm(emptyForm);
      return;
    }

    setSelectedId(item.id);
    setForm({
      name: item.name,
      equipment_number: item.equipment_number ?? "",
      equipment_type: item.equipment_type ?? "",
      status: item.status ?? "Active",
      current_job_id: item.current_job_id ?? "",
      current_site: item.current_site ?? "",
      photo_url: item.photo_url ?? "",
      notes: item.notes ?? ""
    });
  }

  async function saveEquipment() {
    if (!isAdmin) return alert("Admin only.");
    if (!form.name.trim()) return alert("Equipment name is required.");

    setSaving(true);

    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/equipment" : `/api/equipment/${selectedId}`;

      const payload = {
        ...form,
        current_job_id: form.current_job_id || null,
        current_site: form.current_site || null,
        photo_url: form.photo_url || null,
        notes: form.notes || null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");

      await onEquipmentChanged();

      if (data?.id) {
        setSelectedId(data.id);
      }

      alert("Equipment saved.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[420px_1fr]">
      <aside className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Equipment</h2>
          {isAdmin ? <button className="btn-primary" onClick={() => selectItem("new")}>New Equipment</button> : null}
        </div>

        <div className="mt-4 space-y-3">
          {equipment.length === 0 ? (
            <p className="text-sm text-slate-500">No equipment yet.</p>
          ) : (
            equipment.map((item) => (
              <button
                key={item.id}
                className={`flex w-full gap-3 rounded-2xl border p-3 text-left ${selectedId === item.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
                onClick={() => selectItem(item)}
              >
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border bg-white">
                  {item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePath(item.photo_url)} alt={item.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-400">NO IMG</div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="font-black">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.equipment_type ?? "Uncategorized"} • #{item.equipment_number ?? "—"}</div>
                  <div className="text-xs font-bold text-slate-700">{item.status}</div>
                  <div className="text-xs text-slate-500">
                    {item.current_job_id ? jobNameById.get(item.current_job_id) ?? "Assigned job" : item.current_site || "Unassigned"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="card">
        <h2 className="text-2xl font-black">{selectedId === "new" ? "New Equipment" : "Equipment Info"}</h2>

        <label className="label">Equipment Name</label>
        <input className="input" disabled={!isAdmin} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Equipment #</label>
            <input className="input" disabled={!isAdmin} value={form.equipment_number} onChange={(event) => setForm({ ...form, equipment_number: event.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" disabled={!isAdmin} value={form.equipment_type} onChange={(event) => setForm({ ...form, equipment_type: event.target.value })}>
              <option value="">Select type</option>
              {EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select className="input" disabled={!isAdmin} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {EQUIPMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Current Job</label>
            <select className="input" disabled={!isAdmin} value={form.current_job_id} onChange={(event) => setForm({ ...form, current_job_id: event.target.value, current_site: "" })}>
              <option value="">Unassigned / Yard / Other Site</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
            </select>
          </div>
        </div>

        <label className="label">Current Site Text</label>
        <input
          className="input"
          disabled={!isAdmin || Boolean(form.current_job_id)}
          placeholder="Yard, Shop, Pit, Dump, etc."
          value={form.current_site}
          onChange={(event) => setForm({ ...form, current_site: event.target.value })}
        />

        <label className="label">Photo File / URL</label>
        <input
          className="input"
          disabled={!isAdmin}
          placeholder="cat-d6-dozer.jpg or /equipment-images/cat-d6-dozer.jpg"
          value={form.photo_url}
          onChange={(event) => setForm({ ...form, photo_url: event.target.value })}
        />

        {form.photo_url ? (
          <div className="mt-3 h-40 w-56 overflow-hidden rounded-2xl border bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePath(form.photo_url)} alt="Equipment preview" className="h-full w-full object-contain" />
          </div>
        ) : null}

        <label className="label">Notes</label>
        <textarea className="input min-h-28" disabled={!isAdmin} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />

        {isAdmin ? (
          <div className="mt-4">
            <button className="btn-primary" disabled={saving} onClick={saveEquipment}>
              {saving ? "Saving..." : "Save Equipment"}
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
