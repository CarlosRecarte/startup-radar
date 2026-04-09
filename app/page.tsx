import { getStartups } from '@/lib/api/startups';
import StartupCard from '@/components/StartupCard';
import RadarScoreRing from '@/components/RadarScoreRing';

// Fuerza render dinámico para que los datos siempre vengan frescos de Supabase
export const dynamic = 'force-dynamic';

const PIPELINE_STAGES = [
  'Discovery', 'Screening', 'Deep Dive', 'Outreach',
  'Due Diligence', 'Comité IC', 'Portfolio',
] as const;

export default async function DashboardPage() {
  // Lanza error si Supabase falla → lo captura app/error.tsx
  const startups = await getStartups();

  const topStartups = [...startups].sort((a, b) => b.radarScore - a.radarScore).slice(0, 5);
  const recentStartups = startups.slice(0, 6);

  const avgScore = startups.length
    ? Math.round(startups.reduce((sum, s) => sum + s.radarScore, 0) / startups.length)
    : 0;
  const portfolioStartup = startups.find((s) => s.pipelineStage === 'Portfolio');
  const dueDiligenceStartup = startups.find((s) => s.pipelineStage === 'Due Diligence');

  const stats = [
    {
      label: 'Startups tracked',
      value: startups.length.toString(),
      delta: `${startups.length} en radar`,
      color: 'text-violet-400',
    },
    {
      label: 'Avg. Radar Score',
      value: avgScore.toString(),
      delta: 'Promedio global',
      color: 'text-blue-400',
    },
    {
      label: 'En Portfolio',
      value: startups.filter((s) => s.pipelineStage === 'Portfolio').length.toString(),
      delta: portfolioStartup?.name ?? '—',
      color: 'text-emerald-400',
    },
    {
      label: 'Due Diligence',
      value: startups.filter((s) => s.pipelineStage === 'Due Diligence').length.toString(),
      delta: dueDiligenceStartup?.name ?? '—',
      color: 'text-orange-400',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Vista general del radar de inversión · Q2 2025
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
            <p className="text-xs text-zinc-400">{stat.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top startups por score */}
        <div className="xl:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
            Top Radar Score
          </h2>
          <div className="space-y-3">
            {topStartups.map((startup, i) => (
              <div key={startup.id} className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-4 text-center font-mono">{i + 1}</span>
                <RadarScoreRing score={startup.radarScore} size={40} strokeWidth={3.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{startup.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{startup.sector} · {startup.stage}</p>
                </div>
                <span className="text-xs text-zinc-500 shrink-0">{startup.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de startups recientes */}
        <div className="xl:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            Últimas startups añadidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentStartups.map((startup) => (
              <StartupCard key={startup.id} startup={startup} />
            ))}
          </div>
        </div>
      </div>

      {/* Distribución del pipeline */}
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Distribución del Pipeline
        </h2>
        <div className="flex gap-3 flex-wrap">
          {PIPELINE_STAGES.map((stage) => {
            const count = startups.filter((s) => s.pipelineStage === stage).length;
            const pct = startups.length ? Math.round((count / startups.length) * 100) : 0;
            return (
              <div key={stage} className="flex-1 min-w-[100px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-zinc-400 truncate">{stage}</span>
                  <span className="text-[10px] font-bold text-white ml-1">{count}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
