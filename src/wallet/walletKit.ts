/**
 * Wallet abstraction layer.
 *
 * Provides a unified interface for wallet operations.
 * Currently uses Freighter API directly. When @creit.tech/stellar-wallets-kit
 * is installed, this can be swapped to use StellarWalletsKit for
 * multi-wallet support (Freighter, xBull, Albedo, etc.).
 *
 * Install the kit:  npm install @creit.tech/stellar-wallets-kit
 */

import * as freighterApi from '@stellar/freighter-api';
import { NETWORK_PASSPHRASE } from '../utils/constants';

export const FREIGHTER_ID = 'freighter';
export const XBULL_ID = 'xbull';

function extractBooleanResult(result: unknown, key: string): boolean {
  if (typeof result === 'boolean') return result;
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

/**
 * Checks if Freighter is installed.
 */
export async function isWalletInstalled(): Promise<boolean> {
  try {
    const result = await freighterApi.isConnected();
    return extractBooleanResult(result, 'isConnected');
  } catch {
    return false;
  }
}

/**
 * Connects to the wallet and returns the public address.
 */
export async function connectWallet(): Promise<string> {
  // Try requestAccess (v2)
  if ('requestAccess' in freighterApi) {
    try {
      const result = await (freighterApi as { requestAccess: () => Promise<unknown> }).requestAccess();
      const address = extractAddress(result);
      if (address) return address;
    } catch { /* fallback */ }
  }

  // Fallback: setAllowed + getAddress
  const allowResult = await freighterApi.setAllowed();
  const allowed = extractBooleanResult(allowResult, 'isAllowed');
  if (!allowed) throw new Error('Wallet connection was rejected');

  const address = await getWalletAddress();
  if (!address) throw new Error('Could not get wallet address');
  return address;
}

/**
 * Gets the current wallet address.
 */
export async function getWalletAddress(): Promise<string | null> {
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
}

/**
 * Signs a transaction XDR using the connected wallet.
 */
export async function signTransaction(xdr: string): Promise<string> {
  const signResult = await freighterApi.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (signResult && typeof signResult === 'object' && 'error' in signResult) {
    throw new Error((signResult as { error: string }).error || 'Signing failed');
  }

  const signed = extractSignedXDR(signResult);
  if (!signed) throw new Error('No signed transaction returned');
  return signed;
}

/**
 * Returns the selected wallet ID (currently always Freighter).
 */
export function getSelectedWalletId(): string {
  return FREIGHTER_ID;
}
