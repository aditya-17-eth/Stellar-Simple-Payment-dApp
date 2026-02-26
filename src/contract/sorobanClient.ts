import * as StellarSdk from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE, SWAP_TRACKER_CONTRACT_ID } from '../utils/constants';

const sorobanServer = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);

/**
 * Represents a swap record returned from the contract.
 */
export interface SwapRecordData {
  user: string;
  fromAsset: string;
  toAsset: string;
  amount: string;
  timestamp: number;
}

/**
 * Records a swap in the Soroban contract.
 * Builds and submits an invokeContract transaction.
 */
export async function recordSwap(
  publicKey: string,
  fromAsset: string,
  toAsset: string,
  amount: string,
  signTx: (xdr: string) => Promise<string>
): Promise<string> {
  if (SWAP_TRACKER_CONTRACT_ID === 'PLACEHOLDER_CONTRACT_ID') {
    console.warn('Swap tracker contract not deployed yet. Skipping recording.');
    return 'no-contract';
  }

  try {
    const account = await sorobanServer.getAccount(publicKey);
    const contract = new StellarSdk.Contract(SWAP_TRACKER_CONTRACT_ID);

    const timestamp = Math.floor(Date.now() / 1000);
    const amountInStroops = Math.floor(parseFloat(amount) * 10_000_000);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'record_swap',
          StellarSdk.nativeToScVal(publicKey, { type: 'address' }),
          StellarSdk.nativeToScVal(fromAsset, { type: 'string' }),
          StellarSdk.nativeToScVal(toAsset, { type: 'string' }),
          StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' }),
          StellarSdk.nativeToScVal(timestamp, { type: 'u64' })
        )
      )
      .setTimeout(180)
      .build();

    // Simulate the transaction to get the proper footprint
    const simulated = await sorobanServer.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simulated).build();

    // Sign via wallet
    const signedXdr = await signTx(preparedTx.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    const sendResponse = await sorobanServer.sendTransaction(signedTx);

    if (sendResponse.status === 'ERROR') {
      throw new Error('Failed to send contract transaction');
    }

    // Poll for result
    let getResponse = await sorobanServer.getTransaction(sendResponse.hash);
    while (getResponse.status === 'NOT_FOUND') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      getResponse = await sorobanServer.getTransaction(sendResponse.hash);
    }

    if (getResponse.status === 'SUCCESS') {
      return sendResponse.hash;
    } else {
      throw new Error(`Contract tx failed: ${getResponse.status}`);
    }
  } catch (err) {
    console.error('Error recording swap:', err);
    throw err;
  }
}

/**
 * Fetches recent swap records from the Soroban contract via simulation.
 */
export async function getRecentSwaps(count: number = 10): Promise<SwapRecordData[]> {
  if (SWAP_TRACKER_CONTRACT_ID === 'PLACEHOLDER_CONTRACT_ID') {
    console.warn('Swap tracker contract not deployed. Returning empty list.');
    return [];
  }

  try {
    const contract = new StellarSdk.Contract(SWAP_TRACKER_CONTRACT_ID);

    // Create a dummy source account for simulation
    const dummySource = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

    let account;
    try {
      account = await sorobanServer.getAccount(dummySource);
    } catch {
      // If dummy account doesn't exist, return empty
      return [];
    }

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_recent_swaps',
          StellarSdk.nativeToScVal(count, { type: 'u32' })
        )
      )
      .setTimeout(30)
      .build();

    const simulated = await sorobanServer.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      console.error('Simulation error:', simulated.error);
      return [];
    }

    const result = (simulated as StellarSdk.SorobanRpc.Api.SimulateTransactionSuccessResponse).result;
    if (!result) return [];

    // Parse the response - it's a Vec<SwapRecord>
    const returnVal = result.retval;
    const records: SwapRecordData[] = [];

    if (returnVal && returnVal.value() && Array.isArray(returnVal.value())) {
      for (const item of returnVal.value() as StellarSdk.xdr.ScVal[]) {
        try {
          const fields = (item.value() as StellarSdk.xdr.ScMapEntry[]);
          const record: SwapRecordData = {
            user: '',
            fromAsset: '',
            toAsset: '',
            amount: '0',
            timestamp: 0,
          };

          for (const field of fields) {
            const key = StellarSdk.scValToNative(field.key());
            const val = StellarSdk.scValToNative(field.val());

            switch (key) {
              case 'user':
                record.user = String(val);
                break;
              case 'from_asset':
                record.fromAsset = String(val);
                break;
              case 'to_asset':
                record.toAsset = String(val);
                break;
              case 'amount':
                record.amount = (Number(val) / 10_000_000).toFixed(7);
                break;
              case 'timestamp':
                record.timestamp = Number(val);
                break;
            }
          }

          records.push(record);
        } catch (parseErr) {
          console.warn('Failed to parse swap record:', parseErr);
        }
      }
    }

    return records;
  } catch (err) {
    console.error('Error fetching swaps:', err);
    return [];
  }
}

/**
 * Polls for recent swap events from the contract.
 * Used for real-time feed updates.
 */
export async function pollSwapEvents(
  cursor?: string
): Promise<{ events: SwapRecordData[]; latestCursor: string }> {
  if (SWAP_TRACKER_CONTRACT_ID === 'PLACEHOLDER_CONTRACT_ID') {
    return { events: [], latestCursor: cursor || '' };
  }

  try {
    const response = await sorobanServer.getEvents({
      startLedger: cursor ? undefined : 1,
      filters: [
        {
          type: 'contract',
          contractIds: [SWAP_TRACKER_CONTRACT_ID],
          topics: [['AAAADwAAAARzd2Fw']], // symbol "swap" as base64 ScVal
        },
      ],
      limit: 20,
    });

    const events: SwapRecordData[] = [];
    let latestCursor = cursor || '';

    if (response.events) {
      for (const event of response.events) {
        latestCursor = event.pagingToken || latestCursor;

        try {
          if (event.value) {
            const val = StellarSdk.scValToNative(event.value);
            if (Array.isArray(val)) {
              events.push({
                user: String(val[0]).substring(0, 10) + '...',
                fromAsset: String(val[1]),
                toAsset: String(val[2]),
                amount: (Number(val[3]) / 10_000_000).toFixed(7),
                timestamp: Number(val[4]),
              });
            }
          }
        } catch {
          // Skip unparseable events
        }
      }
    }

    return { events, latestCursor };
  } catch (err) {
    console.error('Error polling events:', err);
    return { events: [], latestCursor: cursor || '' };
  }
}
