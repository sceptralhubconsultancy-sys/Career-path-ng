interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const clampedCurrent = Math.min(Math.max(current, 1), safeTotal);
  const percentage = Math.round((clampedCurrent / safeTotal) * 100);

  return (
    <div className="w-full" role="region" aria-label="Assessment progress">
      <div className="flex items-center justify-between text-xs font-medium text-[#6B6A65] mb-2">
        <span>{label || `Question ${clampedCurrent} of ${safeTotal}`}</span>
        <span className="tabular-nums">{percentage}%</span>
      </div>
      <div
        className="w-full h-2 bg-[#E8E6E0] rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[#0F766E] rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
