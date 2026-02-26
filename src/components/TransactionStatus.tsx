import React from 'react';
import { STELLAR_EXPERT_URL } from '../utils/constants';

export type TxLifecycleStatus = 'idle' | 'pending' | 'success' | 'failed';

interface TransactionStatusProps {
  status: TxLifecycleStatus;
  txHash: string | null;
  errorMessage: string | null;
  onReset: () => void;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  status,
  txHash,
  errorMessage,
  onReset,
}) => {
  if (status === 'idle') return null;

  return (
    <div className="mt-4 p-4 rounded-xl border animate-fade-in transition-all">
      {/* Pending State */}
      {status === 'pending' && (
        <div className="flex flex-col items-center justify-center p-2 text-center bg-blue-500/10 border-blue-500/30 rounded-xl">
          <svg className="animate-spin h-8 w-8 text-blue-400 mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <h4 className="text-white font-semibold mb-1">Processing Transaction</h4>
          <p className="text-blue-300 text-sm">Please sign the transaction in your wallet...</p>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && (
        <div className="bg-green-500/10 border-green-500/30 rounded-xl p-4 text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-white font-semibold mb-1">Swap Successful</h4>
          <p className="text-gray-400 text-xs mb-3 font-mono break-all">{txHash}</p>
          
          <div className="flex justify-center gap-3">
            <a
              href={`${STELLAR_EXPERT_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
            >
              View on Explorer
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={onReset}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              New Swap
            </button>
          </div>
        </div>
      )}

      {/* Failed State */}
      {status === 'failed' && (
        <div className="bg-red-500/10 border-red-500/30 rounded-xl p-4 text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h4 className="text-white font-semibold mb-1">Transaction Failed</h4>
          <p className="text-red-300 text-sm mb-4">{errorMessage || 'An unknown error occurred'}</p>
          
          <button
            onClick={onReset}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
