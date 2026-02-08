import * as StellarSdk from '@stellar/stellar-sdk';
import * as freighterApi from '@stellar/freighter-api';
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
function extractSignedXDR(result: unknown): string | null {
  if (typeof result === 'string') {
    return result;
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.signedTxXdr === 'string') return obj.signedTxXdr;
    if (typeof obj.signedXDR === 'string') return obj.signedXDR;
    if (typeof obj.xdr === 'string') return obj.xdr;
  }
  return null;
}

export async function sendPayment(
  sourcePublicKey: string,
  destinationAddress: string,
  amount: string
): Promise<{ hash: string }> {
  console.log('=== Starting Payment ===');
  console.log('From:', sourcePublicKey);
  console.log('To:', destinationAddress);
  console.log('Amount:', amount);

  // Step 1: Load the source account to get sequence number
  const sourceAccount = await server.loadAccount(sourcePublicKey);
  console.log('Source account loaded');

  // Step 2: Check if destination account exists
  let destinationExists = true;
  try {
    await server.loadAccount(destinationAddress);
    console.log('Destination account exists');
  } catch (error) {
    if (error instanceof StellarSdk.NotFoundError) {
      destinationExists = false;
      console.log('Destination account does not exist - will use createAccount');
    } else {
      throw error;
    }
  }

  // Step 3: Build the transaction
  // We use TransactionBuilder to construct the transaction with proper formatting
  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE, // Base fee for the transaction (100 stroops)
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  let transaction: StellarSdk.Transaction;

  if (destinationExists) {
    // If destination exists, use a regular payment operation
    transaction = txBuilder
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationAddress,
          asset: StellarSdk.Asset.native(), // XLM (native asset)
          amount: amount,
        })
      )
      .setTimeout(180) // Transaction valid for 3 minutes
      .build();
  } else {
    // If destination doesn't exist, use createAccount operation
    // This creates and funds the account in one operation
    // Minimum balance on Stellar is 1 XLM for a new account
    transaction = txBuilder
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: destinationAddress,
          startingBalance: amount,
        })
      )
      .setTimeout(180)
      .build();
  }

  console.log('Transaction built, XDR:', transaction.toXDR().substring(0, 50) + '...');

  // Step 4: Sign the transaction using Freighter wallet
  // This will prompt the user in the Freighter extension to approve
  console.log('Requesting signature from Freighter...');
  
  let signedXDR: string | null = null;
  
  try {
    const signResult = await freighterApi.signTransaction(
      transaction.toXDR(),
      {
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    );
    
    console.log('Sign result:', signResult);
    signedXDR = extractSignedXDR(signResult);
    
    // Check for error in response
    if (signResult && typeof signResult === 'object' && 'error' in signResult) {
      const errorMsg = (signResult as { error: string }).error;
      throw new Error(errorMsg || 'Transaction signing failed');
    }
  } catch (err) {
    console.error('Signing error:', err);
    if (err instanceof Error) {
      if (err.message.includes('User declined') || err.message.includes('rejected')) {
        throw new Error('Transaction was rejected by user');
      }
      throw err;
    }
    throw new Error('Failed to sign transaction');
  }

  if (!signedXDR) {
    throw new Error('No signed transaction returned from Freighter');
  }

  console.log('Transaction signed successfully');

  // Step 5: Parse the signed transaction and submit to the network
  const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXDR,
    NETWORK_PASSPHRASE
  );

  console.log('Submitting transaction to network...');
  const result = await server.submitTransaction(signedTransaction);
  console.log('Transaction submitted! Hash:', result.hash);

  return { hash: result.hash };
}
