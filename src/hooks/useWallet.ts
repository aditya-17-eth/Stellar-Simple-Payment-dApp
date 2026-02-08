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
  connect: () => Promise<void>;
  disconnect: () => void;
  checkConnection: () => Promise<void>;
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

/**
 * Helper to extract address from API result
 */
function extractAddress(result: unknown): string | null {
  if (typeof result === 'string') {
    return result;
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.address === 'string') return obj.address;
    if (typeof obj.publicKey === 'string') return obj.publicKey;
  }
  return null;
}

/**
 * Helper to extract network passphrase
 */
function extractNetworkPassphrase(result: unknown): string | null {
  if (typeof result === 'string') {
    return result;
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.networkPassphrase === 'string') return obj.networkPassphrase;
    if (typeof obj.network === 'string') return obj.network;
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

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const result = await freighterApi.getNetwork();
      console.log('Network:', result);
      const passphrase = extractNetworkPassphrase(result);
      const isTestnet = passphrase === NETWORK_PASSPHRASE;
      setIsCorrectNetwork(isTestnet);
      if (!isTestnet && passphrase) {
        setError('Please switch to TESTNET in Freighter settings');
      }
      return isTestnet;
    } catch (e) {
      console.log('Network check failed:', e);
      return true;
    }
  }, []);

  /**
   * Gets the wallet address using available API methods
   */
  const getWalletAddress = useCallback(async (): Promise<string | null> => {
    // Try getAddress first (v2 API)
    if ('getAddress' in freighterApi) {
      try {
        const result = await (freighterApi as { getAddress: () => Promise<unknown> }).getAddress();
        console.log('getAddress result:', result);
        const address = extractAddress(result);
        if (address) return address;
      } catch (e) {
        console.log('getAddress failed:', e);
      }
    }
    
    // Fallback to getPublicKey
    if ('getPublicKey' in freighterApi) {
      try {
        const result = await (freighterApi as { getPublicKey: () => Promise<unknown> }).getPublicKey();
        console.log('getPublicKey result:', result);
        const address = extractAddress(result);
        if (address) return address;
      } catch (e) {
        console.log('getPublicKey failed:', e);
      }
    }
    
    return null;
  }, []);

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('=== Checking Freighter Connection ===');

    try {
      // Step 1: Check if extension is installed
      const connResult = await freighterApi.isConnected();
      console.log('isConnected result:', connResult);
      const installed = extractBooleanResult(connResult, 'isConnected');
      console.log('Installed:', installed);
      
      setFreighterInstalled(installed);

      if (!installed) {
        console.log('Freighter not detected');
        setWalletConnected(false);
        setPublicKey(null);
        setIsLoading(false);
        return;
      }

      // Step 2: Check if already allowed
      const allowedResult = await freighterApi.isAllowed();
      console.log('isAllowed result:', allowedResult);
      const allowed = extractBooleanResult(allowedResult, 'isAllowed');
      console.log('Allowed:', allowed);

      if (allowed) {
        // Step 3: Get the address
        const address = await getWalletAddress();
        console.log('Address:', address);
        
        if (address) {
          setPublicKey(address);
          setWalletConnected(true);
          await checkNetwork();
          setIsLoading(false);
          return;
        }
      }

      // Not connected
      setWalletConnected(false);
      setPublicKey(null);
      
    } catch (err) {
      console.error('Connection check failed:', err);
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
    
    console.log('=== Connecting to Freighter ===');

    try {
      // Check installation
      const connResult = await freighterApi.isConnected();
      console.log('Connect - isConnected:', connResult);
      const installed = extractBooleanResult(connResult, 'isConnected');
      
      if (!installed) {
        setFreighterInstalled(false);
        setError('Freighter wallet not detected. Please install from freighter.app and refresh.');
        setIsLoading(false);
        return;
      }
      
      setFreighterInstalled(true);

      // Try requestAccess first (v2 API)
      if ('requestAccess' in freighterApi) {
        try {
          console.log('Trying requestAccess...');
          const result = await (freighterApi as { requestAccess: () => Promise<unknown> }).requestAccess();
          console.log('requestAccess result:', result);
          const address = extractAddress(result);
          
          if (address) {
            setPublicKey(address);
            setWalletConnected(true);
            await checkNetwork();
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.log('requestAccess failed:', e);
        }
      }

      // Fallback: setAllowed + getAddress
      try {
        console.log('Trying setAllowed...');
        const allowResult = await freighterApi.setAllowed();
        console.log('setAllowed result:', allowResult);
        const allowed = extractBooleanResult(allowResult, 'isAllowed');
        
        if (allowed) {
          const address = await getWalletAddress();
          
          if (address) {
            setPublicKey(address);
            setWalletConnected(true);
            await checkNetwork();
            setIsLoading(false);
            return;
          }
        } else {
          setError('Connection was rejected. Please approve in Freighter.');
        }
      } catch (e) {
        console.log('setAllowed failed:', e);
        setError('Failed to connect. Please try again.');
      }
      
    } catch (err) {
      console.error('Connect error:', err);
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
  }, []);

  // Check on mount
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
    connect,
    disconnect,
    checkConnection,
  };
}
