"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job, Personnel, Profile, TimeSheet } from "@/lib/types";
import { canApproveTimekeeping, isForeman } from "@/lib/permissions/roles";

type Props = {
  profile: Profile;
  jobs: Job[];
  personnel: Personnel[];
};

type DraftEntry = {
  employee_personnel_id: string;
  start_time: string;
  end_time: string;
  lunch_minutes: number;
  regular_hours: number;
  overtime_hours: number;
  notes: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyEntry(personnelId = ""): DraftEntry {
  return {
    employee_personnel_id: personnelId,
    start_time: "07:00",
    end_time: "15:30",
    lunch_minutes: 30,
    regular_hours: 8,
    overtime_hours: 0,
    notes: ""
  };
}

function statusClass(status: string) {
  if (status === "approved") return "bg-green-100 text-green-800";
  if (status === "signed") return "bg-blue-100 text-blue-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  if (status === "submitted") return "bg-yellow-100 text-yellow-900";
  return "bg-slate-200 text-slate-700";
}

function personName(personnel: Personnel[], id?: string | null) {
  return personnel.find((person) => person.id === id)?.full_name ?? "Unassigned employee";
}

export function TimekeepingModule({ profile, jobs, personnel }: Props) {
  const [timeSheets, setTimeSheets] = useState<TimeSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [workDate, setWorkDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<DraftEntry[]>([emptyEntry(personnel[0]?.id ?? "")]);

  const canEnterCrewTime = isForeman(profile);
  const canApprove = canApproveTimekeeping(profile);

  const myUnsignedEntries = useMemo(() => {
    const myEmail = (profile.email ?? "").toLowerCase();
    return timeSheets.flatMap((sheet) =>
      (sheet.time_entries ?? [])
        .filter((entry) => {
          const personnelRecord = personnel.find((person) => person.id === entry.employee_personnel_id);
          const matchesProfile = entry.employee_profile_id === profile.id;
          const matchesEmail = personnelRecord?.email?.toLowerCase() === myEmail;
          return (matchesProfile || matchesEmail) && !entry.employee_signed_at && !["approved", "rejected"].includes(entry.status);
        })
        .map((entry) => ({ sheet, entry }))
    );
  }, [timeSheets, personnel, profile.email, profile.id]);

  useEffect(() => {
    void refreshTimeSheets();
  }, []);

  async function refreshTimeSheets() {
    setLoading(true);
    try {
      const res = await fetch("/api/time-sheets", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not load time sheets.");
      setTimeSheets(data ?? []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not load time sheets.");
    } finally {
      setLoading(false);
    }
  }

  function updateEntry(index: number, patch: Partial<DraftEntry>) {
    setEntries((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  }

  async function createTimeSheet(status: "draft" | "submitted") {
    if (!canEnterCrewTime) return alert("Foreman, dispatcher, or admin only.");
    if (!jobId) return alert("Choose a job.");
    if (entries.some((entry) => !entry.employee_personnel_id)) return alert("Every row needs an employee.");

    setSaving(true);
    try {
      const payload = {
        job_id: jobId,
        work_date: workDate,
        notes: notes || null,
        status,
        entries: entries.map((entry) => ({
          employee_personnel_id: entry.employee_personnel_id,
          start_time: entry.start_time || null,
          end_time: entry.end_time || null,
          lunch_minutes: Number(entry.lunch_minutes || 0),
          regular_hours: Number(entry.regular_hours || 0),
          overtime_hours: Number(entry.overtime_hours || 0),
          notes: entry.notes || null
        }))
      };

      const res = await fetch("/api/time-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not save time sheet.");

      setNotes("");
      setEntries([emptyEntry(personnel[0]?.id ?? "")]);
      await refreshTimeSheets();
      alert(status === "draft" ? "Time sheet saved as draft." : "Time sheet submitted.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not save time sheet.");
    } finally {
      setSaving(false);
    }
  }

  async function updateSheetStatus(id: string, status: "submitted" | "approved" | "rejected") {
    setSaving(true);
    try {
      const res = await fetch(`/api/time-sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not update time sheet.");
      await refreshTimeSheets();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update time sheet.");
    } finally {
      setSaving(false);
    }
  }

  async function signEntry(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/time-entries/${id}/sign`, { method: "PATCH" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not sign time entry.");
      await refreshTimeSheets();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not sign time entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 space-y-4">
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Timekeeping</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">Foremen enter crew time. Employees sign. Payroll/admin approves.</p>
          </div>
          <button className="btn-secondary" disabled={loading} onClick={refreshTimeSheets}>{loading ? "Refreshing..." : "Refresh"}</button>
        </div>
      </section>

      {myUnsignedEntries.length > 0 ? (
        <section className="card border-blue-200 bg-blue-50">
          <h3 className="text-xl font-black text-blue-950">My Time to Sign</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {myUnsignedEntries.map(({ sheet, entry }) => (
              <div key={entry.id} className="rounded-2xl border bg-white p-3 shadow-sm">
                <div className="font-black">{sheet.jobs?.name ?? "Job"} • {sheet.work_date}</div>
                <div className="mt-1 text-sm font-bold text-slate-600">
                  {entry.start_time ?? "--"} to {entry.end_time ?? "--"} • Reg {entry.regular_hours ?? 0} • OT {entry.overtime_hours ?? 0}
                </div>
                {entry.notes ? <p className="mt-2 text-sm text-slate-600">{entry.notes}</p> : null}
                <button className="btn-primary mt-3" disabled={saving} onClick={() => signEntry(entry.id)}>Sign Time</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canEnterCrewTime ? (
        <section className="card">
          <h3 className="text-xl font-black">Crew Time Entry</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="label">Job</label>
              <select className="input" value={jobId} onChange={(event) => setJobId(event.target.value)}>
                <option value="">Choose job</option>
                {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Work Date</label>
              <input className="input" type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {entries.map((entry, index) => (
              <div key={index} className="rounded-2xl border bg-slate-50 p-3">
                <div className="grid gap-3 md:grid-cols-[1.5fr_repeat(5,1fr)_auto]">
                  <div>
                    <label className="label">Employee</label>
                    <select className="input" value={entry.employee_personnel_id} onChange={(event) => updateEntry(index, { employee_personnel_id: event.target.value })}>
                      <option value="">Choose employee</option>
                      {personnel.filter((person) => person.active !== false).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Start</label>
                    <input className="input" type="time" value={entry.start_time} onChange={(event) => updateEntry(index, { start_time: event.target.value })} />
                  </div>
                  <div>
                    <label className="label">End</label>
                    <input className="input" type="time" value={entry.end_time} onChange={(event) => updateEntry(index, { end_time: event.target.value })} />
                  </div>
                  <div>
                    <label className="label">Lunch</label>
                    <input className="input" type="number" value={entry.lunch_minutes} onChange={(event) => updateEntry(index, { lunch_minutes: Number(event.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Reg</label>
                    <input className="input" type="number" step="0.25" value={entry.regular_hours} onChange={(event) => updateEntry(index, { regular_hours: Number(event.target.value) })} />
                  </div>
                  <div>
                    <label className="label">OT</label>
                    <input className="input" type="number" step="0.25" value={entry.overtime_hours} onChange={(event) => updateEntry(index, { overtime_hours: Number(event.target.value) })} />
                  </div>
                  <div className="flex items-end">
                    <button className="btn-danger" type="button" onClick={() => setEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))}>Remove</button>
                  </div>
                </div>
                <label className="label">Entry Notes</label>
                <input className="input" value={entry.notes} onChange={(event) => updateEntry(index, { notes: event.target.value })} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => setEntries((current) => [...current, emptyEntry(personnel[0]?.id ?? "")])}>Add Employee</button>
            <button className="btn-secondary" disabled={saving} type="button" onClick={() => createTimeSheet("draft")}>Save Draft</button>
            <button className="btn-primary" disabled={saving} type="button" onClick={() => createTimeSheet("submitted")}>Submit for Signoff</button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-black">Time Sheets</h3>
          {canApprove ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-800">Payroll/Admin Approval Enabled</span> : null}
        </div>

        <div className="mt-4 space-y-3">
          {timeSheets.length === 0 ? <p className="text-sm font-bold text-slate-500">{loading ? "Loading time sheets..." : "No time sheets yet."}</p> : null}
          {timeSheets.map((sheet) => (
            <div key={sheet.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{sheet.jobs?.name ?? "No Job"}</div>
                  <div className="text-sm font-bold text-slate-500">{sheet.work_date}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(sheet.status)}`}>{sheet.status}</span>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Employee</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Lunch</th>
                      <th>Reg</th>
                      <th>OT</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sheet.time_entries ?? []).map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="py-2 font-bold">{entry.personnel?.full_name ?? personName(personnel, entry.employee_personnel_id)}</td>
                        <td>{entry.start_time ?? "--"}</td>
                        <td>{entry.end_time ?? "--"}</td>
                        <td>{entry.lunch_minutes}</td>
                        <td>{entry.regular_hours ?? 0}</td>
                        <td>{entry.overtime_hours ?? 0}</td>
                        <td><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(entry.status)}`}>{entry.employee_signed_at ? "signed" : entry.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canApprove && ["submitted", "signed"].includes(sheet.status) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary" disabled={saving} onClick={() => updateSheetStatus(sheet.id, "approved")}>Approve</button>
                  <button className="btn-danger" disabled={saving} onClick={() => updateSheetStatus(sheet.id, "rejected")}>Reject</button>
                </div>
              ) : null}
              {canEnterCrewTime && sheet.status === "draft" ? (
                <button className="btn-primary mt-3" disabled={saving} onClick={() => updateSheetStatus(sheet.id, "submitted")}>Submit Draft</button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
