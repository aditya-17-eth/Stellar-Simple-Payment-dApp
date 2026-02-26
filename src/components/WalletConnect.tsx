import React, { useState } from 'react';
import { WalletSelector } from './WalletSelector';

interface WalletConnectProps {
  publicKey: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  isCorrectNetwork: boolean;
  walletName: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  publicKey,
  isConnected,
  isLoading,
  error,
  isCorrectNetwork,
  walletName,
  onConnect,
  onDisconnect,
}) => {
  const [showSelector, setShowSelector] = useState(false);

  // Connected state
  if (isConnected && publicKey) {
    return (
      <div className="flex flex-col items-center gap-4">
        {!isCorrectNetwork && (
          <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ Please switch to TESTNET in your wallet settings
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <div className="flex items-center gap-2">
            {walletName && (
              <span className="text-green-300 text-sm font-medium">{walletName}</span>
            )}
            <span className="text-green-400 font-mono text-sm">
              {truncateAddress(publicKey)}
            </span>
          </div>
        </div>

        <details className="text-center">
          <summary className="text-gray-400 text-sm cursor-pointer hover:text-gray-300">
            Show full address
          </summary>
          <p className="mt-2 text-gray-300 font-mono text-xs break-all max-w-md">
            {publicKey}
          </p>
        </details>

        <button
          onClick={onDisconnect}
          className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => setShowSelector(true)}
        disabled={isLoading}
        className="px-8 py-4 bg-gradient-to-r from-stellar-blue to-stellar-purple text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-stellar-purple/25"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </span>
        ) : (
          'Connect Wallet'
        )}
      </button>

      {error && (
        <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <WalletSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelectWallet={() => {
          setShowSelector(false);
          onConnect();
        }}
      />
    </div>
  );
};
