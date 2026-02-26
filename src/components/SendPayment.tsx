import React, { useState } from 'react';
import { sendPayment } from '../utils/stellar';
import { useWallet } from '../hooks/useWallet';

interface SendPaymentProps {
  publicKey: string;
  balance: string;
  onSuccess: () => void;
}

export const SendPayment: React.FC<SendPaymentProps> = ({
  publicKey,
  balance,
  onSuccess,
}) => {
  const { signTransaction } = useWallet();
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !amount) return;

    setStatus('pending');
    setErrorMessage(null);

    try {
      await sendPayment(publicKey, destination, amount, memo, signTransaction);
      setStatus('success');
      setAmount('');
      setMemo('');
      // Don't clear destination, might be sending again
      onSuccess();
    } catch (err) {
      console.error('Payment failed:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
        <svg className="w-5 h-5 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        Send XLM
      </h3>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Destination Address</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="G..."
            className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 placeholder-gray-600 outline-none focus:border-stellar-purple transition-colors font-mono text-sm"
            disabled={status === 'pending'}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount (XLM)</label>
          <div className="relative">
            <input
              type="number"
              step="0.0000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 placeholder-gray-600 outline-none focus:border-stellar-purple transition-colors"
              disabled={status === 'pending'}
            />
            <button
              type="button"
              onClick={() => setAmount((parseFloat(balance) - 1).toFixed(7))} // Leave 1 XLM reserve
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stellar-purple hover:text-white transition-colors"
            >
              Max
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Available: {balance} XLM</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Memo (Optional)</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Hello Stellar!"
            maxLength={28}
            className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 placeholder-gray-600 outline-none focus:border-stellar-purple transition-colors"
            disabled={status === 'pending'}
          />
        </div>

        {/* Status Messages */}
        {status === 'error' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {status === 'success' && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Payment sent successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'pending' || !destination || !amount}
          className="w-full py-3 bg-white text-stellar-dark font-bold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
        >
          {status === 'pending' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </span>
          ) : (
            'Send Payment'
          )}
        </button>
      </form>
    </div>
  );
};
