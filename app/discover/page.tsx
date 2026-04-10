'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getFilteredStartups, updateStartupPhase } from '@/lib/api/startups';
import RadarScoreRing from '@/components/RadarScoreRing';
import RadarScoreBreakdown from '@/components/RadarScoreBreakdown';
import AIAnalysis from '@/components/AIAnalysis';
import type { Startup, StartupStage } from '@/types';

// ─── Constantes de estilo ─────────────────────────────────────────────────────

const SECTOR_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  'AI / ML':       { text: 'text-purple-300', bg: 'bg-purple-900/30', border: 'border-purple-700/40' },
  'CleanTech':     { text: 'text-green-300',  bg: 'bg-green-900/30',  border: 'border-green-700/40'  },
  'HealthTech':    { text: 'text-pink-300',   bg: 'bg-pink-900/30',   border: 'border-pink-700/40'   },
  'FinTech':       { text: 'text-yellow-300', bg: 'bg-yellow-900/30', border: 'border-yellow-700/40' },
  'Logistics':     { text: 'text-orange-300', bg: 'bg-orange-900/30', border: 'border-orange-700/40' },
  'EdTech':        { text: 'text-sky-300',    bg: 'bg-sky-900/30',    border: 'border-sky-700/40'    },
  'Cybersecurity': { text: 'text-red-300',    bg: 'bg-red-900/30',    border: 'border-red-700/40'    },
  'AgriTech':      { text: 'text-lime-300',   bg: 'bg-lime-900/30',   border: 'border-lime-700/40'   },
  'SpaceTech':     { text: 'text-indigo-300', bg: 'bg-indigo-900/30', border: 'border-indigo-700/40' },
  'RetailTech':    { text: 'text-amber-300',  bg: 'bg-amber-900/30',  border: 'border-amber-700/40'  },
};

const STAGE_COLORS: Record<string, string> = {
  'Pre-Seed': 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40',
  'Seed':     'bg-violet-900/40 text-violet-300 border-violet-700/40',
  'Series A': 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  'Series B': 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
  'Series C+':'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
};

const ALL_STAGES: StartupStage[] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'];

