import * as StellarSdk from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const sorobanServer = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
const network = StellarSdk.Networks.TESTNET;

async function deploy() {
  const adminPair = StellarSdk.Keypair.random();
  console.log('Deployer account:', adminPair.publicKey());
  await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(adminPair.publicKey())}`);
  
  let account = await server.loadAccount(adminPair.publicKey());

  const readWasm = (filepath: string) => fs.readFileSync(path.join(process.cwd(), filepath));

  // 1. Upload Reward Token Wasm
  console.log('Uploading reward token...');
  const rewardWasm = readWasm('contracts/reward_token/target/wasm32-unknown-unknown/release/reward_token.wasm');
  let tx = new StellarSdk.TransactionBuilder(account, { fee: '10000', networkPassphrase: network })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm: rewardWasm }))
    .setTimeout(30)
    .build();
  
  let sim = await sorobanServer.simulateTransaction(tx);
  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, sim).build();
  tx.sign(adminPair);
  let res = await sorobanServer.sendTransaction(tx);
  await pollTx(res.hash);
  const rwval = (sim as any).result.retval;
  const rewardWasmId = StellarSdk.scValToNative(rwval).toString('hex');
  console.log('Reward Wasm ID:', rewardWasmId);

  // 2. Upload Swap Tracker Wasm
  console.log('Uploading tracker...');
  account = await server.loadAccount(adminPair.publicKey());
  const trackerWasm = readWasm('contracts/swap_tracker/target/wasm32-unknown-unknown/release/swap_tracker.wasm');
  tx = new StellarSdk.TransactionBuilder(account, { fee: '10000', networkPassphrase: network })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm: trackerWasm }))
    .setTimeout(30)
    .build();

  sim = await sorobanServer.simulateTransaction(tx);
  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, sim).build();
  tx.sign(adminPair);
  res = await sorobanServer.sendTransaction(tx);
  await pollTx(res.hash);
  const trackerWasmId = StellarSdk.scValToNative((sim as any).result.retval).toString('hex');
  console.log('Tracker Wasm ID:', trackerWasmId);

  // 3. Create Reward Token Contract
  console.log('Creating reward contract...');
  account = await server.loadAccount(adminPair.publicKey());
  tx = new StellarSdk.TransactionBuilder(account, { fee: '10000', networkPassphrase: network })
    .addOperation(StellarSdk.Operation.createCustomContract({ address: StellarSdk.Address.account(adminPair.publicKey()), wasmHash: Buffer.from(rewardWasmId, 'hex') }))
    .setTimeout(30)
    .build();

  sim = await sorobanServer.simulateTransaction(tx);
  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, sim).build();
  tx.sign(adminPair);
  res = await sorobanServer.sendTransaction(tx);
  await pollTx(res.hash);
  const rewardContractId = StellarSdk.Address.fromScAddress(StellarSdk.xdr.ScVal.fromXDR((sim as any).result.retval.toXDR())).toString();
  console.log('Reward Contract ID:', rewardContractId);

  // 4. Create Tracker Contract
  console.log('Creating tracker contract...');
  account = await server.loadAccount(adminPair.publicKey());
  tx = new StellarSdk.TransactionBuilder(account, { fee: '10000', networkPassphrase: network })
    .addOperation(StellarSdk.Operation.createCustomContract({ address: StellarSdk.Address.account(adminPair.publicKey()), wasmHash: Buffer.from(trackerWasmId, 'hex') }))
    .setTimeout(30)
    .build();

  sim = await sorobanServer.simulateTransaction(tx);
  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, sim).build();
  tx.sign(adminPair);
  res = await sorobanServer.sendTransaction(tx);
  await pollTx(res.hash);
  const trackerContractId = StellarSdk.Address.fromScAddress(StellarSdk.xdr.ScVal.fromXDR((sim as any).result.retval.toXDR())).toString();
  console.log('Tracker Contract ID:', trackerContractId);

  // 5. Initialize Reward Token
  console.log('Initializing reward token...');
  account = await server.loadAccount(adminPair.publicKey());
  tx = new StellarSdk.TransactionBuilder(account, { fee: '10000', networkPassphrase: network })
    .addOperation(new StellarSdk.Contract(rewardContractId).call("initialize", StellarSdk.nativeToScVal(trackerContractId, {type: 'address'})))
    .setTimeout(30)
    .build();
  sim = await sorobanServer.simulateTransaction(tx);
  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, sim).build();
  tx.sign(adminPair);
  res = await sorobanServer.sendTransaction(tx);
  await pollTx(res.hash);
  console.log('Reward token initialized');

  // 6. Initialize Tracker Contract
  console.log('Initializing tracker contract...');
  account = await server.loadAccount(adminPair.publicKey());
  tx = new StellarSdk.TransactionBuilder(account, { fee: '10000', networkPassphrase: network })
    .addOperation(new StellarSdk.Contract(trackerContractId).call("initialize", StellarSdk.nativeToScVal(adminPair.publicKey(), {type: 'address'}), StellarSdk.nativeToScVal(rewardContractId, {type: 'address'})))
    .setTimeout(30)
    .build();
  sim = await sorobanServer.simulateTransaction(tx);
  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, sim).build();
  tx.sign(adminPair);
  res = await sorobanServer.sendTransaction(tx);
  await pollTx(res.hash);
  console.log('Tracker initialized');
  console.log('\nSUCCESS! UPDATE CONSTANTS.TS WITH:');
  console.log(`export const SWAP_TRACKER_CONTRACT_ID = '${trackerContractId}';`);
  console.log(`export const REWARD_TOKEN_CONTRACT_ID = '${rewardContractId}';`);
}

async function pollTx(hash: string) {
  for (let i=0; i<10; i++) {
    try {
      const resp = await axios.post('https://soroban-testnet.stellar.org', {
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: { hash }
      });
      const res = resp.data.result;
      if (res && res.status === 'SUCCESS') return res;
      if (res && res.status === 'FAILED') throw new Error('Transaction failed: ' + JSON.stringify(res));
    } catch(e) {
      // ignore parsing errors locally and just keep polling via naive requests
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

deploy().catch(console.error);
