import { useState, useCallback } from 'react';
import { useWallet } from './hooks/useWallet';
import { WalletConnect } from './components/WalletConnect';
import { Balance } from './components/Balance';
import { SendPayment } from './components/SendPayment';
import { SwapForm } from './components/SwapForm';
import { SwapActivityFeed, LocalSwapRecord } from './components/SwapActivityFeed';
import { fetchBalance } from './utils/stellar';

function App() {
  const {
    publicKey,
    isConnected,
    isLoading,
    error,
    isCorrectNetwork,
    walletName,
    connect,
    disconnect,
    signTransaction,
  } = useWallet();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentBalance, setCurrentBalance] = useState('0');
  const [swapRefreshTrigger, setSwapRefreshTrigger] = useState(0);
  const [localSwaps, setLocalSwaps] = useState<LocalSwapRecord[]>([]);

  // Active tab: 'swap' | 'send'
  const [activeTab, setActiveTab] = useState<'swap' | 'send'>('swap');

  const handlePaymentSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleSwapSuccess = useCallback((swapData?: { fromAsset: string; toAsset: string; amount: string; txHash: string }) => {
    setRefreshTrigger((prev) => prev + 1);
    setSwapRefreshTrigger((prev) => prev + 1);

    // Add swap to local feed immediately
    if (swapData && publicKey) {
      setLocalSwaps((prev) => [{
        user: publicKey,
        fromAsset: swapData.fromAsset,
        toAsset: swapData.toAsset,
        amount: swapData.amount,
        timestamp: Math.floor(Date.now() / 1000),
        txHash: swapData.txHash,
      }, ...prev]);
    }
  }, [publicKey]);

  const updateBalance = useCallback(async () => {
    if (publicKey) {
      const balance = await fetchBalance(publicKey);
      setCurrentBalance(balance);
    }
  }, [publicKey]);

  if (publicKey && currentBalance === '0') {
    updateBalance();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stellar-darker via-stellar-dark to-stellar-darker">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzRTFCREIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-stellar-blue to-stellar-purple rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">StellarSwap</h1>
                <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                  TESTNET
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Test Network
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-5xl mx-auto px-4 py-12">
          {/* Hero when not connected */}
          {!isConnected && (
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Swap Tokens on Stellar
              </h2>
              <p className="text-gray-400 text-lg max-w-lg mx-auto">
                Connect your wallet to swap assets using Stellar's native DEX orderbook.
                Fast, secure, and with zero intermediaries.
              </p>
            </div>
          )}

          {/* Wallet connection */}
          <section className="flex justify-center mb-8">
            <WalletConnect
              publicKey={publicKey}
              isConnected={isConnected}
              isLoading={isLoading}
              error={error}
              isCorrectNetwork={isCorrectNetwork}
              walletName={walletName}
              onConnect={connect}
              onDisconnect={disconnect}
            />
          </section>

          {/* Connected content */}
          {isConnected && publicKey && (
            <div className="space-y-8">
              {/* Balance */}
              <section>
                <Balance
                  publicKey={publicKey}
                  refreshTrigger={refreshTrigger}
                />
              </section>

              {/* Tab navigation */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab('swap')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'swap'
                      ? 'bg-gradient-to-r from-stellar-blue to-stellar-purple text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Token Swap
                </button>
                <button
                  onClick={() => setActiveTab('send')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'send'
                      ? 'bg-gradient-to-r from-stellar-blue to-stellar-purple text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Send XLM
                </button>
              </div>

              {/* Swap tab */}
              {activeTab === 'swap' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <section>
                    <SwapForm
                      publicKey={publicKey}
                      signTransaction={signTransaction}
                      onSwapSuccess={handleSwapSuccess}
                    />
                  </section>
                  <section>
                    <SwapActivityFeed
                      refreshTrigger={swapRefreshTrigger}
                      localSwaps={localSwaps}
                    />
                  </section>
                </div>
              )}

              {/* Send tab */}
              {activeTab === 'send' && (
                <section className="max-w-lg">
                  <SendPayment
                    publicKey={publicKey}
                    balance={currentBalance}
                    onSuccess={handlePaymentSuccess}
                  />
                </section>
              )}
            </div>
          )}

          {/* Feature cards when not connected */}
          {!isConnected && (
            <div className="grid gap-6 md:grid-cols-3 mt-12">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-stellar-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">DEX Trading</h3>
                <p className="text-gray-400 text-sm">Swap tokens using Stellar's native decentralized orderbook</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-stellar-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Instant Settlement</h3>
                <p className="text-gray-400 text-sm">Transactions finalize in 3–5 seconds on the Stellar network</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-stellar-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Multi-Wallet</h3>
                <p className="text-gray-400 text-sm">Connect with Freighter, xBull, and more Stellar wallets</p>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-12">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <p>StellarSwap — Powered by Stellar SDK & Soroban</p>
              <div className="flex gap-4">
                <a
                  href="https://stellar.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Stellar.org
                </a>
                <a
                  href="https://laboratory.stellar.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Stellar Lab
                </a>
                <a
                  href="https://stellar.expert"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Stellar Expert
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
