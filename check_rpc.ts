import axios from 'axios';

const trackerId = 'CCVIDKEQU7UIXA24WZSFP3HDESQ4JZVEZUHHOKBD42KHILQPUI7EANK5';
const rpcUrl = 'https://soroban-testnet.stellar.org';

async function check() {
  try {
    const resp = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "getEvents",
      params: {
        startLedger: 1550000,
        filters: [{
          type: "contract",
          contractIds: [trackerId]
        }],
        limit: 10
      }
    });

    console.log('Full RPC Response:', JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error('Network Error:', err);
  }
}

check();
