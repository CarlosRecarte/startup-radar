'use client';

import { useEffect, useState } from 'react';

interface RadarScoreBreakdownProps {
  growthScore?: number;
  teamScore?: number;
  marketScore?: number;
  tractionScore?: number;
  capitalScore?: number;
}

const DIMENSIONS = [
  { key: 'growthScore',   label: 'Growth',   color: '#10B981', weight: 30 },
  { key: 'teamScore',     label: 'Team',     color: '#8B5CF6', weight: 25 },
  { key: 'marketScore',   label: 'Market',   color: '#06B6D4', weight: 20 },
  { key: 'tractionScore', label: 'Traction', color: '#F59E0B', weight: 15 },
  { key: 'capitalScore',  label: 'Capital',  color: '#EC4899', weight: 10 },
] as const;

export default function RadarScoreBreakdown({
  growthScore,
  teamScore,
  marketScore,
  tractionScore,
  capitalScore,
}: RadarScoreBreakdownProps) {
  const [animated, setAnimated] = useState(false);

  // Dispara la animación al montar
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const values: Record<string, number | undefined> = {
    growthScore,
    teamScore,
    marketScore,
    tractionScore,
    capitalScore,
  };

  return (
    <div className="space-y-2.5">
      {DIMENSIONS.map(({ key, label, color, weight }) => {
        const value = values[key];
        const pct   = value != null ? Math.min(100, value) : 0;

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color }}>{label}</span>
              <span className="text-xs font-mono text-zinc-400">
                {value != null ? Math.round(value) : '—'}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: animated ? `${pct}%` : '0%',
                  backgroundColor: color,
                  opacity: value != null ? 1 : 0.25,
                  transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-zinc-600 pt-0.5">
        Ponderación: Growth {DIMENSIONS[0].weight}%, Team {DIMENSIONS[1].weight}%,
        Market {DIMENSIONS[2].weight}%, Traction {DIMENSIONS[3].weight}%,
        Capital {DIMENSIONS[4].weight}%
      </p>
    </div>
  );
}
