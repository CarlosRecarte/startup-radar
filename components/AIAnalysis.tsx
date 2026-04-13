'use client';

import { useState, useEffect } from 'react';
import type { Startup } from '@/types';
import { getAnalysis, saveAnalysis } from '@/lib/api/analyses';
import type { SavedAnalysis } from '@/lib/api/analyses';

const ANALYSIS_MODEL = 'claude-sonnet-4-5';

interface AIAnalysisProps {
  startup: Startup;
  onSaved?: (startupId: string) => void;
}

// ─── Iconos ───────────────────────────────────────────────────────────────────

function AIIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function BookmarkFilledIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v16l-6-3-6 3V4z" />
    </svg>
  );
}

function BookmarkEmptyIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

// ─── Renderizado de texto ─────────────────────────────────────────────────────

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

function AnalysisText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={i} className="h-1.5" />;

        if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
          const label = trimmed.replace(/^\*\*/, '').replace(/\*\*:?\s*$/, '');
          return (
            <p key={i} className="text-[10px] font-bold uppercase tracking-widest text-violet-300 pt-3 first:pt-0">
              {label}
            </p>
          );
        }

        if (/^#{1,3}\s/.test(trimmed)) {
          const label = trimmed.replace(/^#{1,3}\s/, '');
          return (
            <p key={i} className="text-[10px] font-bold uppercase tracking-widest text-violet-300 pt-3 first:pt-0">
              {label}
            </p>
          );
        }

        const vMatch = trimmed.match(/^(INVERTIR|OBSERVAR|DESCARTAR)\s*$/);
        if (vMatch) {
          const v = vMatch[1] as keyof typeof VEREDICTO_STYLES;
          return (
            <div key={i} className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-widest ${VEREDICTO_STYLES[v]}`}>
              {v}
            </div>
          );
        }

        if (/^[-•]\s/.test(trimmed)) {
          const content = trimmed.replace(/^[-•]\s/, '');
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
              <span className="text-violet-500 shrink-0 mt-0.5 select-none">•</span>
              <span className="leading-relaxed">{renderInline(content)}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
              <span className="text-violet-400 font-bold shrink-0 w-4 mt-0.5">{numMatch[1]}.</span>
              <span className="leading-relaxed">{renderInline(numMatch[2])}</span>
            </div>
          );
        }

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

export default function AIAnalysis({ startup, onSaved }: AIAnalysisProps) {
  const [loadState, setLoadState]       = useState<'checking' | 'ready'>('checking');
  const [status, setStatus]             = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [text, setText]                 = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis | null>(null);
  const [isFromSaved, setIsFromSaved]   = useState(false);
  const [saveState, setSaveState]       = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [saveToast, setSaveToast]       = useState<{ type: 'saved' | 'overwritten' } | null>(null);

  // Comprueba si hay análisis guardado al abrir el panel o cambiar de startup
  useEffect(() => {
    let cancelled = false;

    setLoadState('checking');
    setStatus('idle');
    setText(null);
    setError(null);
    setSavedAnalysis(null);
    setIsFromSaved(false);
    setSaveState('idle');
    setSaveToast(null);

    getAnalysis(startup.id)
      .then((analysis) => {
        if (cancelled) return;
        if (analysis) {
          setSavedAnalysis(analysis);
          setText(analysis.analysis_text);
          setStatus('done');
          setIsFromSaved(true);
        }
      })
      .catch(() => {
        // fallo silencioso — muestra el botón de generar
      })
      .finally(() => {
        if (!cancelled) setLoadState('ready');
      });

    return () => { cancelled = true; };
  }, [startup.id]);

  const analyze = async () => {
    setStatus('loading');
    setError(null);
    setIsFromSaved(false);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startup),
      });

      let data: { text?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Error HTTP ${res.status} (${res.statusText}) — respuesta no válida del servidor.`);
      }

      if (!res.ok || data.error) throw new Error(data.error ?? `Error HTTP ${res.status}`);
      if (!data.text) throw new Error('La respuesta del servidor no contiene texto.');

      setText(data.text);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const handleSave = async () => {
    if (!text || saveState === 'saving') return;
    const wasAlreadySaved = savedAnalysis !== null;
    setSaveState('saving');

    try {
      const result = await saveAnalysis(startup.id, text, ANALYSIS_MODEL);
      setSavedAnalysis(result);
      setSaveState('done');
      setSaveToast({ type: wasAlreadySaved ? 'overwritten' : 'saved' });
      setTimeout(() => setSaveToast(null), 3000);
      onSaved?.(startup.id);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  // ── Comprobando BD ─────────────────────────────────────────────────────────

  if (loadState === 'checking') {
    return (
      <div className="flex items-center justify-center py-5">
        <div className="w-5 h-5 rounded-full border-2 border-violet-500/40 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (status === 'idle') {
    return (
      <button
        onClick={analyze}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
      >
        <AIIcon />
        Generar análisis
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

  const isSaved = savedAnalysis !== null;
  const savedDate = savedAnalysis
    ? new Date(savedAnalysis.updated_at).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <div className="rounded-xl border border-violet-700/30 bg-violet-950/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-violet-800/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <AIIcon className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300 shrink-0">
            Análisis IA
          </span>
          {isFromSaved && savedDate && (
            <span className="text-[10px] text-zinc-500 truncate">· guardado el {savedDate}</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Bookmark */}
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            title={isSaved ? 'Sobrescribir análisis guardado' : 'Guardar análisis'}
            className="flex items-center gap-1 text-[10px] disabled:opacity-50 transition-colors group"
          >
            {saveState === 'saving' ? (
              <div className="w-3 h-3 rounded-full border border-violet-400 border-t-transparent animate-spin" />
            ) : isSaved ? (
              <BookmarkFilledIcon className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-colors" />
            ) : (
              <BookmarkEmptyIcon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
            )}
            <span className={`transition-colors ${isSaved ? 'text-amber-400 group-hover:text-amber-300' : 'text-zinc-500 group-hover:text-amber-400'}`}>
              {isSaved ? 'Guardado' : 'Guardar'}
            </span>
          </button>

          {/* Re-analizar */}
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
      </div>

      {/* Toast de guardado */}
      {saveToast && (
        <div className={`px-4 py-2 text-[11px] font-medium flex items-center gap-1.5 border-b ${
          saveToast.type === 'saved'
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/30'
            : 'bg-blue-950/40 text-blue-300 border-blue-800/30'
        }`}>
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {saveToast.type === 'saved' ? 'Análisis guardado' : 'Análisis sobrescrito'}
        </div>
      )}

      <div className="px-4 py-4">
        <AnalysisText text={text} />
      </div>
    </div>
  );
}
