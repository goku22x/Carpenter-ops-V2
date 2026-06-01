"use client";

import { useEffect, useMemo, useState } from "react";
import type { Equipment, Job } from "@/lib/types";
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  OWNERSHIP_TYPES,
  equipmentTypeStyle
} from "@/lib/equipment-types";

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
  ownership_type: "Owned",
  rental_company: "",
  rental_return_date: "",
  rental_notes: "",
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

function formFromEquipment(item?: Equipment) {
  if (!item) return emptyForm;

  return {
    name: item.name,
    equipment_number: item.equipment_number ?? "",
    equipment_type: item.equipment_type ?? "",
    status: item.status ?? "Active",
    ownership_type: item.ownership_type ?? "Owned",
    rental_company: item.rental_company ?? "",
    rental_return_date: item.rental_return_date ?? "",
    rental_notes: item.rental_notes ?? "",
    current_job_id: item.current_job_id ?? "",
    current_site: item.current_site ?? "",
    photo_url: item.photo_url ?? "",
    notes: item.notes ?? ""
  };
}

export function EquipmentModule({ equipment, jobs, isAdmin, onEquipmentChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | "new">(equipment[0]?.id ?? "new");
  const selected = equipment.find((item) => item.id === selectedId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(() => formFromEquipment(selected));

  const jobNameById = useMemo(() => new Map(jobs.map((job) => [job.id, job.name])), [jobs]);

  useEffect(() => {
    if (selectedId === "new") return;

    const freshSelected = equipment.find((item) => item.id === selectedId);

    if (!freshSelected && equipment.length > 0) {
      selectItem(equipment[0]);
    }

    if (!freshSelected && equipment.length === 0) {
      selectNew();
    }
  }, [equipment, selectedId]);

  function selectNew() {
    setSelectedId("new");
    setForm(emptyForm);
  }

  function selectItem(item: Equipment) {
    setSelectedId(item.id);
    setForm(formFromEquipment(item));
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
        notes: form.notes || null,
        rental_company: form.rental_company || null,
        rental_return_date: form.rental_return_date || null,
        rental_notes: form.rental_notes || null
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

  async function deleteEquipment() {
    if (!isAdmin) return alert("Admin only.");
    if (selectedId === "new") return;

    const ok = confirm(`Delete ${selected?.name ?? "this equipment"}? This cannot be undone.`);
    if (!ok) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/equipment/${selectedId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Delete failed.");

      await onEquipmentChanged();
      selectNew();
      alert("Equipment deleted.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  function EquipmentCard({ item }: { item: Equipment }) {
    const style = equipmentTypeStyle(item.equipment_type, item.ownership_type);
    const isSelected = selectedId === item.id;

    return (
      <button
        className={`flex w-full gap-3 rounded-2xl border p-3 text-left ${isSelected ? "border-blue-600 ring-2 ring-blue-600" : ""} ${style.cardClass}`}
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
          <div className="text-xs text-slate-500">#{item.equipment_number ?? "—"}</div>

          <div className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-black uppercase ${style.badgeClass}`}>
            {item.ownership_type === "Rental" ? "Rental" : item.equipment_type ?? "Other"}
          </div>

          <div className="mt-1 text-xs font-bold text-slate-700">{item.status}</div>

          <div className="text-xs text-slate-500">
            {item.current_job_id ? jobNameById.get(item.current_job_id) ?? "Assigned job" : item.current_site || "Unassigned"}
          </div>
        </div>
      </button>
    );
  }

  function EquipmentEditor() {
    return (
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">
            {selectedId === "new" ? "New Equipment" : "Equipment Info"}
          </h2>

          {isAdmin && selectedId !== "new" ? (
            <button className="btn-danger" disabled={deleting} onClick={deleteEquipment}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        <label className="label">Equipment Name</label>
        <input
          className="input"
          disabled={!isAdmin}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Equipment #</label>
            <input
              className="input"
              disabled={!isAdmin}
              value={form.equipment_number}
              onChange={(event) => setForm({ ...form, equipment_number: event.target.value })}
            />
          </div>

          <div>
            <label className="label">Type</label>
            <select
              className="input"
              disabled={!isAdmin}
              value={form.equipment_type}
              onChange={(event) => setForm({ ...form, equipment_type: event.target.value })}
            >
              <option value="">Select type</option>
              {EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              disabled={!isAdmin}
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {EQUIPMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Ownership</label>
            <select
              className="input"
              disabled={!isAdmin}
              value={form.ownership_type}
              onChange={(event) => setForm({ ...form, ownership_type: event.target.value })}
            >
              {OWNERSHIP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        {form.ownership_type === "Rental" ? (
          <div className="mt-3 rounded-2xl border border-pink-300 bg-pink-50 p-3">
            <div className="text-sm font-black text-pink-800">Rental Details</div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Rental Company</label>
                <input
                  className="input"
                  disabled={!isAdmin}
                  value={form.rental_company}
                  onChange={(event) => setForm({ ...form, rental_company: event.target.value })}
                />
              </div>

              <div>
                <label className="label">Return Date</label>
                <input
                  className="input"
                  type="date"
                  disabled={!isAdmin}
                  value={form.rental_return_date}
                  onChange={(event) => setForm({ ...form, rental_return_date: event.target.value })}
                />
              </div>
            </div>

            <label className="label">Rental Notes</label>
            <input
              className="input"
              disabled={!isAdmin}
              value={form.rental_notes}
              onChange={(event) => setForm({ ...form, rental_notes: event.target.value })}
            />
          </div>
        ) : null}

        <label className="label">Current Job</label>
        <select
          className="input"
          disabled={!isAdmin}
          value={form.current_job_id}
          onChange={(event) => setForm({ ...form, current_job_id: event.target.value, current_site: "" })}
        >
          <option value="">Unassigned / Yard / Other Site</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
        </select>

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
        <textarea
          className="input min-h-28"
          disabled={!isAdmin}
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />

        {isAdmin ? (
          <div className="mt-4">
            <button className="btn-primary" disabled={saving} onClick={saveEquipment}>
              {saving ? "Saving..." : "Save Equipment"}
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-4">
      <div className="card mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Equipment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a machine. The editor opens directly beside it.
            </p>
          </div>

          {isAdmin ? (
            <button className="btn-primary" onClick={selectNew}>
              New Equipment
            </button>
          ) : null}
        </div>
      </div>

      {selectedId === "new" ? (
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border-2 border-dashed bg-white p-4 text-sm font-bold text-slate-500">
            New equipment record
          </div>
          <EquipmentEditor />
        </div>
      ) : null}

      <div className="space-y-3">
        {equipment.length === 0 ? (
          <div className="card">
            <p className="text-sm text-slate-500">No equipment yet.</p>
          </div>
        ) : (
          equipment.map((item) => (
            <div
              key={item.id}
              className={`grid gap-4 ${selectedId === item.id ? "lg:grid-cols-[420px_1fr]" : "lg:grid-cols-[420px_1fr]"}`}
            >
              <div>
                <EquipmentCard item={item} />
              </div>

              {selectedId === item.id ? (
                <EquipmentEditor />
              ) : (
                <div className="hidden lg:block" />
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
