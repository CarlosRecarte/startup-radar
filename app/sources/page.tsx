'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLastRunPerSource, getStartupCountsBySource } from '@/lib/api/scraperRuns';
import type { ScraperRun } from '@/lib/api/scraperRuns';

// ─── Config de fuentes ────────────────────────────────────────────────────────

const SOURCES = [
  {
    id: 'hackernews',
    name: 'Hacker News',
    description: 'Posts "Show HN:" de los últimos 7 días con startups validadas por la comunidad tech.',
    endpoint: '/api/scrapers/hackernews',
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    description: 'Top 30 productos por votos filtrados por IA para identificar startups con modelo de negocio real.',
    endpoint: '/api/scrapers/producthunt',
  },
  {
    id: 'github',
    name: 'GitHub Trending',
    description: 'Repositorios de organizaciones con +100 estrellas creados en los últimos 30 días.',
    endpoint: '/api/scrapers/github',
  },
] as const;

type SourceId = typeof SOURCES[number]['id'];

// ─── Iconos ───────────────────────────────────────────────────────────────────

function HNIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#ff6600" />
      <text x="8" y="24" fontSize="20" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">Y</text>
    </svg>
  );
}

function PHIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="16" fill="#da552f" />
      <text x="9" y="23" fontSize="16" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">P</text>
    </svg>
  );
}

function GHIcon() {
  return (
    <svg className="w-8 h-8 fill-zinc-200" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const SOURCE_ICONS: Record<SourceId, React.ReactNode> = {
  hackernews:   <HNIcon />,
  producthunt:  <PHIcon />,
  github:       <GHIcon />,
};

const SOURCE_THEMES: Record<SourceId, { border: string; glow: string; iconBg: string }> = {
  hackernews:  { border: 'border-orange-800/40', glow: 'hover:border-orange-600/50', iconBg: 'bg-orange-950/40' },
  producthunt: { border: 'border-red-800/40',    glow: 'hover:border-red-600/50',    iconBg: 'bg-red-950/40'    },
  github:      { border: 'border-zinc-700/40',   glow: 'hover:border-zinc-500/50',   iconBg: 'bg-zinc-800/60'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function RunStatus({ run }: { run: ScraperRun | null }) {
  if (!run) return <span className="text-xs text-zinc-600">Sin ejecuciones</span>;

  const isOk = run.status === 'success';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <span className={`text-xs font-medium ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>
        {isOk ? 'Éxito' : 'Error'}
      </span>
      <span className="text-xs text-zinc-500">· {formatDate(run.finished_at)}</span>
    </div>
  );
}

// ─── Estado por fuente ────────────────────────────────────────────────────────

interface RunState {
  status: 'idle' | 'running' | 'done' | 'error';
  result: { processed: number; found: number; newAdded: number } | null;
  errorMsg: string | null;
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SourcesPage() {
  const [counts, setCounts]     = useState<Record<string, number>>({});
  const [lastRuns, setLastRuns] = useState<Record<string, ScraperRun>>({});
  const [loading, setLoading]   = useState(true);
  const [runState, setRunState] = useState<Record<SourceId, RunState>>({
    hackernews:  { status: 'idle', result: null, errorMsg: null },
    producthunt: { status: 'idle', result: null, errorMsg: null },
    github:      { status: 'idle', result: null, errorMsg: null },
  });

  const loadData = useCallback(async () => {
    const [c, r] = await Promise.all([
      getStartupCountsBySource(),
      getLastRunPerSource(),
    ]);
    setCounts(c);
    setLastRuns(r);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runScraper = async (source: SourceId, endpoint: string) => {
    setRunState((prev) => ({
      ...prev,
      [source]: { status: 'running', result: null, errorMsg: null },
    }));

    try {
      const res  = await fetch(endpoint, { method: 'POST' });
      const data = await res.json() as {
        processed?: number;
        startups_found?: number;
        new_startups?: number;
        error?: string;
      };

      if (!res.ok || data.error) {
        setRunState((prev) => ({
          ...prev,
          [source]: { status: 'error', result: null, errorMsg: data.error ?? `Error ${res.status}` },
        }));
        return;
      }

      setRunState((prev) => ({
        ...prev,
        [source]: {
          status: 'done',
          result: {
            processed: data.processed ?? 0,
            found:     data.startups_found ?? 0,
            newAdded:  data.new_startups ?? 0,
          },
          errorMsg: null,
        },
      }));

      // Refresca conteos y último run
      await loadData();

    } catch (e) {
      setRunState((prev) => ({
        ...prev,
        [source]: {
          status: 'error',
          result: null,
          errorMsg: e instanceof Error ? e.message : 'Error inesperado',
        },
      }));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Fuentes de Datos</h1>
        <p className="text-sm text-zinc-400 mt-1">Gestiona y ejecuta los scrapers de Startup Radar</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5">
        {SOURCES.map((src) => {
          const theme  = SOURCE_THEMES[src.id];
          const run    = runState[src.id];
          const lastRun = lastRuns[src.id] ?? null;
          const count  = counts[src.id] ?? 0;
          const isRunning = run.status === 'running';

          return (
            <div
              key={src.id}
              className={`bg-zinc-900 border ${theme.border} ${theme.glow} rounded-2xl p-6 transition-colors`}
            >
              <div className="flex items-start justify-between gap-6">
                {/* Left: icon + info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 ${theme.iconBg}`}>
                    {SOURCE_ICONS[src.id]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-white">{src.name}</h2>
                    <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">{src.description}</p>

                    {/* Stats row */}
                    <div className="flex items-center gap-5 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {loading ? (
                          <span className="text-xs text-zinc-600">Cargando…</span>
                        ) : (
                          <span className="text-xs text-zinc-300">
                            <span className="font-semibold text-white">{count}</span> startups en BD
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-zinc-400">
                          Última ejecución:&nbsp;
                        </span>
                        <RunStatus run={lastRun} />
                      </div>

                      {lastRun && (
                        <span className="text-xs text-zinc-600">
                          {lastRun.new_startups ?? 0} nuevas · {lastRun.elapsed_seconds ?? 0}s
                        </span>
                      )}
                    </div>

                    {/* Resultado de la última ejecución manual */}
                    {run.status === 'done' && run.result && (
                      <div className="mt-3 flex items-center gap-2 bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-3 py-2">
                        <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-emerald-300">
                          {run.result.processed} analizadas · {run.result.found} startups detectadas · <strong className="text-emerald-200">{run.result.newAdded} nuevas añadidas</strong>
                        </span>
                      </div>
                    )}

                    {run.status === 'error' && run.errorMsg && (
                      <div className="mt-3 flex items-center gap-2 bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
                        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-xs text-red-300">{run.errorMsg}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: run button */}
                <div className="shrink-0">
                  <button
                    onClick={() => runScraper(src.id, src.endpoint)}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors shadow-lg shadow-violet-900/20 whitespace-nowrap"
                  >
                    {isRunning ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Ejecutando…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ejecutar ahora
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Barra de progreso mientras ejecuta */}
              {isRunning && (
                <div className="mt-4 overflow-hidden rounded-full bg-zinc-800 h-1">
                  <div className="h-full bg-violet-500 animate-pulse w-full" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <p className="mt-6 text-xs text-zinc-600 text-center">
        Los scrapers usan Claude para clasificar cada resultado. Una ejecución puede tardar hasta 5 minutos.
      </p>
    </div>
  );
}
