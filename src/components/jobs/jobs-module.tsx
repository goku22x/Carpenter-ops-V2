"use client";

import { useState } from "react";
import type { Job } from "@/lib/types";
import { DEFAULT_JOB_PHASES, phaseColorClass } from "@/lib/phases";
import { formatDateRange } from "@/lib/date-format";

type Props = {
  initialJobs: Job[];
  isAdmin: boolean;
  onJobsChanged?: () => Promise<void> | void;
};

type PhaseForm = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  progress_percent: number | null;
  sort_order: number;
};

function defaultPhaseForm(): PhaseForm[] {
  return DEFAULT_JOB_PHASES.map((name, index) => ({
    name,
    start_date: null,
    end_date: null,
    progress_percent: 0,
    sort_order: index
  }));
}

function phasesFromJob(job?: Job): PhaseForm[] {
  const phases = [...(job?.job_phases ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (phases.length === 0) {
    return defaultPhaseForm();
  }

  return phases.map((phase, index) => ({
    name: phase.name || phase.phase || `Phase ${index + 1}`,
    start_date: phase.start_date,
    end_date: phase.end_date,
    progress_percent: phase.progress_percent ?? 0,
    sort_order: phase.sort_order ?? index
  }));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function JobsModule({ initialJobs, isAdmin, onJobsChanged }: Props) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [selectedId, setSelectedId] = useState<string | "new">(jobs[0]?.id ?? "new");
  const selectedJob = jobs.find((job) => job.id === selectedId);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(() => ({
    name: selectedJob?.name ?? "",
    address: selectedJob?.address ?? "",
    owner: selectedJob?.owner ?? "",
    site_contact: selectedJob?.site_contact ?? "",
    dropbox_url: selectedJob?.dropbox_url ?? "",
    notes: selectedJob?.notes ?? "",
    phases: phasesFromJob(selectedJob)
  }));

  function selectJob(job: Job | "new") {
    if (job === "new") {
      setSelectedId("new");
      setForm({
        name: "",
        address: "",
        owner: "",
        site_contact: "",
        dropbox_url: "",
        notes: "",
        phases: defaultPhaseForm()
      });
      return;
    }

    setSelectedId(job.id);
    setForm({
      name: job.name,
      address: job.address ?? "",
      owner: job.owner ?? "",
      site_contact: job.site_contact ?? "",
      dropbox_url: job.dropbox_url ?? "",
      notes: job.notes ?? "",
      phases: phasesFromJob(job)
    });
  }

  function openDropbox() {
    const url = normalizeUrl(form.dropbox_url);
    if (!url) {
      alert("No project files link has been added for this job yet.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function updatePhase(index: number, updates: Partial<PhaseForm>) {
    setForm({
      ...form,
      phases: form.phases.map((phase, phaseIndex) =>
        phaseIndex === index ? { ...phase, ...updates } : phase
      )
    });
  }

  function addPhase() {
    setForm({
      ...form,
      phases: [
        ...form.phases,
        {
          name: `Custom ${form.phases.length + 1}`,
          start_date: null,
          end_date: null,
          progress_percent: 0,
          sort_order: form.phases.length
        }
      ]
    });
  }

  function deletePhase(index: number) {
    if (form.phases.length <= 1) {
      alert("A job needs at least one phase.");
      return;
    }

    setForm({
      ...form,
      phases: form.phases
        .filter((_, phaseIndex) => phaseIndex !== index)
        .map((phase, phaseIndex) => ({ ...phase, sort_order: phaseIndex }))
    });
  }

  async function refreshJobs() {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load jobs.");
    const data = await res.json();
    setJobs(data);
    return data as Job[];
  }

  async function saveJob() {
    if (!isAdmin) return alert("Admin only.");
    if (!form.name.trim()) return alert("Job name is required.");

    const cleanPhases = form.phases
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

    setSaving(true);

    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/jobs" : `/api/jobs/${selectedId}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dropbox_url: normalizeUrl(form.dropbox_url) || null,
          phases: cleanPhases
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");

      const updated = await refreshJobs();
      await onJobsChanged?.();

      const savedId = data?.id ?? selectedId;
      const saved = updated.find((job) => job.id === savedId);
      if (saved) selectJob(saved);

      alert("Job saved.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob() {
    if (!isAdmin) return alert("Admin only.");
    if (selectedId === "new") return;

    const name = selectedJob?.name ?? "this job";
    const ok = confirm(`Delete ${name}? Equipment assigned to this job will become unassigned. This cannot be undone.`);
    if (!ok) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/jobs/${selectedId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Delete failed.");

      const updated = await refreshJobs();
      await onJobsChanged?.();

      if (updated.length > 0) selectJob(updated[0]);
      else selectJob("new");

      alert("Job deleted.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  function getSortedPhases(job: Job) {
    return [...(job.job_phases ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[420px_1fr]">
      <aside className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Jobs</h2>
          {isAdmin ? <button className="btn-primary" onClick={() => selectJob("new")}>New Job</button> : null}
        </div>

        <div className="mt-4 space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-500">No jobs yet.</p>
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                className={`w-full rounded-2xl border p-3 text-left ${selectedId === job.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
                onClick={() => selectJob(job)}
              >
                <div className="font-black uppercase">{job.name}</div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {getSortedPhases(job).slice(0, 6).map((phase, index) => (
                    <div key={`${job.id}-${phase.id ?? index}`} className={`${phaseColorClass(index)} rounded-lg px-2 py-1 text-[11px] font-black text-black`}>
                      <div className="truncate">{phase.name || phase.phase}</div>
                      <div className="text-[10px] opacity-80">{phase.progress_percent ?? 0}%</div>
                      <div className="text-[10px] opacity-70">{formatDateRange(phase.start_date, phase.end_date)}</div>
                    </div>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">{selectedId === "new" ? "New Job" : "Job Info"}</h2>

          <div className="flex flex-wrap gap-2">
            {selectedId !== "new" ? (
              <button className="btn-primary" onClick={openDropbox}>
                Open Project Files
              </button>
            ) : null}

            {isAdmin && selectedId !== "new" ? (
              <button className="btn-danger" disabled={deleting} onClick={deleteJob}>
                {deleting ? "Deleting..." : "Delete Job"}
              </button>
            ) : null}
          </div>
        </div>

        {!isAdmin ? (
          <p className="mt-2 rounded-xl bg-yellow-50 p-3 text-sm font-bold text-yellow-900">
            View only. Admins can edit jobs.
          </p>
        ) : null}

        <label className="label">Job Name</label>
        <input className="input" disabled={!isAdmin} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label className="label">Address</label>
        <input className="input" disabled={!isAdmin} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Owner</label>
            <input className="input" disabled={!isAdmin} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div>
            <label className="label">Site Contact</label>
            <input className="input" disabled={!isAdmin} value={form.site_contact} onChange={(e) => setForm({ ...form, site_contact: e.target.value })} />
          </div>
        </div>

        {isAdmin ? (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black">Project Files Link</h3>
                <p className="text-xs font-bold text-slate-600">
                  Admin only. Users only see the Open Project Files button.
                </p>
              </div>

              {form.dropbox_url ? (
                <button className="btn-secondary" onClick={openDropbox}>
                  Test Link
                </button>
              ) : null}
            </div>

            <label className="label">Dropbox / Project Folder URL</label>
            <input
              className="input"
              placeholder="Paste Dropbox folder link here"
              value={form.dropbox_url}
              onChange={(e) => setForm({ ...form, dropbox_url: e.target.value })}
            />
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black">Job Phases</h3>
            {isAdmin ? <button className="btn-secondary" onClick={addPhase}>+ Add Phase</button> : null}
          </div>

          <div className="mt-3 space-y-3">
            {form.phases.map((phase, index) => (
              <div key={index} className="rounded-2xl border bg-white p-3">
                <div className={`mb-3 rounded-xl px-3 py-2 text-center font-black text-black ${phaseColorClass(index)}`}>
                  Phase {index + 1}
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_110px_auto]">
                  <div>
                    <label className="label mt-0">Phase Name</label>
                    <input className="input" disabled={!isAdmin} value={phase.name} onChange={(e) => updatePhase(index, { name: e.target.value })} />
                  </div>

                  <div>
                    <label className="label mt-0">Start</label>
                    <input className="input" type="date" disabled={!isAdmin} value={phase.start_date ?? ""} onChange={(e) => updatePhase(index, { start_date: e.target.value || null })} />
                  </div>

                  <div>
                    <label className="label mt-0">End</label>
                    <input className="input" type="date" disabled={!isAdmin} value={phase.end_date ?? ""} onChange={(e) => updatePhase(index, { end_date: e.target.value || null })} />
                  </div>

                  <div>
                    <label className="label mt-0">%</label>
                    <input className="input" type="number" min={0} max={100} disabled={!isAdmin} value={phase.progress_percent ?? 0} onChange={(e) => updatePhase(index, { progress_percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
                  </div>

                  {isAdmin ? (
                    <div className="flex items-end">
                      <button className="btn-danger w-full" onClick={() => deletePhase(index)}>Delete</button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <label className="label">Notes</label>
        <textarea className="input min-h-32" disabled={!isAdmin} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        {isAdmin ? (
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" disabled={saving} onClick={saveJob}>
              {saving ? "Saving..." : "Save Job"}
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
