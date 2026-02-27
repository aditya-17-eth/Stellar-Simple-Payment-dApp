# StellarSwap

A production-style token swap interface built on Stellar's native DEX orderbook. Swap assets, track transactions, and view real-time swap activity — all powered by the Stellar network and Soroban smart contracts.

![StellarSwap]

## ✨ Features

- **Token Swapping** — Swap XLM, USDC, SRT, and other assets using Stellar's built-in decentralized orderbook (`manageSellOffer`)
- **Multi-Wallet Support** — Connect with Freighter, xBull, or other Stellar-compatible wallets
- **Live Price Preview** — Real-time orderbook pricing with estimated receive amounts before you swap
- **Transaction Lifecycle** — Full pending → success → failed tracking with explorer links
- **On-Chain Activity Tracking** — Soroban smart contract records swap metadata and emits events
- **Real-Time Feed** — Live swap activity feed that updates without page refresh
- **XLM Payments** — Send XLM to any Stellar address (preserved from v1)
- **Balance Display** — View your XLM balance in real-time

## 🔗 Supported Wallets

| Wallet                             | Status       |
| ---------------------------------- | ------------ |
| [Freighter](https://freighter.app) | ✅ Supported |
| [xBull](https://xbull.app)         | ✅ Supported |

## 🛠 Tech Stack

| Technology                                                              | Purpose                       |
| ----------------------------------------------------------------------- | ----------------------------- |
| [React](https://react.dev/)                                             | UI Framework                  |
| [TypeScript](https://www.typescriptlang.org/)                           | Type Safety                   |
| [Vite](https://vitejs.dev/)                                             | Build Tool                    |
| [Tailwind CSS](https://tailwindcss.com/)                                | Styling                       |
| [Stellar SDK](https://github.com/stellar/js-stellar-sdk)                | Blockchain + DEX Integration  |
| [StellarWalletsKit](https://github.com/nicecoder97/stellar-wallets-kit) | Multi-Wallet Management       |
| [Soroban](https://soroban.stellar.org/)                                 | Smart Contract (Swap Tracker) |

## 📋 Prerequisites

1. **Node.js** v18+ — [Download](https://nodejs.org/)
2. **Stellar Wallet** browser extension:
   - [Freighter](https://freighter.app) (recommended)
   - [xBull](https://xbull.app) (alternative)
3. **Funded TESTNET account** — [Create via Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
4. _(Optional)_ **Rust + Stellar CLI** — for building/deploying the Soroban contract

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone <https://github.com/aditya-17-eth/Stellar-Simple-Payment-dApp>
cd stellar-swap
npm install
```

### 2. Start development server

```bash
npm run dev
```

### 3. Open in browser

Navigate to `http://localhost:5173`

### 4. Configure your wallet

1. Open your Stellar wallet extension
2. Switch to **TESTNET**
3. Fund your account using [Friendbot](https://laboratory.stellar.org/#account-creator?network=test)

## 📁 Project Structure

```
stellar-swap/
├── contracts/
│   └── swap_tracker/          # Soroban smart contract (Rust)
│       ├── Cargo.toml
│       └── src/lib.rs
├── src/
│   ├── wallet/
│   │   └── walletKit.ts       # StellarWalletsKit initialization
│   ├── stellar/
│   │   └── dex.ts             # Horizon DEX orderbook + swap execution
│   ├── contract/
│   │   └── sorobanClient.ts   # Soroban contract interaction
│   ├── components/
│   │   ├── SwapForm.tsx       # Token swap form + price preview
│   │   ├── SwapActivityFeed.tsx # Real-time swap activity
│   │   ├── WalletSelector.tsx # Multi-wallet selector modal
│   │   ├── TransactionStatus.tsx # Tx lifecycle display
│   │   ├── WalletConnect.tsx  # Wallet connection UI
│   │   ├── Balance.tsx        # XLM balance display
│   │   └── SendPayment.tsx    # XLM payment form
│   ├── hooks/
│   │   └── useWallet.ts       # Wallet state management
│   ├── utils/
│   │   ├── stellar.ts         # Stellar SDK utilities
│   │   └── constants.ts       # Network config + asset definitions
│   ├── App.tsx                # Main application
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔧 Soroban Contract

The **Swap Tracker** contract is a Soroban smart contract that records swap metadata on-chain and emits events for real-time tracking.

### Contract Functions

| Function                                                     | Description                            |
| ------------------------------------------------------------ | -------------------------------------- |
| `record_swap(user, from_asset, to_asset, amount, timestamp)` | Stores swap record + emits event       |
| `get_recent_swaps(count)`                                    | Returns the last N swap records        |
| `get_swap_count()`                                           | Returns total number of recorded swaps |

### Deployed Contract

- **Network**: Stellar TESTNET
- **Contract Address**: `PLACEHOLDER_CONTRACT_ID` _(update after deployment)_

### Building the Contract

```bash
cd contracts/swap_tracker
cargo build --target wasm32-unknown-unknown --release
```

### Deploying the Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/swap_tracker.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>
```

After deployment, update `SWAP_TRACKER_CONTRACT_ID` in `src/utils/constants.ts`.

## 🔄 How Swaps Work

1. User selects **sell** and **buy** assets (e.g., XLM → USDC)
2. App fetches **live orderbook data** from Horizon
3. User sees **estimated receive amount** and best available price
4. User clicks **Swap** → transaction built with `manageSellOffer` (offerId: 0)
5. Wallet prompts for **signature approval**
6. Transaction submitted to **Stellar TESTNET**
7. On success: swap metadata recorded in **Soroban contract**
8. Activity feed updates in **real-time** via event polling

## 📝 Example Transaction

- **Transaction Hash**: _(add after first successful swap)_
- **View on Explorer**: [Stellar Expert (TESTNET)](https://stellar.expert/explorer/testnet)

## 🔧 Available Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

## ⚠️ Important Notes

- This application is configured for **TESTNET only** — no real funds are at risk
- Swaps use Stellar's **native DEX orderbook** (not AMMs or liquidity pools)
- The Soroban contract is used **only for activity tracking**, not for executing swaps
- Always maintain at least **1 XLM** in your account as the Stellar minimum balance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Resources

- [Stellar Documentation](https://developers.stellar.org/docs)
- [Soroban Documentation](https://soroban.stellar.org/)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [Stellar Expert Explorer](https://stellar.expert/)
- [Freighter Wallet Docs](https://docs.freighter.app/)

---

Built with ❤️ for the Stellar ecosystem
