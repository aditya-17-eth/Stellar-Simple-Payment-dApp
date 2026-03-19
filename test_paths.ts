import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

async function testPaths() {
  const xlm = StellarSdk.Asset.native();
  const usdc = new StellarSdk.Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

  console.log('--- Path Payment: 500 XLM -> USDC ---');
  try {
    const pathsXlmUsdc = await server.strictSendPaths(xlm, '500', [usdc]).call();
    console.log(`Sending 500 XLM...`);
    if (pathsXlmUsdc.records.length > 0) {
      console.log(`Best path destination amount: ${pathsXlmUsdc.records[0].destination_amount} USDC`);
    } else {
      console.log('No paths found');
    }
  } catch (err) {
    console.error(err);
  }

  console.log('\n--- Path Payment: 54 USDC -> XLM ---');
  try {
    const pathsUsdcXlm = await server.strictSendPaths(usdc, '54', [xlm]).call();
    console.log(`Sending 54 USDC...`);
    if (pathsUsdcXlm.records.length > 0) {
      console.log(`Best path destination amount: ${pathsUsdcXlm.records[0].destination_amount} XLM`);
    } else {
      console.log('No paths found');
    }
  } catch (err) {
    console.error(err);
  }
}

testPaths().catch(console.error);
