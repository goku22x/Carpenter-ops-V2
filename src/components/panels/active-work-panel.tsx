export function ActiveWorkPanel({ requests }: { requests: any[] }) {
  return (
    <aside className="card">
      <h2 className="text-xl font-black">Active Work</h2>
      <div className="mt-3 space-y-2">
        {requests.map((r) => (
          <article key={r.id} className="rounded-xl border border-slate-200 p-3">
            <h3 className="font-black">{r.description}</h3>
            <p className="text-xs font-bold text-slate-500">{r.department} • {r.priority} • {r.status}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
