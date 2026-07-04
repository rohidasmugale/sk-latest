import React from 'react';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

interface PullToRefreshWrapperProps {
  children: React.ReactNode;
  pageName: string;
  onRefresh: () => Promise<void>;
  className?: string;
}

export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({
  children,
  pageName,
  onRefresh,
  className = "min-h-screen bg-background overflow-y-auto relative"
}) => {
  // Use the page refresh hook
  const { containerRef, pullState, pullProgress } = usePageRefresh({
    pageName,
    refreshFn: onRefresh
  });

  return (
    <div ref={containerRef} className={className}>
      {/* Show the pull indicator when user is pulling */}
      <PullToRefreshIndicator state={pullState} progress={pullProgress} />
      
      {/* Your page content */}
      {children}
    </div>
  );
};