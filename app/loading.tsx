export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-32 bg-zinc-800 rounded-md mb-2" />
        <div className="h-4 w-64 bg-zinc-800 rounded-md" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="h-3 w-24 bg-zinc-800 rounded mb-2" />
            <div className="h-8 w-12 bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-20 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top scores skeleton */}
        <div className="xl:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 bg-zinc-800 rounded" />
                <div className="w-10 h-10 bg-zinc-800 rounded-full" />
                <div className="flex-1">
                  <div className="h-3 w-24 bg-zinc-800 rounded mb-1" />
                  <div className="h-2 w-16 bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="xl:col-span-2">
          <div className="h-4 w-40 bg-zinc-800 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between mb-3">
                  <div>
                    <div className="h-4 w-24 bg-zinc-800 rounded mb-1" />
                    <div className="h-3 w-16 bg-zinc-800 rounded" />
                  </div>
                  <div className="w-12 h-12 bg-zinc-800 rounded-full" />
                </div>
                <div className="h-3 w-full bg-zinc-800 rounded mb-1" />
                <div className="h-3 w-3/4 bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
