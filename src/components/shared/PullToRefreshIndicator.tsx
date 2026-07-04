import { Loader2, RefreshCw } from 'lucide-react';

interface Props {
  state: 'idle' | 'pulling' | 'ready' | 'refreshing';
  progress: number;
}

export function PullToRefreshIndicator({ state, progress }: Props) {
  return (
    <div
      className="sticky top-0 z-10 flex justify-center items-center transition-all duration-200"
      style={{
        height: state === 'idle' ? '0px' : '60px',
        opacity: state === 'idle' ? 0 : 1,
        transform: `scale(${0.5 + progress * 0.5})`,
        marginTop: state === 'idle' ? '-10px' : '0px',
      }}
    >
      <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md border border-gray-200">
        {state === 'refreshing' && (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Refreshing...</span>
          </>
        )}
        {state === 'ready' && (
          <>
            <RefreshCw className="h-5 w-5 text-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-600">Release to refresh</span>
          </>
        )}
        {state === 'pulling' && (
          <>
            <RefreshCw
              className="h-5 w-5 text-blue-400 transition-transform duration-100"
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
            <span className="text-sm font-medium text-gray-500">Pull to refresh</span>
          </>
        )}
      </div>
    </div>
  );
}