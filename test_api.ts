import axios from 'axios';

async function run() {
  const urlXlmUsdc = 'https://horizon-testnet.stellar.org/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const res1 = await axios.get(urlXlmUsdc);
  console.log('--- XLM to USDC ---');
  console.log('Bids[0]:', res1.data.bids[0]);
  console.log('Asks[0]:', res1.data.asks[0]);

  const urlUsdcXlm = 'https://horizon-testnet.stellar.org/order_book?selling_asset_type=credit_alphanum4&selling_asset_code=USDC&selling_asset_issuer=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5&buying_asset_type=native';
  const res2 = await axios.get(urlUsdcXlm);
  console.log('\n--- USDC to XLM ---');
  console.log('Bids[0]:', res2.data.bids[0]);
  console.log('Asks[0]:', res2.data.asks[0]);
}

run().catch(console.error);
