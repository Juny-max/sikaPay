# SikaPay

Premium Ethereum payments for Ghanaian merchants.

SikaPay lets a merchant create a Ghana Cedi invoice, share a QR/payment link, and accept ETH or Sepolia USDC while the merchant sees a familiar Mobile Money-style settlement record. Customers do not need accounts; merchants get a protected workspace for invoices, transactions, settings, and settlement details.

> Built for an Ethereum hackathon MVP. The app runs with real Supabase authentication, a deployed Sepolia contract, RPC payment verification, and a hosted React + Express stack.

## What SikaPay does

- Merchant sign up/sign in with Supabase Auth
- Merchant onboarding and settings
- Protected merchant dashboard
- Create onchain payment requests
- Generate QR codes and public payment links
- Customer wallet connection with RainbowKit, wagmi, viem, and Reown/WalletConnect
- ETH and Sepolia USDC payment flow
- Backend verification of Sepolia payment events
- Automatic invoice/payment status updates
- Mobile-friendly merchant workspace and payment screens
- Transaction receipt pages for customer and merchant confirmation

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router |
| UI and motion | Motion, GSAP, Lucide React |
| Wallet UX | RainbowKit, wagmi, viem, Reown AppKit / WalletConnect |
| Backend | Node.js, Express, TypeScript, Zod, Helmet, CORS |
| Database/Auth | Supabase Auth and Supabase Postgres |
| Blockchain | Ethereum Sepolia, Solidity, Hardhat, ethers, viem |
| Hosting | Vercel for frontend, Render for backend |
| Package manager | pnpm workspace |

## Project structure

```txt
sikaPay/
├── src/                 # React frontend
├── public/              # Static assets, favicon, logo
├── server/              # Express API, Supabase store, contract services
├── render.yaml          # Render backend hosting config
├── vercel.json          # Vercel frontend hosting config
├── pnpm-workspace.yaml  # Frontend + backend workspace
└── LICENSE              # Proprietary license
```

## Main routes

### Public customer routes

- `/` — landing page
- `/pay` — payment entry page
- `/pay/:invoiceId` — customer invoice payment page
- `/transaction/:transactionId` — payment receipt

### Merchant routes

- `/merchant/signup`
- `/merchant/signin`
- `/merchant/forgot-password`
- `/merchant/onboarding`
- `/merchant`
- `/merchant/create-invoice`
- `/merchant/invoice/:invoiceId`
- `/merchant/transactions`
- `/merchant/settings`

## Local development

Requirements:

- Node.js 22 recommended
- Corepack
- pnpm
- Supabase project
- Reown project ID
- Sepolia RPC URL
- Deployed SikaPay contract address

Install dependencies:

```bash
corepack pnpm install
```

Create environment files:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Start the backend and frontend in separate terminals:

```bash
corepack pnpm dev:api
corepack pnpm dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

## Environment variables

### Frontend `.env`

Only browser-safe values should live in the root `.env`.

```env
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_CHAIN_ID=11155111
VITE_SIKAPAY_CONTRACT_ADDRESS=
VITE_USDC_CONTRACT_ADDRESS=
VITE_WALLETCONNECT_PROJECT_ID=
VITE_ENABLE_MOCK_MODE=false
```

Leave `VITE_API_URL` empty for local development so Vite proxies `/api` and `/health` to the backend on port `4000`.

For Vercel production, set:

```env
VITE_API_URL=https://your-render-api.onrender.com
```

### Backend `server/.env`

Server secrets belong only in `server/.env` or in Render environment variables.

```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
PAYMENT_MODE=rpc
GHS_PER_ETH=65000
GHS_PER_USDC=15.50

SEPOLIA_RPC_URL=
SIKAPAY_CONTRACT_ADDRESS=
SEPOLIA_PRIVATE_KEY=
SETTLEMENT_WALLET=
USDC_CONTRACT_ADDRESS=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Never put these in the frontend or prefix them with `VITE_`:

- `SEPOLIA_PRIVATE_KEY`
- `SUPABASE_SECRET_KEY`
- private RPC keys you do not want public

Anything beginning with `VITE_` is bundled into the browser and can be inspected by users.

## Supabase setup

1. Create or open the Supabase project.
2. Run the SQL migration in `server/supabase/migrations/202608040001_initial_schema.sql`.
3. Add local and production frontend URLs in Supabase Auth settings:
   - `http://localhost:5173`
   - `https://your-vercel-app.vercel.app`
4. Copy the Supabase URL, publishable key, and secret/service role key into the correct frontend/backend environments.

The frontend uses the publishable key for merchant auth. The backend uses the secret key to validate user sessions and read/write merchant data safely.

## Reown / WalletConnect setup

SikaPay uses RainbowKit/wagmi with a Reown project ID for WalletConnect support, especially mobile wallets.

Create a project at:

https://dashboard.reown.com

