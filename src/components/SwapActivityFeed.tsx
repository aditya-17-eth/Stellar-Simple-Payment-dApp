import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getRecentSwaps, pollSwapEvents, SwapRecordData } from '../contract/sorobanClient';
import { STELLAR_EXPERT_URL, SWAP_TRACKER_CONTRACT_ID } from '../utils/constants';

interface SwapActivityFeedProps {
  refreshTrigger?: number;
}

function truncateAddress(address: string): string {
  if (!address || address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Displays a real-time feed of recent swap activity from the Soroban contract.
 * Polls for new events every 10 seconds.
 */
export const SwapActivityFeed: React.FC<SwapActivityFeedProps> = ({
  refreshTrigger = 0,
}) => {
  const [swaps, setSwaps] = useState<SwapRecordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isContractDeployed = SWAP_TRACKER_CONTRACT_ID !== 'PLACEHOLDER_CONTRACT_ID';

  // Load initial swap history
  const loadSwaps = useCallback(async () => {
    if (!isContractDeployed) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const records = await getRecentSwaps(20);
      setSwaps(records);
      setError(null);
    } catch (err) {
      console.error('Failed to load swaps:', err);
      setError('Failed to load swap history');
    } finally {
      setIsLoading(false);
    }
  }, [isContractDeployed]);

  // Poll for new events
  const pollForUpdates = useCallback(async () => {
    if (!isContractDeployed) return;

    try {
      const { events, latestCursor } = await pollSwapEvents(cursorRef.current);
      if (events.length > 0) {
        setSwaps((prev) => [...events, ...prev].slice(0, 50));
        cursorRef.current = latestCursor;
      }
    } catch (err) {
      console.warn('Event polling error:', err);
    }
  }, [isContractDeployed]);

  // Initial load
  useEffect(() => {
    loadSwaps();
  }, [loadSwaps, refreshTrigger]);

  // Start polling
  useEffect(() => {
    if (!isContractDeployed) return;

    intervalRef.current = setInterval(pollForUpdates, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollForUpdates, isContractDeployed]);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Recent Swap Activity
        </h3>
        {isContractDeployed && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        )}
      </div>

      {!isContractDeployed && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm mb-1">Swap tracker contract not deployed</p>
          <p className="text-gray-500 text-xs">
            Deploy the Soroban contract and update the contract address in constants.ts
          </p>
        </div>
      )}

      {isContractDeployed && isLoading && (
        <div className="text-center py-8">
          <svg className="animate-spin h-6 w-6 text-stellar-purple mx-auto mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading swap history...</p>
        </div>
      )}

      {isContractDeployed && error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={loadSwaps} className="text-sm text-gray-400 hover:text-white mt-2 transition-colors">
            Retry
          </button>
        </div>
      )}

      {isContractDeployed && !isLoading && !error && swaps.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No swaps recorded yet</p>
          <p className="text-gray-500 text-xs mt-1">Completed swaps will appear here</p>
        </div>
      )}

      {isContractDeployed && swaps.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {swaps.map((swap, index) => (
            <div
              key={`${swap.timestamp}-${index}`}
              className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-lg hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-stellar-purple/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {swap.fromAsset} → {swap.toAsset}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {truncateAddress(swap.user)} · {formatTimestamp(swap.timestamp)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-mono">
                  {parseFloat(swap.amount).toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs">{swap.fromAsset}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isContractDeployed && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <a
            href={`${STELLAR_EXPERT_URL}/contract/${SWAP_TRACKER_CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-stellar-purple transition-colors flex items-center gap-1"
          >
            View contract on Stellar Expert
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
};
