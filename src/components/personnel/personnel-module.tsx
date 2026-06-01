"use client";

import { useEffect, useState } from "react";
import type { Personnel } from "@/lib/types";

type Props = {
  personnel: Personnel[];
  isAdmin: boolean;
  onPersonnelChanged: () => Promise<void> | void;
};

const emptyForm = {
  full_name: "",
  department: "",
  position: "",
  email: "",
  phone: "",
  notes: "",
  active: true
};

const DEPARTMENTS = [
  "Survey",
  "Earthwork",
  "Utilities",
  "Maintenance",
  "Mobilization",
  "Trucks",
  "Office",
  "Management",
  "Other"
];

function formFromPerson(person?: Personnel) {
  if (!person) return emptyForm;

  return {
    full_name: person.full_name ?? "",
    department: person.department ?? "",
    position: person.position ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    notes: person.notes ?? "",
    active: person.active ?? true
  };
}

export function PersonnelModule({ personnel, isAdmin, onPersonnelChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | "new">(personnel[0]?.id ?? "new");
  const selected = personnel.find((person) => person.id === selectedId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(() => formFromPerson(selected));

  useEffect(() => {
    if (selectedId === "new") return;

    const freshSelected = personnel.find((person) => person.id === selectedId);

    if (!freshSelected && personnel.length > 0) {
      selectPerson(personnel[0]);
    }

    if (!freshSelected && personnel.length === 0) {
      selectNewPerson();
    }
  }, [personnel, selectedId]);

  function selectNewPerson() {
    setSelectedId("new");
    setForm(emptyForm);
  }

  function selectPerson(person: Personnel) {
    setSelectedId(person.id);
    setForm(formFromPerson(person));
  }

  async function savePersonnel() {
    if (!isAdmin) return alert("Admin only.");
    if (!form.full_name.trim()) return alert("Full name is required.");

    setSaving(true);

    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/personnel" : `/api/personnel/${selectedId}`;

      const payload = {
        ...form,
        department: form.department || null,
        position: form.position || null,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");

      await onPersonnelChanged();

      if (data?.id) {
        setSelectedId(data.id);
      }

      alert("Personnel saved.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePersonnel() {
    if (!isAdmin) return alert("Admin only.");
    if (selectedId === "new") return;

    const ok = confirm(`Delete ${selected?.full_name ?? "this person"}? This cannot be undone.`);
    if (!ok) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/personnel/${selectedId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Delete failed.");

      await onPersonnelChanged();
      selectNewPerson();
      alert("Personnel deleted.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  function PersonnelCard({ person }: { person: Personnel }) {
    const isSelected = selectedId === person.id;

    return (
      <button
        className={`w-full rounded-2xl border p-3 text-left ${isSelected ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600" : "border-slate-200 bg-white"} ${!person.active ? "opacity-60" : ""}`}
        onClick={() => selectPerson(person)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-black">{person.full_name}</div>
            <div className="text-xs text-slate-500">{person.position || "No position"}</div>
          </div>

          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${person.active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>
            {person.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-700">
            {person.department || "No Department"}
          </span>

          {person.email ? (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-800">
              Email
            </span>
          ) : null}

          {person.phone ? (
            <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-black text-purple-800">
              Phone
            </span>
          ) : null}
        </div>
      </button>
    );
  }

  function PersonnelEditor() {
    return (
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">
            {selectedId === "new" ? "New Personnel" : "Personnel Info"}
          </h2>

          {isAdmin && selectedId !== "new" ? (
            <button className="btn-danger" disabled={deleting} onClick={deletePersonnel}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        {!isAdmin ? (
          <p className="mt-2 rounded-xl bg-yellow-50 p-3 text-sm font-bold text-yellow-900">
            View only. Admins can edit personnel.
          </p>
        ) : null}

        <label className="label">Full Name</label>
        <input
          className="input"
          disabled={!isAdmin}
          value={form.full_name}
          onChange={(event) => setForm({ ...form, full_name: event.target.value })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Department</label>
            <select
              className="input"
              disabled={!isAdmin}
              value={form.department}
              onChange={(event) => setForm({ ...form, department: event.target.value })}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Position</label>
            <input
              className="input"
              disabled={!isAdmin}
              value={form.position}
              onChange={(event) => setForm({ ...form, position: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              disabled={!isAdmin}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              disabled={!isAdmin}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm font-black">
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Active Personnel
          </label>
        </div>

        <label className="label">Notes</label>
        <textarea
          className="input min-h-28"
          disabled={!isAdmin}
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />

        {isAdmin ? (
          <div className="mt-4">
            <button className="btn-primary" disabled={saving} onClick={savePersonnel}>
              {saving ? "Saving..." : "Save Personnel"}
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
            <h2 className="text-2xl font-black">Personnel</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a person. Personnel info opens directly beside the selected card.
            </p>
          </div>

          {isAdmin ? (
            <button className="btn-primary" onClick={selectNewPerson}>
              New Personnel
            </button>
          ) : null}
        </div>
      </div>

      {selectedId === "new" ? (
        <div className="mb-3 grid gap-4 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border-2 border-dashed bg-white p-4 text-sm font-bold text-slate-500">
            New personnel record
          </div>
          <PersonnelEditor />
        </div>
      ) : null}

      <div className="space-y-3">
        {personnel.length === 0 ? (
          <div className="card">
            <p className="text-sm text-slate-500">No personnel yet.</p>
          </div>
        ) : (
          personnel.map((person) => (
            <div key={person.id} className="grid gap-4 lg:grid-cols-[420px_1fr]">
              <div>
                <PersonnelCard person={person} />
              </div>

              {selectedId === person.id ? (
                <PersonnelEditor />
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
