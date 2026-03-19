import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

async function testPaths() {
  const xlm = StellarSdk.Asset.native();
  const usdc = new StellarSdk.Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

  console.log('--- Path Payment: 50 XLM -> USDC ---');
  try {
    const pathsXlmUsdc = await server.strictSendPaths(xlm, '50', [usdc]).call();
    if (pathsXlmUsdc.records.length > 0) {
      console.log(`Best path destination amount: ${pathsXlmUsdc.records[0].destination_amount} USDC`);
    } else {
      console.log('No paths found');
    }
  } catch (err) {
    console.error(err);
  }
}

testPaths().catch(console.error);
