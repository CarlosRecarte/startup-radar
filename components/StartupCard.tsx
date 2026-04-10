import { Startup } from '@/types';
import RadarScoreRing from './RadarScoreRing';

interface StartupCardProps {
  startup: Startup;
  compact?: boolean;
}

const stageBadgeColors: Record<string, string> = {
  'Pre-Seed': 'bg-zinc-700 text-zinc-300',
  'Seed': 'bg-violet-900/60 text-violet-300',
  'Series A': 'bg-blue-900/60 text-blue-300',
  'Series B': 'bg-cyan-900/60 text-cyan-300',
  'Series C+': 'bg-emerald-900/60 text-emerald-300',
};

const sectorColors: Record<string, string> = {
  'AI / ML': 'text-purple-400',
  'CleanTech': 'text-green-400',
  'HealthTech': 'text-pink-400',
  'FinTech': 'text-yellow-400',
  'Logistics': 'text-orange-400',
  'EdTech': 'text-sky-400',
  'Cybersecurity': 'text-red-400',
  'AgriTech': 'text-lime-400',
  'SpaceTech': 'text-indigo-400',
  'RetailTech': 'text-amber-400',
};

export default function StartupCard({ startup, compact = false }: StartupCardProps) {
  const sectorColor = sectorColors[startup.sector] ?? 'text-gray-400';
  const stageBadge = stageBadgeColors[startup.stage] ?? 'bg-zinc-700 text-zinc-300';

  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-200 cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate group-hover:text-violet-300 transition-colors">
            {startup.name}
          </h3>
          <span className={`text-xs font-medium ${sectorColor}`}>{startup.sector}</span>
        </div>
        <RadarScoreRing score={startup.radarScore} size={compact ? 32 : 40} />
      </div>

      {/* Description */}
      {!compact && (
        <p className="text-xs text-zinc-400 leading-relaxed mb-3 line-clamp-2">
          {startup.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${stageBadge}`}>
          {startup.stage}
        </span>
        <span className="text-[11px] text-zinc-400 font-mono">{startup.revenue}</span>
        {startup.growth && (
          <span className="text-[11px] text-emerald-400 font-medium">{startup.growth}</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {startup.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-zinc-500">{startup.country} · {startup.founded}</span>
      </div>
    </div>
  );
}
