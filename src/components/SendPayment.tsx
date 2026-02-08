import React, { useState } from 'react';
import { sendPayment, isValidStellarAddress } from '../utils/stellar';
import { STELLAR_EXPERT_URL } from '../utils/constants';

interface SendPaymentProps {
  publicKey: string;
  balance: string;
  onSuccess: () => void; // Callback to refresh balance after successful send
}

// Transaction status types
type TransactionStatus = 'idle' | 'sending' | 'success' | 'error';

export const SendPayment: React.FC<SendPaymentProps> = ({
  publicKey,
  balance,
  onSuccess,
}) => {
  // Form state
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  
  // Transaction state
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{
    destination?: string;
    amount?: string;
  }>({});

  /**
   * Validates the form inputs
   * @returns true if valid, false if there are errors
   */
  const validateForm = (): boolean => {
    const errors: { destination?: string; amount?: string } = {};

    // Validate destination address
    if (!destination.trim()) {
      errors.destination = 'Destination address is required';
    } else if (!isValidStellarAddress(destination.trim())) {
      errors.destination = 'Invalid Stellar address format';
    } else if (destination.trim() === publicKey) {
      errors.destination = 'Cannot send to yourself';
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(balance);
    
    if (!amount.trim()) {
      errors.amount = 'Amount is required';
    } else if (isNaN(amountNum) || amountNum <= 0) {
      errors.amount = 'Amount must be a positive number';
    } else if (amountNum > balanceNum - 1) {
      // Keep 1 XLM reserve for account minimum
      errors.amount = `Insufficient balance (keep 1 XLM). Max: ${(balanceNum - 1).toFixed(2)} XLM`;
    } else if (amountNum < 0.0000001) {
      errors.amount = 'Amount must be at least 0.0000001 XLM';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate before submitting
    if (!validateForm()) {
      return;
    }

    setStatus('sending');
    setError(null);
    setTxHash(null);

    try {
      // Send the payment
      const result = await sendPayment(
        publicKey,
        destination.trim(),
        amount.trim()
      );

      // Success!
      setTxHash(result.hash);
      setStatus('success');
      
      // Clear form
      setDestination('');
      setAmount('');
      
      // Trigger balance refresh
      onSuccess();
    } catch (err) {
      console.error('Transaction error:', err);
      setStatus('error');
      
      // Parse error message
      if (err instanceof Error) {
        // Handle common Freighter errors
        if (err.message.includes('User declined')) {
          setError('Transaction was rejected in Freighter');
        } else if (err.message.includes('op_underfunded')) {
          setError('Insufficient funds for this transaction');
        } else if (err.message.includes('op_no_destination')) {
          setError('Destination account does not exist and amount is below minimum (1 XLM needed to create account)');
        } else {
          setError(err.message);
        }
      } else {
        setError('Transaction failed. Please try again.');
      }
    }
  };

  /**
   * Resets the form to initial state
   */
  const resetForm = () => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setValidationErrors({});
  };

  // Success state - show transaction confirmation
  if (status === 'success' && txHash) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Success icon */}
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-xl font-semibold text-green-400">Transaction Successful!</h3>

          {/* Transaction hash */}
          <div className="w-full p-4 bg-black/30 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">Transaction Hash:</p>
            <p className="text-white font-mono text-xs break-all">{txHash}</p>
          </div>

          {/* View on explorer link */}
          <a
            href={`${STELLAR_EXPERT_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stellar-purple hover:text-white transition-colors flex items-center gap-2"
          >
            View on Stellar Expert
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Send another button */}
          <button
            onClick={resetForm}
            className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Send Another Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Send XLM</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Destination address input */}
        <div>
          <label htmlFor="destination" className="block text-sm text-gray-400 mb-1">
            Destination Address
          </label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setValidationErrors((prev) => ({ ...prev, destination: undefined }));
            }}
            placeholder="G..."
            disabled={status === 'sending'}
            className={`w-full px-4 py-3 bg-black/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-purple/50 transition-colors font-mono text-sm ${
              validationErrors.destination
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/10 focus:border-stellar-purple'
            }`}
          />
          {validationErrors.destination && (
            <p className="mt-1 text-red-400 text-sm">{validationErrors.destination}</p>
          )}
        </div>

        {/* Amount input */}
        <div>
          <label htmlFor="amount" className="block text-sm text-gray-400 mb-1">
            Amount (XLM)
          </label>
          <div className="relative">
            <input
              id="amount"
              type="number"
              step="0.0000001"
              min="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setValidationErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              placeholder="0.00"
              disabled={status === 'sending'}
              className={`w-full px-4 py-3 bg-black/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-stellar-purple/50 transition-colors ${
                validationErrors.amount
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-stellar-purple'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
              XLM
            </span>
          </div>
          {validationErrors.amount && (
            <p className="mt-1 text-red-400 text-sm">{validationErrors.amount}</p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full py-4 bg-gradient-to-r from-stellar-blue to-stellar-purple text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-stellar-purple/25"
        >
          {status === 'sending' ? (
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
