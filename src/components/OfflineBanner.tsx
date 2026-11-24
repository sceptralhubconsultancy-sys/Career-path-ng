import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  onReconnect?: () => void;
}

export function OfflineBanner({ onReconnect }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setReconnecting(false);
    };

    const handleOnline = () => {
      setReconnecting(true);
      setIsOffline(false);
      onReconnect?.();
      window.setTimeout(() => setReconnecting(false), 2000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [onReconnect]);

  if (!isOffline && !reconnecting) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`w-full px-4 py-2.5 text-sm font-medium border-b ${
        isOffline
          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#1C1917]'
          : 'bg-[#16A34A]/10 border-[#16A34A]/25 text-[#16A34A]'
      }`}
    >
      <div className="max-w-[640px] mx-auto flex items-center justify-center gap-2 text-center">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4 shrink-0 text-[#B45309]" aria-hidden="true" />
            <span>
              You are offline. Your answers are saved locally and will retry automatically when you reconnect.
            </span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
            <span>Back online — syncing your progress...</span>
          </>
        )}
      </div>
    </div>
  );
}
