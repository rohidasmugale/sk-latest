import { usePullToRefresh } from './usePullToRefresh';

interface UsePageRefreshOptions {
  // Name of the page (for debugging)
  pageName: string;
  // The function that refreshes your data
  refreshFn: () => Promise<void>;
}

export const usePageRefresh = ({ pageName, refreshFn }: UsePageRefreshOptions) => {
  // Use the pull to refresh hook
  const { containerRef, pullState, pullProgress } = usePullToRefresh(async () => {
    console.log(`🔄 Refreshing ${pageName}...`);
    await refreshFn();
    console.log(`✅ ${pageName} refreshed`);
  });

  return {
    containerRef,    // Put this on your main container div
    pullState,       // Current state of the pull (idle, pulling, ready, refreshing)
    pullProgress     // How far the user has pulled (0 to 1)
  };
};