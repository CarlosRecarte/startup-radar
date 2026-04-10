'use client';

import { useState } from 'react';
import type { Startup } from '@/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  evaluacion: string;
  fortalezas: string[];
  riesgos: Array<{ descripcion: string; nivel: 'Alto' | 'Medio' | 'Bajo' }>;
  acciones: string[];
  veredicto: 'INVERTIR' | 'OBSERVAR' | 'DESCARTAR';
  justificacion_veredicto: string;
}

interface AIAnalysisProps {
  startup: Startup;
}

// ─── Estilos por veredicto / nivel de riesgo ──────────────────────────────────

const VEREDICTO_STYLES: Record<
  AnalysisResult['veredicto'],
  { bg: string; border: string; text: string; dot: string }
> = {
  INVERTIR:  { bg: 'bg-emerald-950/40', border: 'border-emerald-600/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  OBSERVAR:  { bg: 'bg-amber-950/40',   border: 'border-amber-600/50',   text: 'text-amber-300',   dot: 'bg-amber-400'   },
  DESCARTAR: { bg: 'bg-red-950/40',     border: 'border-red-600/50',     text: 'text-red-300',     dot: 'bg-red-400'     },
};

const RIESGO_BADGE: Record<'Alto' | 'Medio' | 'Bajo', string> = {
  Alto:  'bg-red-900/40 text-red-300 border-red-700/40',
  Medio: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  Bajo:  'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
};

// ─── Icono de IA ──────────────────────────────────────────────────────────────

function AIIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AIAnalysis({ startup }: AIAnalysisProps) {
  const [status, setStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const analyze = async () => {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startup),
      });

      // Vercel puede devolver HTML (502/504) si la función agota tiempo o falla en frío
      let data: { error?: string } & Partial<AnalysisResult>;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Error HTTP ${res.status} — respuesta no válida del servidor. Inténtalo de nuevo.`);
      }

      if (!res.ok) {
        throw new Error(data.error ?? `Error HTTP ${res.status}`);
      }

      setAnalysis(data as AnalysisResult);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setStatus('error');
    }
  };

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (status === 'idle') {
    return (
      <button
        onClick={analyze}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
      >
        <AIIcon />
        Analizar con IA
      </button>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="rounded-xl border border-violet-700/40 bg-violet-950/20 px-5 py-5 flex items-center gap-4">
        <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin shrink-0" />
        <div>
          <p className="text-sm font-semibold text-violet-300">Analizando {startup.name}…</p>
          <p className="text-xs text-zinc-500 mt-0.5">Consultando modelo de IA</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-4 space-y-3">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-300">{error}</p>
        </div>
        <button
          onClick={analyze}
          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reintentar
        </button>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────

  if (!analysis) return null;

  const vs = VEREDICTO_STYLES[analysis.veredicto];

  return (
    <div className="rounded-xl border border-violet-700/30 bg-violet-950/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-violet-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AIIcon className="w-4 h-4 text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
            Análisis IA
          </span>
        </div>
        <button
          onClick={analyze}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-violet-300 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-analizar
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Veredicto */}
        <div className={`flex items-start gap-3 rounded-lg border p-3 ${vs.bg} ${vs.border}`}>
          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${vs.dot}`} />
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${vs.text}`}>
              {analysis.veredicto}
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {analysis.justificacion_veredicto}
            </p>
          </div>
        </div>

        {/* Evaluación general */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            Evaluación
          </p>
          <p className="text-xs text-zinc-300 leading-relaxed">{analysis.evaluacion}</p>
        </div>

        {/* Fortalezas */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            Fortalezas
          </p>
          <ul className="space-y-1.5">
            {analysis.fortalezas.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                <svg
                  className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Riesgos */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            Riesgos
          </p>
          <ul className="space-y-2">
            {analysis.riesgos.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${RIESGO_BADGE[r.nivel]}`}
                >
                  {r.nivel}
                </span>
                <span className="text-xs text-zinc-300 leading-relaxed">{r.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Acciones recomendadas */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            Acciones Recomendadas
          </p>
          <ol className="space-y-1.5">
            {analysis.acciones.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                <span className="text-violet-400 font-bold shrink-0">{i + 1}.</span>
                {a}
              </li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  );
}
