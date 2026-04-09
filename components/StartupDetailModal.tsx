'use client';

import { useState, useEffect, useRef } from 'react';
import { Startup } from '@/types';
import RadarScoreRing from './RadarScoreRing';

interface Props {
  startup: Startup;
  onClose: () => void;
  onSaveNotes: (startupId: string, notes: string) => Promise<void>;
}

export default function StartupDetailModal({ startup, onClose, onSaveNotes }: Props) {
  const [notes, setNotes] = useState(startup.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cierra con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Sincroniza notas si cambia la startup seleccionada
  useEffect(() => {
    setNotes(startup.notes ?? '');
    setSaved(false);
  }, [startup.id, startup.notes]);

  async function handleSave() {
    setSaving(true);
    await onSaveNotes(startup.id, notes);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const scoreColor =
    startup.radarScore >= 80
      ? 'text-emerald-400'
      : startup.radarScore >= 60
      ? 'text-blue-400'
      : startup.radarScore >= 40
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <RadarScoreRing score={startup.radarScore} size={56} strokeWidth={4} />
            <div>
              <h2 className="text-lg font-bold text-white">{startup.name}</h2>
              <p className="text-sm text-zinc-400">
                {startup.sector}
                <span className="mx-1.5 text-zinc-700">·</span>
                <span className={scoreColor}>{startup.radarScore} pts</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {startup.stage}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-900/40 text-violet-300 border border-violet-700/40">
              {startup.pipelineStage}
            </span>
            {startup.revenue && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 font-mono border border-zinc-700">
                {startup.revenue}
              </span>
            )}
            {startup.growth && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                {startup.growth}
              </span>
            )}
          </div>

          {/* Description */}
          {startup.description && (
            <p className="text-sm text-zinc-400 leading-relaxed">{startup.description}</p>
          )}

          {/* Tags */}
          {startup.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {startup.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Website */}
          {startup.website && (
            <a
              href={startup.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {startup.website}
            </a>
          )}

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Notas del pipeline
            </label>
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              rows={5}
              placeholder="Añade observaciones, próximos pasos, contactos clave..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Guardando...
              </>
            ) : saved ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </>
            ) : (
              'Guardar notas'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
