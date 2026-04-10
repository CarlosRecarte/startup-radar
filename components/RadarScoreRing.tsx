'use client';

import { useEffect, useState } from 'react';

interface RadarScoreRingProps {
  score: number;
  size?: number;
}

function scoreColor(score: number): string {
  if (score >= 90) return '#10B981';
  if (score >= 80) return '#F59E0B';
  if (score >= 70) return '#F97316';
  return '#EF4444';
}

export default function RadarScoreRing({ score, size = 48 }: RadarScoreRingProps) {
  const [filled, setFilled] = useState(false);

  // Dispara la animación de llenado al montar y al cambiar el score
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const strokeWidth = size <= 40 ? 3 : size <= 60 ? 4 : 5;
  const radius      = (size - strokeWidth * 2) / 2;
  const circ        = 2 * Math.PI * radius;
  const offset      = filled ? circ - (score / 100) * circ : circ;
  const color       = scoreColor(score);
  const fontSize    = Math.max(9, Math.round(size * 0.22));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#27272a" strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-white" style={{ fontSize }}>{score}</span>
      </div>
    </div>
  );
}
