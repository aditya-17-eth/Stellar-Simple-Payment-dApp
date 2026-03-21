import * as StellarSdk from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE, REWARD_TOKEN_CONTRACT_ID } from '../utils/constants';

const sorobanServer = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);

/**
 * Fetches the reward token balance for a user from the Soroban contract.
 * Uses simulation (read-only) — no signing or wallet interaction needed.
 *
 * @param publicKey - The user's Stellar public key
 * @returns The reward token balance as a formatted string
 */
export async function getRewardBalance(publicKey: string): Promise<string> {
  if ((REWARD_TOKEN_CONTRACT_ID as string) === 'PLACEHOLDER_REWARD_TOKEN_CONTRACT_ID') {
    return '0';
  }

  try {
    const contract = new StellarSdk.Contract(REWARD_TOKEN_CONTRACT_ID);

    // Use a dummy account for simulation (read-only call)
    const dummySource = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

    let account;
    try {
      account = await sorobanServer.getAccount(dummySource);
    } catch {
      return '0';
    }

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'balance',
          StellarSdk.nativeToScVal(publicKey, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build();

    const simulated = await sorobanServer.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      console.error('Reward balance simulation error:', simulated.error);
      return '0';
    }

    const result = (simulated as StellarSdk.SorobanRpc.Api.SimulateTransactionSuccessResponse).result;
    if (!result) return '0';

    const balance = StellarSdk.scValToNative(result.retval);
    // Convert from 7-decimal on-chain representation to display value
    return (Number(balance) / 10_000_000).toFixed(2);
  } catch (err) {
    console.error('Error fetching reward balance:', err);
    return '0';
  }
}
