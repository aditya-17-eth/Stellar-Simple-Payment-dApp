import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

async function testOb() {
  const xlm = StellarSdk.Asset.native();
  const usdc = new StellarSdk.Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

  const ob1 = await server.orderbook(xlm, usdc).limit(1).call();
  console.log('--- XLM to USDC ---');
  console.log('Bids (Offers to buy XLM):', ob1.bids[0]);
  console.log('Asks (Offers to sell XLM):', ob1.asks[0]);

  const ob2 = await server.orderbook(usdc, xlm).limit(1).call();
  console.log('\n--- USDC to XLM ---');
  console.log('Bids (Offers to buy USDC):', ob2.bids[0]);
  console.log('Asks (Offers to sell USDC):', ob2.asks[0]);
}

testOb().catch(console.error);
