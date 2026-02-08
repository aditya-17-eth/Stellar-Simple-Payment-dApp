import React, { useState, useEffect, useCallback } from 'react';
import { fetchBalance } from '../utils/stellar';

interface BalanceProps {
  publicKey: string;
  refreshTrigger?: number; // Increment to trigger a refresh (e.g., after sending)
}

export const Balance: React.FC<BalanceProps> = ({ publicKey, refreshTrigger = 0 }) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the current XLM balance for the connected account
   */
  const loadBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const xlmBalance = await fetchBalance(publicKey);
      setBalance(xlmBalance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  // Fetch balance on mount and when publicKey or refreshTrigger changes
  useEffect(() => {
    loadBalance();
  }, [loadBalance, refreshTrigger]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3">
          <svg className="animate-spin h-5 w-5 text-stellar-purple" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-400">Loading balance...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6">
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadBalance}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Format balance for display (show up to 7 decimal places)
  const formattedBalance = balance ? parseFloat(balance).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }) : '0';

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">Your Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{formattedBalance}</span>
            <span className="text-lg text-stellar-purple font-semibold">XLM</span>
          </div>
        </div>
        
        {/* Refresh button */}
        <button
          onClick={loadBalance}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh balance"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Low balance warning */}
      {balance && parseFloat(balance) < 2 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            💡 Low balance! You need at least 1 XLM to keep your account active.
            <a
              href="https://laboratory.stellar.org/#account-creator?network=test"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 underline hover:no-underline"
            >
              Fund with Friendbot
            </a>
          </p>
        </div>
      )}
    </div>
  );
};
