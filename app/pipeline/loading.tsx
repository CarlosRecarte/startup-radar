export default function Loading() {
  return (
    <div className="p-6 h-full animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-28 bg-zinc-800 rounded-md mb-2" />
        <div className="h-4 w-64 bg-zinc-800 rounded-md" />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
            <div className="h-3 w-16 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }).map((_, col) => (
          <div
            key={col}
            className="flex flex-col min-w-[220px] w-[220px] bg-zinc-900/50 rounded-xl border border-zinc-800"
          >
            {/* Column header */}
            <div className="px-3 py-2.5 rounded-t-xl bg-zinc-800">
              <div className="h-3 w-20 bg-zinc-700 rounded" />
            </div>
            {/* Cards */}
            <div className="p-2 space-y-2">
              {Array.from({ length: col === 0 ? 3 : col === 1 ? 2 : 1 }).map((_, card) => (
                <div key={card} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="h-3 w-20 bg-zinc-800 rounded mb-1" />
                      <div className="h-2 w-12 bg-zinc-800 rounded" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-zinc-800" />
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
