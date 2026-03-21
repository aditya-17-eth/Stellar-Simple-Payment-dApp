import * as StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';

const trackerId = 'CCVIDKEQU7UIXA24WZSFP3HDESQ4JZVEZUHHOKBD42KHILQPUI7EANK5';
const rpcUrl = 'https://soroban-testnet.stellar.org';
const network = StellarSdk.Networks.TESTNET;

async function debugSim() {
  const server = new StellarSdk.SorobanRpc.Server(rpcUrl);
  const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
  const contract = new StellarSdk.Contract(trackerId);
  const pair = StellarSdk.Keypair.random();
  console.log('Testing with source:', pair.publicKey());
  
  await axios.get(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
  const account = await horizonServer.loadAccount(pair.publicKey());

  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: network
  })
  .addOperation(contract.call(
    'record_swap',
    StellarSdk.nativeToScVal(pair.publicKey(), { type: 'address' }),
    StellarSdk.nativeToScVal('XLM', { type: 'string' }),
    StellarSdk.nativeToScVal('USDC', { type: 'string' }),
    StellarSdk.nativeToScVal(100_000_000, { type: 'i128' }),
    StellarSdk.nativeToScVal(Math.floor(Date.now()/1000), { type: 'u64' })
  ));

  const tx = txBuilder.setTimeout(30).build();
  console.log('Simulating single op...');
  const sim = await server.simulateTransaction(tx);
  
  if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) {
    console.log('SIMULATION FAILED!');
    console.log('Error:', sim.error);
  } else {
    console.log('SIMULATION SUCCESS!');
    console.log('Retval:', StellarSdk.scValToNative((sim as any).result.retval));
  }
}

debugSim();
