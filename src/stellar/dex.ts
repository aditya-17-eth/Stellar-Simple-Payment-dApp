import * as StellarSdk from '@stellar/stellar-sdk';
import { HORIZON_URL, NETWORK_PASSPHRASE, AssetConfig } from '../utils/constants';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Converts an AssetConfig to a Stellar SDK Asset.
 */
export function toStellarAsset(config: AssetConfig): StellarSdk.Asset {
  if (!config.issuer) {
    return StellarSdk.Asset.native();
  }
  return new StellarSdk.Asset(config.code, config.issuer);
}

/**
 * Orderbook summary returned to the UI.
 */
export interface OrderbookSummary {
  bestAskPrice: string;  // best price to buy (lowest ask)
  bestBidPrice: string;  // best price to sell (highest bid)
  askDepth: number;       // number of ask orders
  bidDepth: number;       // number of bid orders
  estimatedReceive: string; // estimated amount received for a given input
}

/**
 * Fetches the orderbook for a trading pair from Horizon.
 */
export async function fetchOrderbook(
  sellingAsset: AssetConfig,
  buyingAsset: AssetConfig
): Promise<OrderbookSummary> {
  const selling = toStellarAsset(sellingAsset);
  const buying = toStellarAsset(buyingAsset);

  const orderbook = await server
    .orderbook(selling, buying)
    .limit(20)
    .call();

  const bestAskPrice = orderbook.asks.length > 0 ? orderbook.asks[0].price : '0';
  const bestBidPrice = orderbook.bids.length > 0 ? orderbook.bids[0].price : '0';

  return {
    bestAskPrice,
    bestBidPrice,
    askDepth: orderbook.asks.length,
    bidDepth: orderbook.bids.length,
    estimatedReceive: '0',
  };
}

/**
 * Estimates the amount received when selling `amount` of the selling asset.
 * Walks through the orderbook bids to simulate the fill.
 */
export async function estimateSwapReceive(
  sellingAsset: AssetConfig,
  buyingAsset: AssetConfig,
  sellAmount: string
): Promise<string> {
  const selling = toStellarAsset(sellingAsset);
  const buying = toStellarAsset(buyingAsset);

  const orderbook = await server
    .orderbook(selling, buying)
    .limit(50)
    .call();

  let remaining = parseFloat(sellAmount);
  let totalReceived = 0;

  // Walk through the bids (people wanting to buy our selling asset)
  for (const bid of orderbook.bids) {
    if (remaining <= 0) break;

    const bidPrice = parseFloat(bid.price); // price in terms of selling asset per buying asset
    const bidAmount = parseFloat(bid.amount); // amount of selling asset they want to buy

    const fillAmount = Math.min(remaining, bidAmount);
    // We sell `fillAmount` of selling asset and receive fillAmount * bidPrice of buying asset
    totalReceived += fillAmount * bidPrice;
    remaining -= fillAmount;
  }

  return totalReceived.toFixed(7);
}

/**
 * Executes a swap using manageSellOffer with offerId 0 (one-time fill).
 *
 * @param sourcePublicKey - The sender's public key
 * @param sellingAsset - Asset being sold
 * @param buyingAsset - Asset being bought
 * @param sellAmount - Amount of selling asset to sell
 * @param minPrice - Minimum price (buying/selling ratio) to accept
 * @param signTx - Function to sign the transaction XDR
 * @returns Transaction hash on success
 */
export async function executeSwap(
  sourcePublicKey: string,
  sellingAsset: AssetConfig,
  buyingAsset: AssetConfig,
  sellAmount: string,
  minPrice: string,
  signTx: (xdr: string) => Promise<string>
): Promise<{ hash: string }> {
  const sourceAccount = await server.loadAccount(sourcePublicKey);

  const selling = toStellarAsset(sellingAsset);
  const buying = toStellarAsset(buyingAsset);

  // Build a manageSellOffer with offerId = 0 (creates a new one-time offer)
  // The price is "1 unit of selling in terms of buying"
  const priceValue = parseFloat(minPrice);
  if (priceValue <= 0) {
    throw new Error('Invalid price for swap');
  }

  // We need to ensure a trustline exists for non-native assets
  const operations: StellarSdk.xdr.Operation[] = [];

  // Check if we need to add a trustline for the buying asset
  if (buyingAsset.issuer) {
    const hasTrustline = sourceAccount.balances.some((bal) => {
      if (bal.asset_type === 'credit_alphanum4' || bal.asset_type === 'credit_alphanum12') {
        const creditBal = bal as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
        return creditBal.asset_code === buyingAsset.code && creditBal.asset_issuer === buyingAsset.issuer;
      }
      return false;
    });

    if (!hasTrustline) {
      operations.push(
        StellarSdk.Operation.changeTrust({
          asset: buying,
        }).toXDR() as unknown as StellarSdk.xdr.Operation
      );
    }
  }

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Add trustline operation if needed
  if (buyingAsset.issuer) {
    const hasTrustline = sourceAccount.balances.some((bal) => {
      if (bal.asset_type === 'credit_alphanum4' || bal.asset_type === 'credit_alphanum12') {
        const creditBal = bal as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
        return creditBal.asset_code === buyingAsset.code && creditBal.asset_issuer === buyingAsset.issuer;
      }
      return false;
    });

    if (!hasTrustline) {
      txBuilder.addOperation(
        StellarSdk.Operation.changeTrust({
          asset: buying,
        })
      );
    }
  }

  // Add the manageSellOffer operation
  txBuilder.addOperation(
    StellarSdk.Operation.manageSellOffer({
      selling,
      buying,
      amount: sellAmount,
      price: minPrice,
      offerId: 0, // 0 = create a new one-time offer
    })
  );

  const transaction = txBuilder
    .setTimeout(180)
    .build();

  // Sign using the provided signing function (from StellarWalletsKit)
  const signedXDR = await signTx(transaction.toXDR());

  // Submit to the network
  const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXDR,
    NETWORK_PASSPHRASE
  );

  const result = await server.submitTransaction(signedTransaction);
  return { hash: result.hash };
}
