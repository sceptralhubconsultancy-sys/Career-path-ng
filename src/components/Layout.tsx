import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { OfflineBanner } from './OfflineBanner';
import { PrivacyModal } from './PrivacyModal';

interface LayoutProps {
  children: ReactNode;
  maxWidth?: 'narrow' | 'wide';
  onReconnect?: () => void;
  hasMobileStickyCta?: boolean;
  headerRight?: ReactNode;
}

export function Layout({
  children,
  maxWidth = 'narrow',
  onReconnect,
  hasMobileStickyCta = false,
  headerRight,
}: LayoutProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const containerWidth = maxWidth === 'wide' ? 'max-w-6xl' : 'max-w-[640px]';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7] text-[#1C1917]">
      <OfflineBanner onReconnect={onReconnect} />

      <header className="w-full py-4 px-4 sm:px-6 border-b border-[#E8E6E0]/80 bg-[#FAFAF7]/90 backdrop-blur-sm">
        <div className={`${containerWidth} mx-auto flex items-center justify-between gap-4`}>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[19px] font-bold tracking-[-0.02em] text-[#1C1917] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F766E] rounded-md"
          >
            <span className="w-8 h-8 rounded-[10px] bg-[#0F766E] text-white flex items-center justify-center shrink-0">
              <Compass className="w-4.5 h-4.5" aria-hidden="true" />
            </span>
            <span>PathShift</span>
          </Link>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      </header>

      <main
        className={`flex-1 w-full px-4 sm:px-6 py-6 sm:py-10 ${
          hasMobileStickyCta ? 'pb-28 sm:pb-12' : ''
        }`}
      >
        <div className={`${containerWidth} mx-auto`}>{children}</div>
      </main>

      <footer
        className={`w-full border-t border-[#E8E6E0] py-6 px-4 sm:px-6 mt-auto ${
          hasMobileStickyCta ? 'mb-20 sm:mb-0' : ''
        }`}
      >
        <div
          className={`${containerWidth} mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B6A65] text-center sm:text-left`}
        >
          <p>Results are guidance, not guarantees.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="underline underline-offset-4 hover:text-[#1C1917] transition-colors cursor-pointer min-h-[44px] sm:min-h-0 px-1"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()} PathShift</span>
          </div>
        </div>
      </footer>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
