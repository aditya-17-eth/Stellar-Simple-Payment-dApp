// Stellar TESTNET network passphrase
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Horizon API endpoint for TESTNET
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';

// Soroban RPC endpoint for TESTNET
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// Stellar Expert explorer URL for TESTNET
export const STELLAR_EXPERT_URL = 'https://stellar.expert/explorer/testnet';

// Friendbot URL for funding test accounts
export const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// Deployed Soroban swap tracker contract address (TESTNET)
// Update this after contract deployment
export const SWAP_TRACKER_CONTRACT_ID = 'PLACEHOLDER_CONTRACT_ID';

// Supported assets for token swaps
export interface AssetConfig {
  code: string;
  issuer?: string; // undefined = native XLM
  name: string;
  decimals: number;
}

export const SUPPORTED_ASSETS: AssetConfig[] = [
  {
    code: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
  },
  {
    code: 'USDC',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    name: 'USD Coin (Testnet)',
    decimals: 7,
  },
  {
    code: 'SRT',
    issuer: 'GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B',
    name: 'Stellar Reference Token',
    decimals: 7,
  },
];
