import * as StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';

const trackerId = 'CCYZ6M4NYF5HAJWEIKEYFK5HXULITGU54TTHLUNFH24SM67XVZ3D3TFI';
const rpcUrl = 'https://soroban-testnet.stellar.org';
const network = StellarSdk.Networks.TESTNET;

async function debugSim() {
  const server = new StellarSdk.SorobanRpc.Server(rpcUrl);
  const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
  const contract = new StellarSdk.Contract(trackerId);
  const pair = StellarSdk.Keypair.random();
  
  await axios.get(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
  const account = await horizonServer.loadAccount(pair.publicKey());

  const contractOp = contract.call(
    'record_swap',
    StellarSdk.nativeToScVal(pair.publicKey(), { type: 'address' }),
    StellarSdk.nativeToScVal('XLM', { type: 'string' }),
    StellarSdk.nativeToScVal('USDC', { type: 'string' }),
    StellarSdk.nativeToScVal(100_000_000, { type: 'i128' }),
    StellarSdk.nativeToScVal(Math.floor(Date.now()/1000), { type: 'u64' })
  );

  // 1. Simulate SOROBAN ONLY
  const simTx = new StellarSdk.TransactionBuilder(account, { fee: '1000', networkPassphrase: network })
    .addOperation(contractOp)
    .setTimeout(30)
    .build();

  console.log('Simulating Soroban op alone...');
  const sim = await server.simulateTransaction(simTx);
  
  if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) {
    console.log('SIMULATION FAILED!', sim.error);
    return;
  }
  console.log('SIMULATION SUCCESS!');

  // 2. Build BUNDLED TX (Classic + Soroban) 
  // We use the footprint from the simulation of the single Soroban op
  const bundledTx = new StellarSdk.TransactionBuilder(account, { fee: '1000', networkPassphrase: network })
    .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: StellarSdk.Asset.native(),
        buying: new StellarSdk.Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'),
        amount: '1',
        price: '0.1',
        offerId: 0
    }))
    .addOperation(contractOp)
    .setTimeout(30);

  // This is the Magic: assembleTransaction on the BUNDLED tx using SIM result from the PARTIAL tx
  const finalTx = StellarSdk.SorobanRpc.assembleTransaction(bundledTx.build(), sim).build();
  
  console.log('Bundled Tx built successfully with footprint!');
  console.log('Ops count:', finalTx.operations.length);
  console.log('Has Soroban data:', !!finalTx.sorobanData);
}

debugSim();
