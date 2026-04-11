'use client';

import { useState } from 'react';
import type { Startup } from '@/types';

interface AIAnalysisProps {
  startup: Startup;
}

// ─── Icono ────────────────────────────────────────────────────────────────────

function AIIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

// ─── Renderizado de texto ─────────────────────────────────────────────────────

/** Reemplaza **texto** por <strong> */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
          : p
      )}
    </>
  );
}

const VEREDICTO_STYLES = {
  INVERTIR:  'bg-emerald-950/50 border-emerald-600/50 text-emerald-300',
  OBSERVAR:  'bg-amber-950/50   border-amber-600/50   text-amber-300',
  DESCARTAR: 'bg-red-950/50     border-red-600/50     text-red-300',
} as const;

/** Renderiza el texto del análisis con estilos visuales */
function AnalysisText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Línea vacía → separador
        if (!trimmed) return <div key={i} className="h-1.5" />;

        // Sección headers: **TEXTO** o **TEXTO:**
        if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
          const label = trimmed.replace(/^\*\*/, '').replace(/\*\*:?\s*$/, '');
          return (
            <p key={i} className="text-[10px] font-bold uppercase tracking-widest text-violet-300 pt-3 first:pt-0">
              {label}
            </p>
          );
        }

        // Headers Markdown: ## Texto
        if (/^#{1,3}\s/.test(trimmed)) {
          const label = trimmed.replace(/^#{1,3}\s/, '');
          return (
            <p key={i} className="text-[10px] font-bold uppercase tracking-widest text-violet-300 pt-3 first:pt-0">
              {label}
            </p>
          );
        }

        // Veredicto standalone: INVERTIR / OBSERVAR / DESCARTAR
        const vMatch = trimmed.match(/^(INVERTIR|OBSERVAR|DESCARTAR)\s*$/);
        if (vMatch) {
          const v = vMatch[1] as keyof typeof VEREDICTO_STYLES;
          return (
            <div key={i} className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-widest ${VEREDICTO_STYLES[v]}`}>
              {v}
            </div>
          );
        }

        // Bullet points: - texto o • texto
        if (/^[-•]\s/.test(trimmed)) {
          const content = trimmed.replace(/^[-•]\s/, '');
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
              <span className="text-violet-500 shrink-0 mt-0.5 select-none">•</span>
              <span className="leading-relaxed">{renderInline(content)}</span>
            </div>
          );
        }

        // Numbered items: 1. texto
        const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
              <span className="text-violet-400 font-bold shrink-0 w-4 mt-0.5">{numMatch[1]}.</span>
              <span className="leading-relaxed">{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Texto normal
        return (
          <p key={i} className="text-xs text-zinc-300 leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AIAnalysis({ startup }: AIAnalysisProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [text, setText]     = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const analyze = async () => {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startup),
      });

      // Vercel puede devolver HTML en errores 502/504 — capturamos el JSON parse
      let data: { text?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Error HTTP ${res.status} (${res.statusText}) — respuesta no válida del servidor.`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Error HTTP ${res.status}`);
      }

      if (!data.text) {
        throw new Error('La respuesta del servidor no contiene texto.');
      }

      setText(data.text);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-red-300 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={analyze}
          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reintentar
        </button>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────

  if (!text) return null;

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-analizar
        </button>
      </div>

      <div className="px-4 py-4">
        <AnalysisText text={text} />
      </div>
    </div>
  );
}
