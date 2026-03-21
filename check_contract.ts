import * as StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';

const trackerId = 'CCVIDKEQU7UIXA24WZSFP3HDESQ4JZVEZUHHOKBD42KHILQPUI7EANK5';
const rpcUrl = 'https://soroban-testnet.stellar.org';

async function check() {
  console.log('Checking events for:', trackerId);
  try {
    const resp = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "getEvents",
      params: {
        startLedger: 1,
        filters: [{
          type: "contract",
          contractIds: [trackerId]
        }],
        limit: 10
      }
    });

    const events = resp.data.result.events;
    if (!events || events.length === 0) {
      console.log('No events found for this contract.');
    } else {
      console.log(`Found ${events.length} events:`);
      events.forEach((ev: any, i: number) => {
        console.log(`Event ${i}:`, ev);
        try {
           const val = StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(ev.value, 'base64'));
           console.log('Decoded value:', val);
        } catch(e) {
           console.log('Failed to decode value');
        }
      });
    }
    
    // Also check swap count via simulation
    console.log('\nChecking swap count...');
    const dummySource = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    const server = new StellarSdk.SorobanRpc.Server(rpcUrl);
    const contract = new StellarSdk.Contract(trackerId);
    
    const account = await server.getAccount(dummySource);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(contract.call('get_swap_count'))
    .setTimeout(30)
    .build();
    
    const sim = await server.simulateTransaction(tx);
    if ((sim as any).result) {
      const count = StellarSdk.scValToNative((sim as any).result.retval);
      console.log('Swap count from contract:', count);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

check();
