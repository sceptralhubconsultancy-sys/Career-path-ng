import { Check } from 'lucide-react';

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelect: number;
  minSelect?: number;
}

export function ChipSelect({
  options,
  selected,
  onChange,
  maxSelect,
}: ChipSelectProps) {
  const handleToggle = (item: string) => {
    const exists = selected.includes(item);
    if (exists) {
      onChange(selected.filter((v) => v !== item));
      return;
    }
    if (selected.length >= maxSelect) {
      if (maxSelect === 1) {
        onChange([item]);
      }
      return;
    }
    onChange([...selected, item]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm text-[#6B6A65]">
        <span>
          {maxSelect === 1
            ? 'Select one option'
            : `Select up to ${maxSelect}`}
        </span>
        <span className="tabular-nums font-medium text-[#1C1917]">
          {selected.length} / {maxSelect} selected
        </span>
      </div>
      <div
        className="flex flex-wrap gap-2.5"
        role="group"
        aria-label="Selectable options"
      >
        {options.map((option) => {
          const isSelected = selected.includes(option);
          const isMaxReached = !isSelected && selected.length >= maxSelect && maxSelect > 1;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              disabled={isMaxReached}
              onClick={() => handleToggle(option)}
              className={`min-h-[48px] px-4 py-2.5 rounded-[12px] border text-[15px] font-medium transition-all duration-150 inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ${
                isSelected
                  ? 'bg-[#0F766E] border-[#0F766E] text-white'
                  : isMaxReached
                    ? 'bg-[#FAFAF7] border-[#E8E6E0] text-[#6B6A65]/50 cursor-not-allowed'
                    : 'bg-white border-[#E8E6E0] text-[#1C1917] hover:border-[#0F766E]/60 cursor-pointer active:scale-[0.98]'
              }`}
            >
              {isSelected && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
