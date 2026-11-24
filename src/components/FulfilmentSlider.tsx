interface FulfilmentSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function getFulfilmentLabel(score: number): string {
  if (score <= 2) return 'Deeply drained — ready for a real change';
  if (score <= 4) return 'Mostly unfulfilled — something needs to shift';
  if (score <= 6) return 'Mixed — parts work, but you want more';
  if (score <= 8) return 'Fairly content — exploring a better fit';
  return 'Highly fulfilled — looking for your next stretch';
}

export function FulfilmentSlider({ value, onChange }: FulfilmentSliderProps) {
  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-[16px] bg-[#0F766E]/[0.08] border border-[#0F766E]/20 flex items-center justify-center mb-3"
          aria-live="polite"
        >
          <span className="text-4xl font-bold text-[#0F766E] tabular-nums">
            {value}
          </span>
        </div>
        <p className="text-[15px] font-medium text-[#1C1917]">
          {getFulfilmentLabel(value)}
        </p>
      </div>

      <div className="px-1">
        <label htmlFor="fulfilment-range" className="sr-only">
          Fulfilment score from 1 to 10
        </label>
        <input
          id="fulfilment-range"
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pathshift-slider"
        />
        <div className="flex justify-between mt-3 text-xs text-[#6B6A65] font-medium">
          <span>1 · Completely drained</span>
          <span>10 · Deeply fulfilled</span>
        </div>
      </div>

      {/* Direct tap scale for quick mobile selection */}
      <div
        className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-2"
        role="radiogroup"
        aria-label="Choose a number from 1 to 10"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const active = value === num;
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(num)}
              className={`min-h-[48px] rounded-[12px] text-sm font-semibold tabular-nums border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ${
                active
                  ? 'bg-[#0F766E] text-white border-[#0F766E]'
                  : 'bg-white text-[#1C1917] border-[#E8E6E0] hover:border-[#0F766E]/50'
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
