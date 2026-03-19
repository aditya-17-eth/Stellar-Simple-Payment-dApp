import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

async function test() {
  const xlm = StellarSdk.Asset.native();
  const usdc = new StellarSdk.Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

  console.log('--- XLM to USDC ---');
  const ob1 = await server.orderbook(xlm, usdc).limit(2).call();
  console.log('Bids (Offers to buy XLM with USDC)', ob1.bids);
  console.log('Asks (Offers to sell XLM for USDC)', ob1.asks);

  console.log('\n--- USDC to XLM ---');
  const ob2 = await server.orderbook(usdc, xlm).limit(2).call();
  console.log('Bids (Offers to buy USDC with XLM)', ob2.bids);
  console.log('Asks (Offers to sell USDC for XLM)', ob2.asks);
}

test().catch(console.error);
