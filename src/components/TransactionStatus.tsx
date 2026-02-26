import React from 'react';
import { STELLAR_EXPERT_URL } from '../utils/constants';

export type TxLifecycleStatus = 'idle' | 'pending' | 'success' | 'failed';

interface TransactionStatusProps {
  status: TxLifecycleStatus;
  txHash?: string | null;
  errorMessage?: string | null;
  onReset?: () => void;
}

/**
 * Displays the current transaction lifecycle state:
 * pending spinner, success with hash link, or error with retry.
 */
export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  status,
  txHash,
  errorMessage,
  onReset,
}) => {
  if (status === 'idle') return null;

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-3 p-4 bg-stellar-blue/10 border border-stellar-blue/30 rounded-xl animate-pulse">
        <svg className="animate-spin h-5 w-5 text-stellar-blue" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div>
          <p className="text-stellar-blue font-medium">Submitting swap...</p>
          <p className="text-gray-400 text-sm">Please approve in your wallet</p>
        </div>
      </div>
    );
  }

  if (status === 'success' && txHash) {
    return (
      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-green-400 font-medium mb-1">Swap Successful</p>
            <p className="text-gray-400 text-xs font-mono break-all">{txHash}</p>
            <div className="flex items-center gap-4 mt-2">
              <a
                href={`${STELLAR_EXPERT_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stellar-purple text-sm hover:text-white transition-colors flex items-center gap-1"
              >
                View on Explorer
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {onReset && (
                <button
                  onClick={onReset}
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  New Swap
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-red-400 font-medium mb-1">Swap Failed</p>
            <p className="text-gray-400 text-sm">{errorMessage || 'An unexpected error occurred'}</p>
            {onReset && (
              <button
                onClick={onReset}
                className="mt-2 text-stellar-purple text-sm hover:text-white transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
