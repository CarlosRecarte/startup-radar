'use client';

interface RadarScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#10B981'; // emerald-500
  if (score >= 80) return '#F59E0B'; // amber-500
  if (score >= 70) return '#F97316'; // orange-500
  return '#EF4444';                  // red-500
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Alto';
  if (score >= 80) return 'Bueno';
  if (score >= 70) return 'Medio';
  return 'Bajo';
}

export default function RadarScoreRing({
  score,
  size = 64,
  strokeWidth = 5,
  showLabel = true,
}: RadarScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{score}</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-[10px] font-medium" style={{ color }}>{getScoreLabel(score)}</span>
      )}
    </div>
  );
}
