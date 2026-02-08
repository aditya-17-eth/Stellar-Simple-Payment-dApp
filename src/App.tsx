import { useState, useCallback } from 'react';
import { useWallet } from './hooks/useWallet';
import { WalletConnect } from './components/WalletConnect';
import { Balance } from './components/Balance';
import { SendPayment } from './components/SendPayment';
import { fetchBalance } from './utils/stellar';

function App() {
  // Get wallet state and methods from custom hook
  const {
    publicKey,
    isConnected,
    isLoading,
    error,
    isCorrectNetwork,
    connect,
    disconnect,
  } = useWallet();

  // State for triggering balance refresh after successful transaction
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // State for passing current balance to SendPayment for validation
  const [currentBalance, setCurrentBalance] = useState('0');

  /**
   * Callback for when a payment is successful
   * Triggers a balance refresh
   */
  const handlePaymentSuccess = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  /**
   * Fetches and updates the current balance
   * Called by Balance component and used by SendPayment
   */
  const updateBalance = useCallback(async () => {
    if (publicKey) {
      const balance = await fetchBalance(publicKey);
      setCurrentBalance(balance);
    }
  }, [publicKey]);

  // Update balance when connected
  if (publicKey && currentBalance === '0') {
    updateBalance();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stellar-darker via-stellar-dark to-stellar-darker">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzRTFCREIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      {/* Main content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Stellar-inspired logo */}
              <div className="w-10 h-10 bg-gradient-to-br from-stellar-blue to-stellar-purple rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Stellar Payment</h1>
                <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                  TESTNET
                </span>
              </div>
            </div>

            {/* Testnet indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Test Network
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          {/* Hero section when not connected */}
          {!isConnected && (
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Send XLM on Stellar
              </h2>
              <p className="text-gray-400 text-lg max-w-md mx-auto">
                Connect your Freighter wallet to view your balance and send XLM 
                payments on the Stellar TESTNET.
              </p>
            </div>
          )}

          {/* Wallet connection section */}
          <section className="flex justify-center mb-8">
            <WalletConnect
              publicKey={publicKey}
              isConnected={isConnected}
              isLoading={isLoading}
              error={error}
              isCorrectNetwork={isCorrectNetwork}
              onConnect={connect}
              onDisconnect={disconnect}
            />
          </section>

          {/* Balance and Send sections - only shown when connected */}
          {isConnected && publicKey && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Balance section */}
              <section>
                <Balance
                  publicKey={publicKey}
                  refreshTrigger={refreshTrigger}
                />
              </section>

              {/* Send payment section */}
              <section>
                <SendPayment
                  publicKey={publicKey}
                  balance={currentBalance}
                  onSuccess={handlePaymentSuccess}
                />
              </section>
            </div>
          )}

          {/* Info cards when not connected */}
          {!isConnected && (
            <div className="grid gap-6 md:grid-cols-3 mt-12">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-stellar-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Secure</h3>
                <p className="text-gray-400 text-sm">Sign transactions safely with Freighter wallet</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-stellar-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Fast</h3>
                <p className="text-gray-400 text-sm">Transactions settle in 3-5 seconds</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-stellar-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Safe</h3>
                <p className="text-gray-400 text-sm">TESTNET only – no real funds at risk</p>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <p>Built with Stellar SDK & Freighter Wallet</p>
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
