import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CoachAvatar } from './CoachAvatar';
import { ANALYSING_MESSAGES } from '../data/questions';

interface LoadingCoachProps {
  messages?: string[];
  error?: string | null;
  onRetry?: () => void;
  title?: string;
}

export function LoadingCoach({
  messages = ANALYSING_MESSAGES,
  error = null,
  onRetry,
  title = 'Your career coach is reviewing your profile',
}: LoadingCoachProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (error) return;
    setMessageIndex(0);
    setElapsedSeconds(0);

    const msgTimer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3400);

    const secTimer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(msgTimer);
      window.clearInterval(secTimer);
    };
  }, [error, messages]);

  return (
    <div
      className="bg-white border border-[#E8E6E0] rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center animate-step-in"
      role="status"
      aria-live="polite"
    >
      <div className="flex justify-center mb-6">
        <div className="relative">
          {!error && (
            <div
              className="absolute -inset-2 rounded-full border-2 border-[#0F766E]/25 border-t-[#0F766E] animate-spin motion-reduce:animate-none"
              style={{ animationDuration: '1.8s' }}
              aria-hidden="true"
            />
          )}
          <CoachAvatar size="lg" />
        </div>
      </div>

      {error ? (
        <div className="space-y-4">
          <h2 className="text-[22px] font-bold text-[#1C1917]">
            Our coach needs another moment
          </h2>
          <p className="text-[16px] text-[#6B6A65] max-w-md mx-auto leading-relaxed">
            {error}
          </p>
          {onRetry && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[48px] px-6 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Retry analysis</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-[22px] sm:text-[24px] font-bold text-[#1C1917]">
            {title}
          </h2>
          <p className="text-[17px] sm:text-base text-[#0F766E] font-medium min-h-[28px] transition-opacity duration-200">
            {messages[messageIndex]}
          </p>
          <p className="text-sm text-[#6B6A65] pt-2">
            {elapsedSeconds >= 15
              ? 'Still carefully matching your profile — this can take up to 45 seconds.'
              : 'This usually takes 10 to 30 seconds.'}
          </p>
        </div>
      )}
    </div>
  );
}
