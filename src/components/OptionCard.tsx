import { Check } from 'lucide-react';

interface OptionCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function OptionCard({
  label,
  description,
  selected,
  onSelect,
  disabled = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`w-full text-left min-h-[56px] px-4 py-3.5 rounded-[12px] border transition-all duration-150 flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ${
        selected
          ? 'bg-[#0F766E]/[0.06] border-[#0F766E] text-[#1C1917]'
          : 'bg-white border-[#E8E6E0] text-[#1C1917] hover:border-[#0F766E]/50 hover:bg-[#FAFAF7]'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[17px] sm:text-base leading-snug text-[#1C1917]">
          {label}
        </div>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-[#6B6A65]">
            {description}
          </p>
        )}
      </div>
      <span
        className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
          selected
            ? 'bg-[#0F766E] border-[#0F766E] text-white'
            : 'border-[#D1CFC7] bg-white'
        }`}
        aria-hidden="true"
      >
        {selected && <Check className="w-3.5 h-3.5 stroke-[2.75]" />}
      </span>
    </button>
  );
}
