import * as StellarSdk from '@stellar/stellar-sdk';

const rewardTokenId = 'CCLTHEIWHM3BUYV3DNLCQJSJ7GP3GWW2DQPJDMDQTRB2JQXDBSOQBGCG';
const trackerId = 'CCVIDKEQU7UIXA24WZSFP3HDESQ4JZVEZUHHOKBD42KHILQPUI7EANK5';
const rpcUrl = 'https://soroban-testnet.stellar.org';

async function check() {
  const server = new StellarSdk.SorobanRpc.Server(rpcUrl);
  const rewardContract = new StellarSdk.Contract(rewardTokenId);
  const trackerContract = new StellarSdk.Contract(trackerId);
  const dummySource = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

  try {
    const account = await server.getAccount(dummySource);
    
    // Check total supply
    const tx1 = new StellarSdk.TransactionBuilder(account, { fee: '1000', networkPassphrase: StellarSdk.Networks.TESTNET })
      .addOperation(rewardContract.call('total_supply'))
      .setTimeout(30).build();
    const sim1 = await server.simulateTransaction(tx1);
    if (!StellarSdk.SorobanRpc.Api.isSimulationError(sim1)) {
      console.log('Total Reward Supply:', StellarSdk.scValToNative(sim1.result.retval).toString());
    }

    // Check swap count
    const tx2 = new StellarSdk.TransactionBuilder(account, { fee: '1000', networkPassphrase: StellarSdk.Networks.TESTNET })
      .addOperation(trackerContract.call('get_swap_count'))
      .setTimeout(30).build();
    const sim2 = await server.simulateTransaction(tx2);
    if (!StellarSdk.SorobanRpc.Api.isSimulationError(sim2)) {
      console.log('Swap Count:', StellarSdk.scValToNative(sim2.result.retval).toString());
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

check();
