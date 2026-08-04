# SikaPay

**Global Crypto. Local Payments.**

SikaPay is an Ethereum-to-Mobile Money payment bridge designed for Ghana. Customers pay an invoice with ETH or USDC; after on-chain confirmation, the merchant receives the Ghana Cedi equivalent through Mobile Money. The Vite frontend lives at the repository root and the Express/Hardhat backend lives in `server/`.

## Stack

React, Vite, TypeScript, Tailwind CSS, React Router, wagmi, viem, RainbowKit, TanStack Query, react-qr-code, html5-qrcode, and Lucide.

## Run locally

```bash
pnpm install
pnpm --dir server install
cp .env.example .env
pnpm dev
```

Start the API in a second terminal:

```bash
pnpm dev:server
```

The application runs at `http://localhost:5173` and the API at `http://localhost:4000`. See `server/README.md` for contract deployment and backend API details.

## Environment

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_CHAIN_ID=11155111
VITE_SIKAPAY_CONTRACT_ADDRESS=
VITE_USDC_TOKEN_ADDRESS=
VITE_WALLETCONNECT_PROJECT_ID=
VITE_ENABLE_MOCK_MODE=true
```

Never put private keys, payout-provider secrets, or server API keys in these variables. Browser variables prefixed with `VITE_` are public. A WalletConnect project ID is optional for the resilient mock demo, but should be set for production wallet connections.

## Demo flow

1. Open **Merchant dashboard**, then create a GH₵ invoice.
2. Share or scan its generated QR code, or use **Load demo invoice** on `/pay`.
3. Select ETH or USDC. Connect a Sepolia wallet, or continue without one in mock mode.
4. Confirm payment and watch blockchain confirmation, bridge processing, and Mobile Money payout complete in about eight seconds.
5. Return to the merchant dashboard to see the persisted payment.

Mock invoices and new payments are stored in browser `localStorage`; seeded merchant activity remains available after refresh. The UI does not label this as fake so it remains presentation-ready. For this hackathon, the Mobile Money payout adapter and blockchain timing are simulated. No actual funds move in mock mode.

## Backend API contract

Set `VITE_ENABLE_MOCK_MODE=false` to use the REST service at `VITE_API_BASE_URL`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/invoices` | Create an invoice |
| GET | `/invoices/:invoiceId` | Fetch an invoice |
| GET | `/merchants/:merchantId/payments` | Merchant payment history |
| POST | `/payments/prepare` | Lock quote and prepare transaction |
| POST | `/payments/confirm` | Submit transaction hash |
| GET | `/payments/:transactionId` | Poll payment and payout status |

The typed response models live in `src/types`; the isolated REST layer lives in `src/api`. Payment status polling uses a three-second interval against a live backend.

## Smart-contract integration notes

Sepolia (`11155111`) is the default chain. In live mode, the API’s `prepare` response supplies the exact recipient and crypto amount. The frontend submits a real native ETH transfer or ERC-20 USDC `transfer` through the connected wallet, waits for a successful Sepolia receipt, and sends the resulting transaction hash to `/payments/confirm`. Contract and USDC addresses come only from environment configuration. The server must independently validate invoice amount, chain ID, recipient, receipt confirmations, token transfer logs, replay protection, and invoice state before initiating a payout. If the deployed SikaPay contract requires a custom payment method instead of direct transfers, replace these two wallet calls with that contract ABI while keeping the same prepare/confirm lifecycle.

The merchant is always presented with a GHS/Mobile Money settlement; crypto is customer-side tender only.

## Visual asset credit

The Ethereum diamond used on the landing page is the official Ethereum project mark, sourced from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ETHEREUM-YOUTUBE-PROFILE-PIC.png) under CC BY 3.0. The Ethereum market photograph is by Jakub Zerdzicki, sourced from [Pexels](https://www.pexels.com/photo/ethereum-coin-and-stock-market-graph-interaction-31220975/). Scroll-linked interface motion is implemented with Motion for React and respects the operating system’s reduced-motion preference.
