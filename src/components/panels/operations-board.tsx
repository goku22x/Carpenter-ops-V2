export function OperationsBoard({ jobs, equipment }: { jobs: any[]; equipment: any[] }) {
  return (
    <section className="card">
      <h2 className="text-2xl font-black">Operations Board</h2>
      <div className="mt-4 space-y-4">
        {jobs.map((job) => {
          const items = equipment.filter((e) => e.current_job_id === job.id);
          return (
            <section key={job.id} className="rounded-2xl border-l-8 border-carpenter-red bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase">{job.name}</h3>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-black">{items.length}</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {items.map((eq) => (
                  <article key={eq.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="aspect-video rounded-lg bg-slate-200" />
                    <h4 className="mt-2 font-black">{eq.name}</h4>
                    <p className="text-xs font-bold text-slate-500">{eq.equipment_type} • {eq.status}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
