import { RiskCategory, getCategoryLabel, getCategoryColor } from './types';

interface RiskMeterProps {
  score: number;
  maxScore?: number;
  category: RiskCategory;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskMeter = ({ score, maxScore = 60, category, size = 'md' }: RiskMeterProps) => {
  const percentage = (score / maxScore) * 100;
  
  const sizeClasses = {
    sm: { width: 160, height: 80, strokeWidth: 12 },
    md: { width: 240, height: 120, strokeWidth: 16 },
    lg: { width: 320, height: 160, strokeWidth: 20 },
  };

  const { width, height, strokeWidth } = sizeClasses[size];
  const radius = height - strokeWidth / 2;
  const circumference = Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  // Category color mapping using HSL for gradients
  const getCategoryHSL = (cat: RiskCategory) => {
    const hues: Record<RiskCategory, number> = {
      very_conservative: 210, // Blue
      conservative: 185, // Cyan
      moderate: 145, // Green
      aggressive: 30, // Orange
      very_aggressive: 0, // Red
    };
    return hues[cat];
  };

  const hue = getCategoryHSL(category);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={width}
        height={height + 20}
        viewBox={`0 0 ${width} ${height + 20}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`meterGradient-${category}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`hsl(210, 80%, 50%)`} />
            <stop offset="25%" stopColor={`hsl(185, 70%, 50%)`} />
            <stop offset="50%" stopColor={`hsl(145, 70%, 45%)`} />
            <stop offset="75%" stopColor={`hsl(30, 90%, 50%)`} />
            <stop offset="100%" stopColor={`hsl(0, 80%, 50%)`} />
          </linearGradient>
        </defs>

        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored arc based on score */}
        <path
          d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
          fill="none"
          stroke={`url(#meterGradient-${category})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="transition-all duration-1000 ease-out"
        />

        {/* Needle */}
        <g transform={`translate(${width / 2}, ${height})`}>
          <circle r="8" fill="hsl(var(--foreground))" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={-radius + strokeWidth + 10}
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${-90 + (percentage / 100) * 180})`}
            className="transition-transform duration-1000 ease-out"
          />
        </g>

        {/* Score labels */}
        <text x={strokeWidth / 2 + 5} y={height + 16} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="start">
          0
        </text>
        <text x={width - strokeWidth / 2 - 5} y={height + 16} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="end">
          {maxScore}
        </text>
      </svg>

      <div className="text-center mt-2">
        <p className="text-3xl font-bold">{score}</p>
        <p className={`text-lg font-semibold ${getCategoryColor(category)}`}>
          {getCategoryLabel(category)}
        </p>
      </div>
    </div>
  );
};
