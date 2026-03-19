import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const network = StellarSdk.Networks.TESTNET;

async function fundAndProvideLiquidity() {
  const rootPair = StellarSdk.Keypair.random();
  console.log('Creating account...', rootPair.publicKey());
  await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(rootPair.publicKey())}`);
  
  const account = await server.loadAccount(rootPair.publicKey());
  const xlm = StellarSdk.Asset.native();
  const usdc = new StellarSdk.Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
  
  const tx = new StellarSdk.TransactionBuilder(account, { fee: '10000', networkPassphrase: network })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: usdc }))
    .addOperation(StellarSdk.Operation.manageSellOffer({
      selling: xlm,
      buying: usdc,
      amount: '5000', // sell 5000 XLM
      price: '0.10805', // slightly above 0.108 to avoid matching with existing bids
    }))
    .setTimeout(30)
    .build();
  tx.sign(rootPair);
  try {
    await server.submitTransaction(tx);
    console.log('Placed order to sell XLM for USDC. Done!');
  } catch (err) {
    if (err.response && err.response.data) {
        console.error(err.response.data.extras.result_codes);
    } else {
        console.error(err);
    }
  }
}

fundAndProvideLiquidity().catch(console.error);
