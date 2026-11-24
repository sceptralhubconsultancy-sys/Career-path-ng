import { useEffect } from 'react';
import { X } from 'lucide-react';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E8E6E0]">
          <h2
            id="privacy-modal-title"
            className="text-xl font-bold text-[#1C1917]"
          >
            Privacy Policy
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy policy"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 rounded-[10px] flex items-center justify-center text-[#6B6A65] hover:text-[#1C1917] hover:bg-[#FAFAF7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-[#6B6A65]">
          <p className="text-[#1C1917] font-medium">
            Your answers stay private and are used solely to generate your
            personalised career transition guidance.
          </p>
          <div>
            <h3 className="font-semibold text-[#1C1917] mb-1">
              1. Information we collect
            </h3>
            <p>
              We collect your first name, email address, age, country, current
              work background, strengths, preferences, and assessment ratings so
              our career coaching engine and human coaches can tailor your
              recommendations.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#1C1917] mb-1">
              2. How we use and protect your data
            </h3>
            <p>
              Your data is stored securely with row-level access controls.
              Anonymous visitors cannot read any stored responses. We never sell
              your personal information to third parties.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#1C1917] mb-1">
              3. Guidance disclaimer
            </h3>
            <p>
              All career recommendations, income ranges, and transition
              timelines are guidance based on your answers, not guarantees of
              employment, earnings, or specific outcomes.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#1C1917] mb-1">
              4. Your rights (GDPR / NDPR)
            </h3>
            <p>
              You may request access to, correction of, or deletion of your
              assessment record at any time by messaging our team with the email
              address you used during the assessment.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E8E6E0] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] text-white font-medium text-sm cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
