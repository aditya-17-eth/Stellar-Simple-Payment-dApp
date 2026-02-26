import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SUPPORTED_ASSETS, AssetConfig } from '../utils/constants';
import { fetchOrderbook, estimateSwapReceive, executeSwap } from '../stellar/dex';
import { recordSwap } from '../contract/sorobanClient';
import { TransactionStatus, TxLifecycleStatus } from './TransactionStatus';

interface SwapFormProps {
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
  onSwapSuccess?: () => void;
}

/**
 * Token Swap form with asset selectors, price preview, and swap execution.
 * Uses Stellar's native DEX orderbook via manageSellOffer.
 */
export const SwapForm: React.FC<SwapFormProps> = ({
  publicKey,
  signTransaction,
  onSwapSuccess,
}) => {
  const [sellAssetIndex, setSellAssetIndex] = useState(0); // XLM
  const [buyAssetIndex, setBuyAssetIndex] = useState(1);   // USDC
  const [sellAmount, setSellAmount] = useState('');
  const [estimatedReceive, setEstimatedReceive] = useState('');
  const [bestPrice, setBestPrice] = useState('');
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [txStatus, setTxStatus] = useState<TxLifecycleStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sellAsset = SUPPORTED_ASSETS[sellAssetIndex];
  const buyAsset = SUPPORTED_ASSETS[buyAssetIndex];

  // Fetch price preview when inputs change
  const fetchPricePreview = useCallback(async (
    selling: AssetConfig,
    buying: AssetConfig,
    amount: string
  ) => {
    if (!amount || parseFloat(amount) <= 0) {
      setEstimatedReceive('');
      setBestPrice('');
      return;
    }

    setIsLoadingPrice(true);
    try {
      const [orderbook, estimate] = await Promise.all([
        fetchOrderbook(selling, buying),
        estimateSwapReceive(selling, buying, amount),
      ]);

      setBestPrice(orderbook.bestBidPrice);
      setEstimatedReceive(estimate);
    } catch (err) {
      console.error('Price fetch error:', err);
      setBestPrice('N/A');
      setEstimatedReceive('0');
    } finally {
      setIsLoadingPrice(false);
    }
  }, []);

  // Debounced price update
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (sellAmount) {
        fetchPricePreview(sellAsset, buyAsset, sellAmount);
      } else {
        setEstimatedReceive('');
        setBestPrice('');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sellAmount, sellAsset, buyAsset, fetchPricePreview]);

  // Swap sell/buy direction
  const handleFlipAssets = () => {
    setSellAssetIndex(buyAssetIndex);
    setBuyAssetIndex(sellAssetIndex);
    setSellAmount('');
    setEstimatedReceive('');
    setBestPrice('');
  };

  // Execute the swap
  const handleSwap = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return;
    if (!bestPrice || bestPrice === 'N/A' || bestPrice === '0') {
      setTxError('No available liquidity for this pair');
      setTxStatus('failed');
      return;
    }

    setTxStatus('pending');
    setTxError(null);
    setTxHash(null);

    try {
      // Use 98% of best price as minimum (2% slippage tolerance)
      const slippagePrice = (parseFloat(bestPrice) * 0.98).toFixed(7);

      const result = await executeSwap(
        publicKey,
        sellAsset,
        buyAsset,
        sellAmount,
        slippagePrice,
        signTransaction
      );

      setTxHash(result.hash);
      setTxStatus('success');

      // Record swap in Soroban contract (non-blocking)
      recordSwap(
        publicKey,
        sellAsset.code,
        buyAsset.code,
        sellAmount,
        signTransaction
      ).catch((err) => console.warn('Failed to record swap:', err));

      // Notify parent
      onSwapSuccess?.();
    } catch (err) {
      console.error('Swap error:', err);
      setTxStatus('failed');

      if (err instanceof Error) {
        if (err.message.includes('User declined') || err.message.includes('rejected')) {
          setTxError('Transaction was rejected by user');
        } else if (err.message.includes('op_underfunded')) {
          setTxError('Insufficient balance for this swap');
        } else if (err.message.includes('op_cross_self')) {
          setTxError('Cannot trade with your own offers');
        } else {
          setTxError(err.message);
        }
      } else {
        setTxError('Swap failed. Please try again.');
      }
    }
  };

  const resetTx = () => {
    setTxStatus('idle');
    setTxHash(null);
    setTxError(null);
    setSellAmount('');
    setEstimatedReceive('');
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
        <svg className="w-5 h-5 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Token Swap
      </h3>

      {/* Sell section */}
      <div className="space-y-4">
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">You sell</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="0.00"
              disabled={txStatus === 'pending'}
              className="flex-1 bg-transparent text-white text-2xl font-medium placeholder-gray-600 outline-none"
            />
            <select
              value={sellAssetIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSellAssetIndex(idx);
                if (idx === buyAssetIndex) {
                  setBuyAssetIndex(sellAssetIndex);
                }
              }}
              disabled={txStatus === 'pending'}
              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm font-medium cursor-pointer outline-none focus:border-stellar-purple"
            >
              {SUPPORTED_ASSETS.map((asset, i) => (
                <option key={asset.code + (asset.issuer || '')} value={i} className="bg-stellar-dark text-white">
                  {asset.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleFlipAssets}
            disabled={txStatus === 'pending'}
            className="p-2 bg-stellar-dark border border-white/20 rounded-xl hover:border-stellar-purple transition-colors hover:bg-white/5"
          >
            <svg className="w-5 h-5 text-stellar-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Buy section */}
        <div className="bg-black/30 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">You receive (estimated)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-medium">
              {isLoadingPrice ? (
                <span className="text-gray-500 animate-pulse">Fetching...</span>
              ) : estimatedReceive ? (
                <span className="text-white">{parseFloat(estimatedReceive).toFixed(4)}</span>
              ) : (
                <span className="text-gray-600">0.00</span>
              )}
            </div>
            <select
              value={buyAssetIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setBuyAssetIndex(idx);
                if (idx === sellAssetIndex) {
                  setSellAssetIndex(buyAssetIndex);
                }
              }}
              disabled={txStatus === 'pending'}
              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm font-medium cursor-pointer outline-none focus:border-stellar-purple"
            >
              {SUPPORTED_ASSETS.map((asset, i) => (
                <option key={asset.code + (asset.issuer || '')} value={i} className="bg-stellar-dark text-white">
                  {asset.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price info */}
        {bestPrice && bestPrice !== '0' && bestPrice !== 'N/A' && (
          <div className="px-4 py-2 bg-white/5 rounded-lg flex items-center justify-between text-sm">
            <span className="text-gray-400">Best Price</span>
            <span className="text-white font-mono">
              1 {sellAsset.code} ≈ {parseFloat(bestPrice).toFixed(6)} {buyAsset.code}
            </span>
          </div>
        )}

        {/* Slippage info */}
        <div className="px-4 py-2 bg-white/5 rounded-lg flex items-center justify-between text-sm">
          <span className="text-gray-400">Slippage Tolerance</span>
          <span className="text-yellow-400">2%</span>
        </div>

        {/* Transaction status */}
        <TransactionStatus
          status={txStatus}
          txHash={txHash}
          errorMessage={txError}
          onReset={resetTx}
        />

        {/* Swap button */}
        {txStatus !== 'success' && (
          <button
            onClick={handleSwap}
            disabled={
              txStatus === 'pending' ||
              !sellAmount ||
              parseFloat(sellAmount) <= 0 ||
              isLoadingPrice
            }
            className="w-full py-4 bg-gradient-to-r from-stellar-blue to-stellar-purple text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-stellar-purple/25"
          >
            {txStatus === 'pending' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Swapping...
              </span>
            ) : !sellAmount || parseFloat(sellAmount) <= 0 ? (
              'Enter an amount'
            ) : (
              `Swap ${sellAsset.code} → ${buyAsset.code}`
            )}
          </button>
        )}
      </div>
    </div>
  );
};
