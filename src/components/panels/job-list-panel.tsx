const phases = [
  ["Earthwork", "bg-phase-earthwork"],
  ["Storm Drain", "bg-phase-storm"],
  ["Sewer", "bg-phase-sewer"],
  ["Water", "bg-phase-water"]
];

export function JobListPanel({ jobs, requests, equipment }: { jobs: any[]; requests: any[]; equipment: any[] }) {
  return (
    <aside className="card">
      <h2 className="text-xl font-black">Job List</h2>
      <div className="mt-3 space-y-2">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-xl border border-slate-200 p-3">
            <h3 className="font-black uppercase">{job.name}</h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {phases.map(([label, color]) => (
                <div key={label} className={`${color} rounded-lg px-2 py-1 text-[11px] font-black`}>
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {requests.filter((r) => r.job_id === job.id).length} Active Work • {equipment.filter((e) => e.current_job_id === job.id).length} Equipment
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}
