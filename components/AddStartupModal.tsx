'use client';

import { useState, useEffect } from 'react';
import { PipelineStage, StartupStage } from '@/types';
import { PIPELINE_STAGES } from '@/data/startups';

const STARTUP_STAGES: StartupStage[] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
const SECTORS = [
  'AI/ML', 'CleanTech', 'HealthTech', 'FinTech', 'Logistics',
  'EdTech', 'Cybersecurity', 'AgriTech', 'SpaceTech', 'RetailTech',
  'PropTech', 'LegalTech', 'HRTech', 'MarTech', 'Otro',
];

interface FormData {
  name: string;
  sector: string;
  stage: StartupStage;
  description: string;
  website: string;
  initialPhase: PipelineStage;
}

interface Props {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    sector: string;
    stage: string;
    description?: string;
    website?: string;
    initialPhase?: PipelineStage;
  }) => Promise<void>;
}

export default function AddStartupModal({ onClose, onAdd }: Props) {
  const [form, setForm] = useState<FormData>({
    name: '',
    sector: '',
    stage: 'Seed',
    description: '',
    website: '',
    initialPhase: 'Discovery',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cierra con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.sector.trim()) { setError('El sector es obligatorio'); return; }

    setLoading(true);
    setError(null);
    try {
      await onAdd({
        name: form.name.trim(),
        sector: form.sector.trim(),
        stage: form.stage,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        initialPhase: form.initialPhase,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">Nueva Startup</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="NeuralFlow, MedPulse..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                autoFocus
              />
            </div>

            {/* Sector + Stage en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Sector <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.sector}
                  onChange={(e) => set('sector', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value="">Selecciona...</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Etapa <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.stage}
                  onChange={(e) => set('stage', e.target.value as StartupStage)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  {STARTUP_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Qué hace esta startup..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>

            {/* Website + Fase inicial en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fase inicial</label>
                <select
                  value={form.initialPhase}
                  onChange={(e) => set('initialPhase', e.target.value as PipelineStage)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error inline */}
            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Añadiendo...
                </>
              ) : (
                'Añadir startup'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
