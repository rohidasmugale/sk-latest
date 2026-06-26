import { useRef, useState, useEffect, useCallback } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const [pullProgress, setPullProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 0 && container.scrollTop <= 0) {
        e.preventDefault();
        const progress = Math.min(deltaY / 150, 1);
        setPullProgress(progress);
        setPullState(progress >= 0.6 ? 'ready' : 'pulling');
      }
    };

    const handleTouchEnd = () => {
      if (pullState === 'ready') {
        setPullState('refreshing');
        setPullProgress(1);
        onRefresh().finally(() => {
          setPullState('idle');
          setPullProgress(0);
          isPulling.current = false;
        });
      } else {
        setPullState('idle');
        setPullProgress(0);
        isPulling.current = false;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullState, onRefresh]);

  return { containerRef, pullState, pullProgress };
}