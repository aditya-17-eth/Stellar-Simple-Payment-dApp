import React, { useState, useEffect, useCallback } from 'react';
import { fetchBalance, fetchTokenBalance } from '../utils/stellar';
import { SUPPORTED_ASSETS } from '../utils/constants';

interface BalanceProps {
  publicKey: string;
  refreshTrigger?: number;
}

// Get USDC config from supported assets
const usdcAsset = SUPPORTED_ASSETS.find((a) => a.code === 'USDC');

export const Balance: React.FC<BalanceProps> = ({ publicKey, refreshTrigger = 0 }) => {
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBalances = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const xlmPromise = fetchBalance(publicKey);
      const usdcPromise = usdcAsset?.issuer
        ? fetchTokenBalance(publicKey, usdcAsset.code, usdcAsset.issuer)
        : Promise.resolve('0');

      const [xlm, usdc] = await Promise.all([xlmPromise, usdcPromise]);
      setXlmBalance(xlm);
      setUsdcBalance(usdc);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError('Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3">
          <svg className="animate-spin h-5 w-5 text-stellar-purple" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-400">Loading balances...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6">
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadBalances}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const fmtXlm = xlmBalance
    ? parseFloat(xlmBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })
    : '0';

  const fmtUsdc = usdcBalance
    ? parseFloat(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })
    : '0';

  const hasNoTrustline = usdcBalance === '0' && usdcAsset?.issuer;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">Your Balances</p>
        <button
          onClick={loadBalances}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh balances"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* XLM Balance */}
        <div className="bg-black/20 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-stellar-blue/20 rounded-full flex items-center justify-center">
              <span className="text-stellar-blue font-bold text-xs">✦</span>
            </div>
            <span className="text-gray-400 text-sm">XLM</span>
          </div>
          <p className="text-2xl font-bold text-white">{fmtXlm}</p>
          <p className="text-gray-500 text-xs mt-1">Stellar Lumens</p>
        </div>

        {/* USDC Balance */}
        <div className="bg-black/20 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-green-400 font-bold text-xs">$</span>
            </div>
            <span className="text-gray-400 text-sm">USDC</span>
          </div>
          <p className="text-2xl font-bold text-white">{fmtUsdc}</p>
          <p className="text-gray-500 text-xs mt-1">USD Coin</p>
        </div>
      </div>

      {/* Low XLM balance warning */}
      {xlmBalance && parseFloat(xlmBalance) < 2 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            💡 Low XLM balance! You need at least 1 XLM to keep your account active.
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

      {/* No USDC trustline hint */}
      {hasNoTrustline && (
        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-gray-400 text-sm">
            💡 No USDC trustline yet — swap some XLM to USDC and a trustline will be created automatically.
          </p>
        </div>
      )}
    </div>
  );
};
