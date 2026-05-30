export function CalendarPanel({ requests }: { requests: any[] }) {
  return (
    <section className="card min-h-[520px]">
      <h2 className="text-xl font-black">Calendar</h2>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-black text-slate-500">{d}</div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-24 rounded-xl border border-slate-200 p-2">
            <div className="text-xs font-black">{i + 1}</div>
            {i === 2 ? <div className="mt-1 rounded bg-blue-100 px-1 text-[10px] font-bold">{requests[0]?.department}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
