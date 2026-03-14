import * as StellarSdk from '@stellar/stellar-sdk';

import { HORIZON_URL, NETWORK_PASSPHRASE } from './constants';

// Initialize the Horizon server for TESTNET
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Fetches the XLM balance for a given Stellar account
 * 
 * @param publicKey - The Stellar public key (address) to check
 * @returns The XLM balance as a string, or "0" if account doesn't exist
 */
export async function fetchBalance(publicKey: string): Promise<string> {
  try {
    // Load the account from the Horizon server
    const account = await server.loadAccount(publicKey);
    
    // Find the native XLM balance from the account's balances array
    // Native assets have asset_type of 'native'
    const nativeBalance = account.balances.find(
      (balance) => balance.asset_type === 'native'
    );
    
    return nativeBalance ? nativeBalance.balance : '0';
  } catch (error) {
    // If the account doesn't exist on the network yet, return 0
    if (error instanceof StellarSdk.NotFoundError) {
      return '0';
    }
    throw error;
  }
}

/**
 * Fetches the balance of a non-native asset (e.g. USDC, SRT) for a Stellar account.
 * 
 * @param publicKey - The Stellar public key to check
 * @param assetCode - The asset code (e.g. "USDC")
 * @param assetIssuer - The issuer account of the asset
 * @returns The asset balance as a string, or "0" if no trustline exists
 */
export async function fetchTokenBalance(
  publicKey: string,
  assetCode: string,
  assetIssuer: string
): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);

    const tokenBalance = account.balances.find(
      (b) =>
        b.asset_type !== 'native' &&
        'asset_code' in b &&
        'asset_issuer' in b &&
        (b as { asset_code: string }).asset_code === assetCode &&
        (b as { asset_issuer: string }).asset_issuer === assetIssuer
    );

    return tokenBalance ? tokenBalance.balance : '0';
  } catch (error) {
    if (error instanceof StellarSdk.NotFoundError) {
      return '0';
    }
    throw error;
  }
}

/**
 * Validates if a string is a valid Stellar public key
 * 
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidStellarAddress(address: string): boolean {
  try {
    StellarSdk.Keypair.fromPublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to extract signed XDR from Freighter response
 */


/**
 * Sends a payment transaction on the Stellar network.
 * 
 * SECURITY:
 * - Transaction is built locally with user-provided parameters
 * - Signing is delegated to the wallet via signTransaction callback
 * - Private keys NEVER enter this function or application
 * - User must approve the transaction in their wallet extension
 * - Only public keys and signed XDRs are handled by this application
 * 
 * @param sourcePublicKey - The sender's public key (not private key!)
 * @param destinationAddress - The recipient's public address
 * @param amount - Amount to send in XLM
 * @param memo - Optional memo text
 * @param signTransaction - Callback to sign via wallet (delegates to wallet extension)
 * @returns Transaction hash on success
 */
export async function sendPayment(
  sourcePublicKey: string,
  destinationAddress: string,
  amount: string,
  memo: string = '',
  signTransaction: (xdr: string) => Promise<string>
): Promise<{ hash: string }> {
  console.log('=== Starting Payment ===');
  console.log('From:', sourcePublicKey);
  console.log('To:', destinationAddress);
  console.log('Amount:', amount);

  // Step 1: Load the source account to get sequence number
  const sourceAccount = await server.loadAccount(sourcePublicKey);
  
  // Step 2: Build the transaction
  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Add memo if provided
  if (memo) {
    txBuilder.addMemo(StellarSdk.Memo.text(memo));
  }

  // Check if destination exists
  try {
    await server.loadAccount(destinationAddress);
    // Exists: Payment operation
    txBuilder.addOperation(
      StellarSdk.Operation.payment({
        destination: destinationAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount,
      })
    );
  } catch (error) {
    if (error instanceof StellarSdk.NotFoundError) {
      // Doesn't exist: Create Account operation
      txBuilder.addOperation(
        StellarSdk.Operation.createAccount({
          destination: destinationAddress,
          startingBalance: amount,
        })
      );
    } else {
      throw error;
    }
  }

  const transaction = txBuilder.setTimeout(180).build();
  const xdr = transaction.toXDR();

  console.log('Transaction built, signing...');

  // SECURITY: Sign using wallet callback - private keys never enter this application
  // User must approve the transaction in their wallet extension
  const signedXDR = await signTransaction(xdr);

  // Step 4: Submit to network
  console.log('Submitting transaction to network...');
  const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXDR,
    NETWORK_PASSPHRASE
  );

  let result;
  try {
    result = await server.submitTransaction(signedTransaction);
  } catch (err: unknown) {
    // Horizon returns detailed error codes in the response body
    if (
      err &&
      typeof err === 'object' &&
      'response' in err &&
      err.response &&
      typeof err.response === 'object' &&
      'data' in err.response
    ) {
      const data = (err.response as { data?: { extras?: { result_codes?: unknown } } }).data;
      const codes = data?.extras?.result_codes;
      if (codes) {
        throw new Error(`Transaction failed: ${JSON.stringify(codes)}`);
      }
    }
    throw err;
  }
  console.log('Transaction submitted! Hash:', result.hash);

  return { hash: result.hash };
}
