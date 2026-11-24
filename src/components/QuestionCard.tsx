import type { ReactNode } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface QuestionCardProps {
  stepKey: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  secondaryAction?: ReactNode;
  formId?: string;
}

export function QuestionCard({
  stepKey,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  isSubmitting = false,
  error = null,
  secondaryAction,
  formId,
}: QuestionCardProps) {
  return (
    <div key={stepKey} className="animate-step-in">
      <div className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 sm:p-8">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6B6A65] hover:text-[#1C1917] min-h-[44px] -ml-2 px-2 rounded-[10px] mb-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back</span>
          </button>
        )}

        <h1 className="text-[24px] leading-[32px] font-bold text-[#1C1917] tracking-[-0.015em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[16px] sm:text-[15px] leading-relaxed text-[#6B6A65]">
            {subtitle}
          </p>
        )}

        <div className="mt-6">{children}</div>

        {error && (
          <div
            role="alert"
            className="mt-5 px-4 py-3 rounded-[12px] bg-[#DC2626]/[0.06] border border-[#DC2626]/25 text-sm text-[#DC2626]"
          >
            {error}
          </div>
        )}

        {/* Desktop inline CTA */}
        {(onContinue || formId) && (
          <div className="hidden sm:flex items-center justify-between gap-4 mt-8 pt-6 border-t border-[#E8E6E0]">
            <div>{secondaryAction}</div>
            <button
              type={formId ? 'submit' : 'button'}
              form={formId}
              onClick={formId ? undefined : onContinue}
              disabled={continueDisabled || isSubmitting}
              className="min-h-[48px] px-7 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#0F766E]/40 disabled:cursor-not-allowed text-white font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{continueLabel}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile sticky bottom CTA (compact, under 15% viewport height) */}
      {(onContinue || formId) && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FAFAF7]/95 backdrop-blur-md border-t border-[#E8E6E0] px-4 py-3">
          <div className="max-w-[640px] mx-auto flex items-center gap-3">
            {secondaryAction && <div className="shrink-0">{secondaryAction}</div>}
            <button
              type={formId ? 'submit' : 'button'}
              form={formId}
              onClick={formId ? undefined : onContinue}
              disabled={continueDisabled || isSubmitting}
              className="flex-1 min-h-[48px] px-5 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#0F766E]/40 disabled:cursor-not-allowed text-white font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{continueLabel}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