type SortOption = 'radarScore' | 'growth' | 'funding' | 'newest';
type ViewMode = 'grid' | 'list';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFunding(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function sectorStyle(sector: string) {
  return SECTOR_COLORS[sector] ?? { text: 'text-zinc-300', bg: 'bg-zinc-700/30', border: 'border-zinc-600/40' };
}

// ─── MultiSelectDropdown ──────────────────────────────────────────────────────

function MultiSelectDropdown({
  options, selected, onChange, placeholder,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors whitespace-nowrap"
      >
        <span className={selected.length > 0 ? 'text-violet-300' : 'text-zinc-400'}>
          {selected.length > 0 ? `${placeholder} (${selected.length})` : placeholder}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl z-30 min-w-[180px] py-1 max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-zinc-700 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-3.5 h-3.5 accent-violet-500 cursor-pointer"
              />
              <span className="text-sm text-zinc-200">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
          <div className="h-3 bg-zinc-800 rounded-full w-20" />
        </div>
        <div className="w-12 h-12 rounded-full bg-zinc-800 shrink-0" />
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="h-3 bg-zinc-800 rounded" />
        <div className="h-3 bg-zinc-800 rounded w-5/6" />
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-5 bg-zinc-800 rounded-full w-16" />
        <div className="h-5 bg-zinc-800 rounded w-12" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-4 bg-zinc-800 rounded w-14" />
        <div className="h-4 bg-zinc-800 rounded w-16" />
      </div>
    </div>
  );
}

// ─── StartupDiscoverCard ──────────────────────────────────────────────────────

function StartupDiscoverCard({ startup, onClick }: { startup: Startup; onClick: () => void }) {
  const ss    = sectorStyle(startup.sector);
  const sc    = STAGE_COLORS[startup.stage] ?? 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40';
  const isPos = startup.growth?.startsWith('+');

  return (
    <div
      onClick={onClick}
      className="group bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 hover:border-zinc-600"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm truncate group-hover:text-violet-300 transition-colors">
            {startup.name}
          </h3>
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border mt-1 ${ss.text} ${ss.bg} ${ss.border}`}>
            {startup.sector}
          </span>
        </div>
        <RadarScoreRing score={startup.radarScore} size={40} />
      </div>

      {/* Descripción */}
      <p className="text-xs text-zinc-400 leading-relaxed mb-3 line-clamp-2">
        {startup.description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${sc}`}>
          {startup.stage}
        </span>
        {startup.revenue && startup.revenue !== '—' && (
          <span className="text-[11px] text-zinc-400 font-mono">{startup.revenue}</span>
        )}
        {startup.growth && (
          <span className={`text-[11px] font-medium flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPos ? '↑' : '↓'} {startup.growth}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {startup.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
              {tag}
            </span>
          ))}
        </div>
        {startup.country && (
          <span className="text-[10px] text-zinc-500">{startup.country}</span>
        )}
      </div>
    </div>
  );
}

// ─── StartupListRow ───────────────────────────────────────────────────────────

function StartupListRow({ startup, onClick }: { startup: Startup; onClick: () => void }) {
  const ss = sectorStyle(startup.sector);
  const sc = STAGE_COLORS[startup.stage] ?? 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40';

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800/60"
    >
      <RadarScoreRing score={startup.radarScore} size={40} />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white text-sm truncate group-hover:text-violet-300 transition-colors">
          {startup.name}
        </h3>
        <p className="text-xs text-zinc-500 truncate">{startup.description}</p>
      </div>
      <span className={`hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${ss.text} ${ss.bg} ${ss.border}`}>
        {startup.sector}
      </span>
      <span className={`hidden md:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${sc}`}>
        {startup.stage}
      </span>
      {startup.revenue && startup.revenue !== '—' && (
        <span className="hidden lg:block text-xs text-zinc-400 font-mono whitespace-nowrap">{startup.revenue}</span>
      )}
      {startup.growth && (
        <span className={`hidden lg:block text-xs font-medium whitespace-nowrap ${startup.growth.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
          {startup.growth}
        </span>
      )}
      {startup.country && (
        <span className="hidden xl:block text-xs text-zinc-500 whitespace-nowrap">{startup.country}</span>
      )}
    </div>
  );
}

// ─── SlideOverContent ─────────────────────────────────────────────────────────

function SlideOverContent({
  startup,
  onClose,
  onAddToPipeline,
}: {
  startup: Startup;
  onClose: () => void;
  onAddToPipeline: (s: Startup) => Promise<void>;
}) {
  const [adding, setAdding]   = useState(false);
  const [added, setAdded]     = useState(false);
  const [addErr, setAddErr]   = useState<string | null>(null);

  const ss = sectorStyle(startup.sector);
  const sc = STAGE_COLORS[startup.stage] ?? 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40';

  const handleAdd = async () => {
    setAdding(true);
    setAddErr(null);
    try {
      await onAddToPipeline(startup);
      setAdded(true);
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      {/* Header sticky */}
      <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-start justify-between gap-3 z-10">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white leading-tight">{startup.name}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${ss.text} ${ss.bg} ${ss.border}`}>
              {startup.sector}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${sc}`}>
              {startup.stage}
            </span>
            <span className="text-[11px] text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
              {startup.pipelineStage}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0 mt-0.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Descripción */}
        <p className="text-sm text-zinc-300 leading-relaxed">{startup.description}</p>

        {/* Métricas */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">Métricas</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {startup.revenue && startup.revenue !== '—' && (
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-[10px] text-zinc-500 mb-1">Revenue</p>
                <p className="text-sm font-semibold text-white font-mono">{startup.revenue}</p>
              </div>
            )}
            {startup.funding != null && (
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-[10px] text-zinc-500 mb-1">Funding</p>
                <p className="text-sm font-semibold text-white font-mono">{formatFunding(startup.funding)}</p>
              </div>
            )}
            {startup.growth && (
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-[10px] text-zinc-500 mb-1">Crecimiento</p>
                <p className={`text-sm font-semibold font-mono ${startup.growth.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {startup.growth}
                </p>
              </div>
            )}
            {startup.teamScore != null && (
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-[10px] text-zinc-500 mb-1">Team Score</p>
                <p className="text-sm font-semibold text-white">{startup.teamScore}<span className="text-zinc-500 text-xs">/100</span></p>
              </div>
            )}
            {startup.marketScore != null && (
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-[10px] text-zinc-500 mb-1">Market Score</p>
                <p className="text-sm font-semibold text-white">{startup.marketScore}<span className="text-zinc-500 text-xs">/100</span></p>
              </div>
            )}
            {startup.country && (
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-[10px] text-zinc-500 mb-1">Ubicación</p>
                <p className="text-sm font-semibold text-white">{startup.location ?? startup.country}</p>
              </div>
            )}
          </div>
        </div>

        {/* Radar Score con dimensiones */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-4">Radar Score</h3>
          <div className="flex items-center gap-5 mb-5">
            <RadarScoreRing score={startup.radarScore} size={80} />
            <div>
              <p className="text-3xl font-bold text-white leading-none">{startup.radarScore}</p>
              <p className="text-xs text-zinc-500 mt-1">de 100 puntos</p>
            </div>
          </div>
          <RadarScoreBreakdown
            growthScore={startup.growthRate != null ? Math.min(100, startup.growthRate) : undefined}
            teamScore={startup.teamScore}
            marketScore={startup.marketScore}
            tractionScore={startup.tractionScore}
            capitalScore={startup.capitalScore}
          />
        </div>

        {/* Tags */}
        {startup.tags.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2.5">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {startup.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Founders */}
        {startup.founders && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Founders</h3>
            <p className="text-sm text-zinc-300">{startup.founders}</p>
          </div>
        )}

        {/* Website */}
        {startup.website && (
          <a
            href={startup.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="truncate">{startup.website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2.5 pt-2">
          {addErr && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {addErr}
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={adding || added}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              added
                ? 'bg-emerald-700/20 text-emerald-400 border border-emerald-700/40 cursor-default'
                : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60'
            }`}
          >
            {adding ? 'Añadiendo...' : added ? '✓ Añadido al Pipeline' : 'Añadir al Pipeline'}
          </button>
          <AIAnalysis startup={startup} />
        </div>
      </div>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [allStartups, setAllStartups]       = useState<Startup[]>([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState<string | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);

  // Filtros
  const [search, setSearch]               = useState('');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedStages, setSelectedStages]   = useState<string[]>([]);
  const [minScore, setMinScore]           = useState(0);
  const [sortBy, setSortBy]               = useState<SortOption>('radarScore');
  const [viewMode, setViewMode]           = useState<ViewMode>('grid');

  // Sectores derivados de los datos cargados
  const availableSectors = useMemo(
    () => Array.from(new Set(allStartups.map((s) => s.sector))).sort(),
    [allStartups]
  );

  // Carga inicial
  useEffect(() => {
    setLoading(true);
    getFilteredStartups({})
      .then(setAllStartups)
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Bloquear scroll del body con el panel abierto
  useEffect(() => {
    document.body.style.overflow = selectedStartup ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedStartup]);

  // Filtrado y ordenación en cliente
  const filtered = useMemo(() => {
    let r = [...allStartups];

    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          (s.location ?? '').toLowerCase().includes(q) ||
          (s.country ?? '').toLowerCase().includes(q)
      );
    }
    if (selectedSectors.length > 0) r = r.filter((s) => selectedSectors.includes(s.sector));
    if (selectedStages.length > 0)  r = r.filter((s) => selectedStages.includes(s.stage));
    if (minScore > 0)               r = r.filter((s) => s.radarScore >= minScore);

    r.sort((a, b) => {
      switch (sortBy) {
        case 'growth':  return (b.growthRate  ?? -1) - (a.growthRate  ?? -1);
        case 'funding': return (b.funding     ?? -1) - (a.funding     ?? -1);
        case 'newest':
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        default:        return b.radarScore - a.radarScore;
      }
    });

    return r;
  }, [allStartups, search, selectedSectors, selectedStages, minScore, sortBy]);

  const hasFilters = search || selectedSectors.length > 0 || selectedStages.length > 0 || minScore > 0;

  const clearFilters = () => {
    setSearch('');
    setSelectedSectors([]);
    setSelectedStages([]);
    setMinScore(0);
  };

  const handleAddToPipeline = async (startup: Startup) => {
    await updateStartupPhase(startup.id, 'Discovery');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Discover</h1>
        <p className="text-sm text-zinc-400 mt-1">Explora y filtra startups en el radar</p>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative mb-4">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar startups por nombre, sector, tecnología..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-2.5 items-center">
          <MultiSelectDropdown
            options={availableSectors}
            selected={selectedSectors}
            onChange={setSelectedSectors}
            placeholder="Sector"
          />
          <MultiSelectDropdown
            options={ALL_STAGES}
            selected={selectedStages}
            onChange={setSelectedStages}
            placeholder="Stage"
          />

          {/* Score mínimo */}
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
            <span className="text-xs text-zinc-400 whitespace-nowrap">Score ≥</span>
            <input
              type="range"
              min={0} max={100} step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-20 accent-violet-500 cursor-pointer"
            />
            <span className={`text-xs font-mono w-6 text-center ${minScore > 0 ? 'text-violet-300' : 'text-zinc-500'}`}>
              {minScore}
            </span>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Chips de filtros activos */}
        {hasFilters && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Activos:</span>
            {search && (
              <span className="flex items-center gap-1 text-xs bg-violet-900/30 text-violet-300 border border-violet-700/40 px-2 py-0.5 rounded-full">
                &ldquo;{search}&rdquo;
                <button onClick={() => setSearch('')} className="hover:text-white leading-none">×</button>
              </span>
            )}
            {selectedSectors.map((s) => (
              <span key={s} className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full">
                {s}
                <button onClick={() => setSelectedSectors((prev) => prev.filter((v) => v !== s))} className="hover:text-white leading-none">×</button>
              </span>
            ))}
            {selectedStages.map((s) => (
              <span key={s} className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full">
                {s}
                <button onClick={() => setSelectedStages((prev) => prev.filter((v) => v !== s))} className="hover:text-white leading-none">×</button>
              </span>
            ))}
            {minScore > 0 && (
              <span className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full">
                Score ≥ {minScore}
                <button onClick={() => setMinScore(0)} className="hover:text-white leading-none">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Contador + ordenación + toggle vista */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <p className="text-sm text-zinc-400">
          <span className="text-white font-semibold">{loading ? '—' : filtered.length}</span> startups encontradas
        </p>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
          >
            <option value="radarScore">Radar Score</option>
            <option value="growth">Growth Rate</option>
            <option value="funding">Funding</option>
            <option value="newest">Más recientes</option>
          </select>

          {/* Toggle grid/lista */}
          <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="Vista grid"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="Vista lista"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 mb-4 text-sm text-red-400">
          Error al cargar startups: {fetchError}
        </div>
      )}

      {/* Grid / Lista */}
      {loading ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-2'
        }>
          {Array.from({ length: 6 }).map((_, i) =>
            viewMode === 'grid'
              ? <SkeletonCard key={i} />
              : (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 animate-pulse flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-zinc-800 rounded w-1/3 mb-1.5" />
                    <div className="h-3 bg-zinc-800 rounded w-2/3" />
                  </div>
                </div>
              )
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-zinc-400 font-medium">No se encontraron startups</p>
          <p className="text-zinc-600 text-sm mt-1">Prueba con otros filtros o términos de búsqueda</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <StartupDiscoverCard key={s.id} startup={s} onClick={() => setSelectedStartup(s)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <StartupListRow key={s.id} startup={s} onClick={() => setSelectedStartup(s)} />
          ))}
        </div>
      )}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          selectedStartup ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSelectedStartup(null)}
      />

      {/* Panel lateral */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[480px] lg:w-[520px] bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          selectedStartup ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedStartup && (
          <SlideOverContent
            startup={selectedStartup}
            onClose={() => setSelectedStartup(null)}
            onAddToPipeline={handleAddToPipeline}
          />
        )}
      </div>
    </div>
  );
}
