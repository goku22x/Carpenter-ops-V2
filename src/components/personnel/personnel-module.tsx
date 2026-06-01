"use client";

import { useMemo, useState } from "react";
import type { Personnel } from "@/lib/types";
import { PERSONNEL_DEPARTMENTS, PERSONNEL_POSITIONS } from "@/lib/personnel-options";

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

export function PersonnelModule({ personnel, isAdmin, onPersonnelChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | "new">(personnel[0]?.id ?? "new");
  const [saving, setSaving] = useState(false);
  const selected = personnel.find((person) => person.id === selectedId);

  const [form, setForm] = useState(() =>
    selected
      ? {
          full_name: selected.full_name,
          department: selected.department ?? "",
          position: selected.position ?? "",
          email: selected.email ?? "",
          phone: selected.phone ?? "",
          notes: selected.notes ?? "",
          active: selected.active
        }
      : emptyForm
  );

  const groupedPersonnel = useMemo(() => {
    const groups = new Map<string, Personnel[]>();

    for (const person of personnel) {
      const key = person.department || "No Department";
      const current = groups.get(key) ?? [];
      current.push(person);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [personnel]);

  function selectPerson(person: Personnel | "new") {
    if (person === "new") {
      setSelectedId("new");
      setForm(emptyForm);
      return;
    }

    setSelectedId(person.id);
    setForm({
      full_name: person.full_name,
      department: person.department ?? "",
      position: person.position ?? "",
      email: person.email ?? "",
      phone: person.phone ?? "",
      notes: person.notes ?? "",
      active: person.active
    });
  }

  async function savePersonnel() {
    if (!isAdmin) return alert("Admin only.");
    if (!form.full_name.trim()) return alert("Full name is required.");

    setSaving(true);

    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/personnel" : `/api/personnel/${selectedId}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
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

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[420px_1fr]">
      <aside className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Personnel</h2>
          {isAdmin ? <button className="btn-primary" onClick={() => selectPerson("new")}>New Person</button> : null}
        </div>

        <div className="mt-4 space-y-5">
          {personnel.length === 0 ? (
            <p className="text-sm text-slate-500">No personnel yet.</p>
          ) : (
            groupedPersonnel.map(([department, people]) => (
              <section key={department}>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{department}</h3>
                <div className="space-y-2">
                  {people.map((person) => (
                    <button
                      key={person.id}
                      className={`w-full rounded-2xl border p-3 text-left ${selectedId === person.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"} ${!person.active ? "opacity-55" : ""}`}
                      onClick={() => selectPerson(person)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-black">{person.full_name}</div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${person.active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>
                          {person.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{person.position ?? "No position"}</div>
                      <div className="text-xs text-slate-500">{person.phone || person.email || "No contact info"}</div>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </aside>

      <section className="card">
        <h2 className="text-2xl font-black">{selectedId === "new" ? "New Person" : "Personnel Info"}</h2>

        {!isAdmin ? (
          <p className="mt-2 rounded-xl bg-yellow-50 p-3 text-sm font-bold text-yellow-900">
            View only. Admins can edit personnel.
          </p>
        ) : null}

        <label className="label">Full Name</label>
        <input className="input" disabled={!isAdmin} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Department</label>
            <select className="input" disabled={!isAdmin} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}>
              <option value="">No department</option>
              {PERSONNEL_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Role / Position</label>
            <select className="input" disabled={!isAdmin} value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>
              <option value="">No position</option>
              {PERSONNEL_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input className="input" disabled={!isAdmin} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>

          <div>
            <label className="label">Phone</label>
            <input className="input" disabled={!isAdmin} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
        </div>

        <label className="label">Status</label>
        <select
          className="input"
          disabled={!isAdmin}
          value={form.active ? "active" : "inactive"}
          onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <label className="label">Notes</label>
        <textarea className="input min-h-28" disabled={!isAdmin} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />

        {isAdmin ? (
          <div className="mt-4">
            <button className="btn-primary" disabled={saving} onClick={savePersonnel}>
              {saving ? "Saving..." : "Save Personnel"}
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