Then set the project ID in the frontend environment:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_reown_project_id
```

In Reown, allowlist the origins used by the app:

- `http://localhost:5173`
- `https://your-vercel-app.vercel.app`
- any Codespaces preview URL you actively use for testing

Reown's docs note that the project ID is obtained from `dashboard.reown.com`, and they recommend using an origin allowlist for safer wallet connections.

## Payment flow

1. Merchant signs in and creates an invoice in Ghana Cedis.
2. Backend creates and stores the invoice, including its onchain reference.
3. Customer opens the invoice link or scans the QR code.
4. Customer connects a Sepolia wallet.
5. For ETH, the customer calls `payInvoice` with Sepolia ETH.
6. For USDC, the customer approves USDC first, then calls `payInvoice`.
7. Frontend waits for the wallet transaction receipt.
8. Backend verifies the Sepolia event in `PAYMENT_MODE=rpc`.
9. Invoice becomes completed and the merchant dashboard updates.

The UI does not mark a payment successful just because MetaMask says “confirmed”. The backend verifies the blockchain transaction before storing the payment.

## Deployment

Recommended setup:

- Vercel: React/Vite frontend
- Render: Express backend
- Supabase: auth and database
- Reown: wallet connection project ID
- Sepolia RPC provider: blockchain reads/writes

### Render backend

Create a Render Web Service from the repository root. `render.yaml` contains the expected service config.

Build command:

```bash
pnpm install --frozen-lockfile && pnpm --filter sikapay-backend build
```

Start command:

```bash
pnpm --filter sikapay-backend start
```

Important Render environment variables:

```env
NODE_VERSION=22
NODE_ENV=production
HOST=0.0.0.0
PAYMENT_MODE=rpc
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
GHS_PER_ETH=65000
GHS_PER_USDC=15.50
SEPOLIA_RPC_URL=
SIKAPAY_CONTRACT_ADDRESS=
SEPOLIA_PRIVATE_KEY=
SETTLEMENT_WALLET=
USDC_CONTRACT_ADDRESS=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Do not manually set `PORT` on Render unless Render asks. Render provides the port automatically.

Health check:

```txt
https://your-render-api.onrender.com/health
```

On Render's free tier, open `/health` before a demo to wake the service.

### Vercel frontend

Create a Vercel project from the repository root.

Vercel settings:

- Framework: Vite
- Root directory: leave blank
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`

Important Vercel environment variables:

```env
VITE_API_URL=https://your-render-api.onrender.com
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_CHAIN_ID=11155111
VITE_SIKAPAY_CONTRACT_ADDRESS=
VITE_USDC_CONTRACT_ADDRESS=
VITE_WALLETCONNECT_PROJECT_ID=
VITE_ENABLE_MOCK_MODE=false
```

After Vercel deploys, add the Vercel URL to:

- Render `FRONTEND_ORIGIN`
- Supabase Auth Site URL / Redirect URLs
- Reown allowlist

## Useful commands

```bash
# Frontend
corepack pnpm dev
corepack pnpm build
corepack pnpm preview

# Backend
corepack pnpm dev:api
corepack pnpm build:api
corepack pnpm test:api

# Contract workspace
corepack pnpm --filter sikapay-backend contract:compile
corepack pnpm --filter sikapay-backend contract:test
```

## Main API routes

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/health` | Public |
| `GET` | `/api/me` | Merchant token |
| `PUT` | `/api/merchants/me` | Merchant token |
| `POST` | `/api/invoices` | Merchant token |
| `GET` | `/api/invoices` | Merchant token |
| `GET` | `/api/invoices/:reference` | Public |
| `POST` | `/api/payments/quote` | Public |
| `POST` | `/api/payments` | Public, chain-verified in RPC mode |
| `POST` | `/api/payments/reconcile` | Public |
| `GET` | `/api/payments/:id` | Public |
| `GET` | `/api/payments` | Merchant token |

See [`server/README.md`](server/README.md) for deeper backend, Supabase, and contract notes.

## Security notes

- `.env` and `server/.env` are ignored by Git.
- Rotate any key that appears in chat, screenshots, logs, issues, or commits.
- Use a dedicated Sepolia deployer/settlement wallet.
- Keep backend secrets on Render only.
- Keep Vercel env vars limited to public `VITE_` values.
- Use Supabase Row Level Security and backend token validation for production hardening.

## License

SikaPay is proprietary software. The repository may be public for review, collaboration, or hackathon judging, but the code, product design, brand, business logic, and smart contract flow are not open-source.

See the full license here: [LICENSE](LICENSE).

## Visual asset credit

The Ethereum mark is the official project mark sourced from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ETHEREUM-YOUTUBE-PROFILE-PIC.png) under CC BY 3.0. The market photograph is by Jakub Zerdzicki from [Pexels](https://www.pexels.com/photo/ethereum-coin-and-stock-market-graph-interaction-31220975/).
