# Stellar Payment dApp

A simple, elegant dApp for sending XLM payments on the Stellar TESTNET. Built with React, TypeScript, and the Freighter wallet.

![Stellar Payment dApp](<img width="1903" height="897" alt="image" src="https://github.com/user-attachments/assets/f1c2db58-7808-4b54-9095-0d7f68ba4209" />
)

## ✨ Features

- **Wallet Connection**: Seamlessly connect your Freighter wallet
- **Balance Display**: View your XLM balance in real-time
- **Send Payments**: Send XLM to any Stellar address
- **Transaction Feedback**: Get instant success/error notifications with transaction hashes
- **Beautiful UI**: Modern, dark-themed interface with smooth animations

## 🛠 Tech Stack

| Technology                                               | Purpose                |
| -------------------------------------------------------- | ---------------------- |
| [React](https://react.dev/)                              | UI Framework           |
| [TypeScript](https://www.typescriptlang.org/)            | Type Safety            |
| [Vite](https://vitejs.dev/)                              | Build Tool             |
| [Tailwind CSS](https://tailwindcss.com/)                 | Styling                |
| [Stellar SDK](https://github.com/stellar/js-stellar-sdk) | Blockchain Integration |
| [Freighter API](https://docs.freighter.app/)             | Wallet Connection      |

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **Freighter Wallet** browser extension - [Install](https://www.freighter.app/)
3. A **funded TESTNET account** - [Create one here](https://laboratory.stellar.org/#account-creator?network=test)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <https://github.com/aditya-17-eth/Stellar-Simple-Payment-dApp>
cd stellar-payment-dapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Open in browser

Navigate to `http://localhost:5173` in your browser.

### 5. Configure Freighter

1. Open Freighter extension
2. Go to Settings → Network
3. Select **TESTNET**
4. Fund your account using [Friendbot](https://laboratory.stellar.org/#account-creator?network=test)

## 📁 Project Structure

```
stellar-payment-dapp/
├── public/
│   └── stellar-logo.svg        # App favicon
├── src/
│   ├── components/
│   │   ├── WalletConnect.tsx   # Wallet connection UI
│   │   ├── Balance.tsx         # XLM balance display
│   │   └── SendPayment.tsx     # Payment form & submission
│   ├── hooks/
│   │   └── useWallet.ts        # Wallet state management
│   ├── utils/
│   │   ├── stellar.ts          # Stellar SDK utilities
│   │   └── constants.ts        # Network configuration
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔑 Key Components

### `useWallet` Hook

Manages Freighter wallet connection state, including:

- Detecting if Freighter is installed
- Connecting and disconnecting
- Verifying TESTNET network
- Error handling

### `stellar.ts` Utilities

Core functions for Stellar blockchain interaction:

- `fetchBalance()` - Gets XLM balance from Horizon
- `sendPayment()` - Builds, signs, and submits transactions
- `isValidStellarAddress()` - Validates Stellar public keys

### `SendPayment` Component

Handles the complete payment flow:

- Form validation (address format, sufficient balance)
- Transaction building and signing
- Success/error state management
- Transaction hash display with explorer link

## ⚠️ Important Notes

- This dApp is configured for **TESTNET only** - no real funds are involved
- Minimum 1 XLM is required to keep an account active on Stellar
- Sending to a new account requires at least 1 XLM (to fund the account)
- Always keep at least 1 XLM in your account as a reserve

## 🔧 Available Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Resources

- [Stellar Documentation](https://developers.stellar.org/docs)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [Stellar Expert Explorer](https://stellar.expert/)
- [Freighter Wallet Docs](https://docs.freighter.app/)

---

Built with ❤️ for the Stellar ecosystem
