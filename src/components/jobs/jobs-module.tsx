"use client";

import { useMemo, useState } from "react";
import type { Job, JobPhase, PhaseKey } from "@/lib/types";
import { PHASES } from "@/lib/phases";

type Props = {
  initialJobs: Job[];
  isAdmin: boolean;
  onJobsChanged?: () => Promise<void> | void;
};

type PhaseForm = Record<PhaseKey, { start_date: string | null; end_date: string | null }>;

function emptyPhases(): PhaseForm {
  return {
    earthwork: { start_date: null, end_date: null },
    storm_drain: { start_date: null, end_date: null },
    sewer: { start_date: null, end_date: null },
    water: { start_date: null, end_date: null }
  };
}

function phasesFromJob(job?: Job): PhaseForm {
  const next = emptyPhases();
  for (const phase of job?.job_phases ?? []) {
    next[phase.phase] = {
      start_date: phase.start_date,
      end_date: phase.end_date
    };
  }
  return next;
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
        phases: emptyPhases()
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

    setSaving(true);

    try {
      const method = selectedId === "new" ? "POST" : "PATCH";
      const url = selectedId === "new" ? "/api/jobs" : `/api/jobs/${selectedId}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phases: form.phases
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
      const res = await fetch(`/api/jobs/${selectedId}`, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Delete failed.");

      const updated = await refreshJobs();
      await onJobsChanged?.();

      if (updated.length > 0) {
        selectJob(updated[0]);
      } else {
        selectJob("new");
      }

      alert("Job deleted.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const selectedPhaseRecords = useMemo(() => {
    const map = new Map<PhaseKey, JobPhase>();
    for (const phase of selectedJob?.job_phases ?? []) {
      map.set(phase.phase, phase);
    }
    return map;
  }, [selectedJob]);

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
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
                  {PHASES.map((phase) => {
                    const record = job.job_phases?.find((p) => p.phase === phase.key);
                    return (
                      <div key={phase.key} className={`${phase.className} rounded-lg px-2 py-1 text-[11px] font-black text-black`}>
                        <div>{phase.label}</div>
                        <div className="text-[10px] opacity-70">{record?.start_date ?? "—"} → {record?.end_date ?? "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">{selectedId === "new" ? "New Job" : "Job Info"}</h2>
          {isAdmin && selectedId !== "new" ? (
            <button className="btn-danger" disabled={deleting} onClick={deleteJob}>
              {deleting ? "Deleting..." : "Delete Job"}
            </button>
          ) : null}
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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {PHASES.map((phase) => (
            <div key={phase.key} className="phase-card">
              <div className={`phase-title ${phase.className}`}>{phase.label}</div>
              <div className="phase-body">
                <div>
                  <label className="label mt-0">Start</label>
                  <input
                    className="input"
                    type="date"
                    disabled={!isAdmin}
                    value={form.phases[phase.key].start_date ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phases: {
                          ...form.phases,
                          [phase.key]: { ...form.phases[phase.key], start_date: e.target.value || null }
                        }
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label mt-0">End</label>
                  <input
                    className="input"
                    type="date"
                    disabled={!isAdmin}
                    value={form.phases[phase.key].end_date ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phases: {
                          ...form.phases,
                          [phase.key]: { ...form.phases[phase.key], end_date: e.target.value || null }
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <label className="label">Dropbox Link</label>
        <input className="input" disabled={!isAdmin} value={form.dropbox_url} onChange={(e) => setForm({ ...form, dropbox_url: e.target.value })} />

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
