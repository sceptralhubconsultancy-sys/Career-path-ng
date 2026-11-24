import { Loader2, MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}

export function WhatsAppButton({
  onClick,
  loading = false,
  label = 'Claim my coach on WhatsApp',
  className = '',
}: WhatsAppButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full min-h-[54px] px-6 py-3.5 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#0F766E]/60 text-white font-semibold text-[17px] sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-[0_8px_30px_rgba(15,118,110,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
      )}
      <span>{loading ? 'Opening WhatsApp...' : label}</span>
    </button>
  );
}
