'use client';

import { useState, useMemo } from 'react';
import { startups, SECTORS, STAGES } from '@/data/startups';
import StartupCard from '@/components/StartupCard';
import { StartupStage } from '@/types';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'revenue' | 'name'>('score');

  const filtered = useMemo(() => {
    let result = [...startups];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedSector) {
      result = result.filter((s) => s.sector === selectedSector);
    }

    if (selectedStage) {
      result = result.filter((s) => s.stage === selectedStage);
    }

    result.sort((a, b) => {
      if (sortBy === 'score') return b.radarScore - a.radarScore;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0; // revenue sort is illustrative
    });

    return result;
  }, [searchQuery, selectedSector, selectedStage, sortBy]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Discover</h1>
        <p className="text-sm text-zinc-400 mt-1">Explora y filtra startups en el radar</p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar startup, sector, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Sector filter */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
          >
            <option value="">Todos los sectores</option>
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>

          {/* Stage filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
          >
            <option value="">Todas las etapas</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'revenue' | 'name')}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
          >
            <option value="score">Ordenar: Radar Score</option>
            <option value="name">Ordenar: Nombre</option>
            <option value="revenue">Ordenar: Revenue</option>
          </select>
        </div>

        {/* Active filter chips */}
        {(selectedSector || selectedStage || searchQuery) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-zinc-500">Filtros activos:</span>
            {searchQuery && (
              <span className="flex items-center gap-1 text-xs bg-violet-900/40 text-violet-300 border border-violet-700/50 px-2 py-0.5 rounded-full">
                &ldquo;{searchQuery}&rdquo;
                <button onClick={() => setSearchQuery('')} className="hover:text-white">×</button>
              </span>
            )}
            {selectedSector && (
              <span className="flex items-center gap-1 text-xs bg-blue-900/40 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full">
                {selectedSector}
                <button onClick={() => setSelectedSector('')} className="hover:text-white">×</button>
              </span>
            )}
            {selectedStage && (
              <span className="flex items-center gap-1 text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                {selectedStage}
                <button onClick={() => setSelectedStage('')} className="hover:text-white">×</button>
              </span>
            )}
            <button
              onClick={() => { setSearchQuery(''); setSelectedSector(''); setSelectedStage(''); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline ml-1"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-400">
          <span className="text-white font-semibold">{filtered.length}</span> startups encontradas
        </p>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((startup) => (
            <StartupCard key={startup.id} startup={startup} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-zinc-400 font-medium">Sin resultados</p>
          <p className="text-zinc-600 text-sm mt-1">Prueba con otros filtros</p>
        </div>
      )}
    </div>
  );
}
