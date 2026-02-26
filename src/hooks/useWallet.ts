import { useState, useCallback, useEffect } from 'react';
import * as freighterApi from '@stellar/freighter-api';
import { NETWORK_PASSPHRASE } from '../utils/constants';

interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  isFreighterInstalled: boolean;
  isLoading: boolean;
  error: string | null;
  isCorrectNetwork: boolean;
  walletName: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  checkConnection: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
}

function extractBooleanResult(result: unknown, key: string): boolean {
  if (typeof result === 'boolean') {
    return result;
  }
  if (result && typeof result === 'object' && key in result) {
    return (result as Record<string, boolean>)[key] === true;
  }
  return false;
}

function extractAddress(result: unknown): string | null {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.address === 'string') return obj.address;
    if (typeof obj.publicKey === 'string') return obj.publicKey;
  }
  return null;
}

function extractNetworkPassphrase(result: unknown): string | null {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.networkPassphrase === 'string') return obj.networkPassphrase;
    if (typeof obj.network === 'string') return obj.network;
  }
  return null;
}

function extractSignedXDR(result: unknown): string | null {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.signedTxXdr === 'string') return obj.signedTxXdr;
    if (typeof obj.signedXDR === 'string') return obj.signedXDR;
    if (typeof obj.xdr === 'string') return obj.xdr;
  }
  return null;
}

export function useWallet(): WalletState {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [freighterInstalled, setFreighterInstalled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [walletName, setWalletName] = useState('Freighter');

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const result = await freighterApi.getNetwork();
      const passphrase = extractNetworkPassphrase(result);
      const isTestnet = passphrase === NETWORK_PASSPHRASE;
      setIsCorrectNetwork(isTestnet);
      if (!isTestnet && passphrase) {
        setError('Please switch to TESTNET in your wallet settings');
      }
      return isTestnet;
    } catch {
      return true;
    }
  }, []);

  const getWalletAddress = useCallback(async (): Promise<string | null> => {
    if ('getAddress' in freighterApi) {
      try {
        const result = await (freighterApi as { getAddress: () => Promise<unknown> }).getAddress();
        const address = extractAddress(result);
        if (address) return address;
      } catch { /* fallback */ }
    }
    if ('getPublicKey' in freighterApi) {
      try {
        const result = await (freighterApi as { getPublicKey: () => Promise<unknown> }).getPublicKey();
        const address = extractAddress(result);
        if (address) return address;
      } catch { /* fallback */ }
    }
    return null;
  }, []);

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const connResult = await freighterApi.isConnected();
      const installed = extractBooleanResult(connResult, 'isConnected');
      setFreighterInstalled(installed);

      if (!installed) {
        setWalletConnected(false);
        setPublicKey(null);
        setIsLoading(false);
        return;
      }

      const allowedResult = await freighterApi.isAllowed();
      const allowed = extractBooleanResult(allowedResult, 'isAllowed');

      if (allowed) {
        const address = await getWalletAddress();
        if (address) {
          setPublicKey(address);
          setWalletConnected(true);
          setWalletName('Freighter');
          await checkNetwork();
          setIsLoading(false);
          return;
        }
      }

      setWalletConnected(false);
      setPublicKey(null);
    } catch {
      setFreighterInstalled(false);
      setWalletConnected(false);
      setPublicKey(null);
    } finally {
      setIsLoading(false);
    }
  }, [checkNetwork, getWalletAddress]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const connResult = await freighterApi.isConnected();
      const installed = extractBooleanResult(connResult, 'isConnected');

      if (!installed) {
        setFreighterInstalled(false);
        setError('Freighter wallet not detected. Please install from freighter.app and refresh.');
        setIsLoading(false);
        return;
      }

      setFreighterInstalled(true);

      // Try requestAccess (v2 API)
      if ('requestAccess' in freighterApi) {
        try {
          const result = await (freighterApi as { requestAccess: () => Promise<unknown> }).requestAccess();
          const address = extractAddress(result);
          if (address) {
            setPublicKey(address);
            setWalletConnected(true);
            setWalletName('Freighter');
            await checkNetwork();
            setIsLoading(false);
            return;
          }
        } catch { /* fallback */ }
      }

      // Fallback: setAllowed + getAddress
      try {
        const allowResult = await freighterApi.setAllowed();
        const allowed = extractBooleanResult(allowResult, 'isAllowed');
        if (allowed) {
          const address = await getWalletAddress();
          if (address) {
            setPublicKey(address);
            setWalletConnected(true);
            setWalletName('Freighter');
            await checkNetwork();
            setIsLoading(false);
            return;
          }
        } else {
          setError('Connection was rejected. Please approve in your wallet.');
        }
      } catch {
        setError('Failed to connect. Please try again.');
      }
    } catch {
      setError('Failed to connect wallet.');
    } finally {
      setIsLoading(false);
    }
  }, [checkNetwork, getWalletAddress]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletConnected(false);
    setError(null);
    setIsCorrectNetwork(true);
    setWalletName('');
  }, []);

  /**
   * Signs a transaction XDR using the connected wallet.
   */
  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    try {
      const signResult = await freighterApi.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const signedXDR = extractSignedXDR(signResult);

      if (signResult && typeof signResult === 'object' && 'error' in signResult) {
        const errorMsg = (signResult as { error: string }).error;
        throw new Error(errorMsg || 'Transaction signing failed');
      }

      if (!signedXDR) {
        throw new Error('No signed transaction returned from wallet');
      }

      return signedXDR;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('User declined') || err.message.includes('rejected')) {
          throw new Error('Transaction was rejected by user');
        }
        throw err;
      }
      throw new Error('Failed to sign transaction');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkConnection, 500);
    return () => clearTimeout(timer);
  }, [checkConnection]);

  return {
    publicKey,
    isConnected: walletConnected,
    isFreighterInstalled: freighterInstalled,
    isLoading,
    error,
    isCorrectNetwork,
    walletName,
    connect,
    disconnect,
    checkConnection,
    signTransaction,
  };
}
