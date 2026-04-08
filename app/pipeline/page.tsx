import { startups } from '@/data/startups';
import KanbanBoard from '@/components/KanbanBoard';

export default function PipelinePage() {
  return (
    <div className="p-6 h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gestión del flujo de inversión · {startups.length} startups en seguimiento
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <span className="text-xs text-zinc-500">Arrastra las tarjetas para mover startups entre etapas</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-400">Score ≥80</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-zinc-400">Score 60–79</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-zinc-400">Score 40–59</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-zinc-400">Score &lt;40</span>
        </div>
      </div>

      {/* Kanban */}
      <KanbanBoard initialStartups={startups} />
    </div>
  );
}
