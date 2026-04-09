import { getStartups } from '@/lib/api/startups';
import KanbanBoard from '@/components/KanbanBoard';

// Fuerza render dinámico para que los datos siempre vengan frescos de Supabase
export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  // Lanza error si Supabase falla → lo captura app/pipeline/error.tsx
  const startups = await getStartups();

  return (
    <div className="p-6 h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gestión del flujo de inversión · {startups.length} startups en seguimiento
        </p>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <span className="text-xs text-zinc-500">Arrastra las tarjetas para mover startups entre etapas · Haz clic para ver detalles y añadir notas</span>
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
