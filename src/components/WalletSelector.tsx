import React from 'react';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletId: string) => void;
}

const WALLET_OPTIONS = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Popular Stellar wallet extension',
    icon: '🔭',
    installUrl: 'https://freighter.app',
  },
  {
    id: 'xbull',
    name: 'xBull',
    description: 'Feature-rich Stellar wallet',
    icon: '🐂',
    installUrl: 'https://xbull.app',
  },
];

/**
 * Modal for selecting a wallet to connect with.
 * Shows available wallet options with install links.
 */
export const WalletSelector: React.FC<WalletSelectorProps> = ({
  isOpen,
  onClose,
  onSelectWallet,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-stellar-dark border border-white/10 rounded-2xl shadow-2xl shadow-stellar-purple/10 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallet options */}
        <div className="p-4 space-y-3">
          <p className="text-gray-400 text-sm mb-4">
            Select a wallet to connect to StellarSwap
          </p>

          {WALLET_OPTIONS.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => {
                onSelectWallet(wallet.id);
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-stellar-purple/50 rounded-xl transition-all group"
            >
              <span className="text-2xl">{wallet.icon}</span>
              <div className="flex-1 text-left">
                <p className="text-white font-medium group-hover:text-stellar-purple transition-colors">
                  {wallet.name}
                </p>
                <p className="text-gray-400 text-sm">{wallet.description}</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-stellar-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-gray-500 text-xs text-center">
            Don't have a wallet?{' '}
            <a
              href="https://freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stellar-purple hover:text-white transition-colors"
            >
              Get Freighter →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
