# SikaPay

SikaPay is an Ethereum-to-Mobile Money payment bridge for Ghana. Merchants authenticate with Supabase, create GHS invoices, and receive a Mobile Money settlement record after customers pay the invoice contract with ETH or USDC on Sepolia.

This pnpm workspace contains the React frontend at the repository root and the Express API in `server/`.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, RainbowKit, wagmi, viem, ethers, Motion, and GSAP
- Backend: Express, TypeScript, Supabase Auth/Postgres, ethers, and Solidity/Hardhat
- Network: Ethereum Sepolia with ETH and Sepolia USDC

## Local setup

Requirements: Node.js 20+ and Corepack.

```bash
corepack pnpm install
cp .env.example .env
cp server/.env.example server/.env
```

Fill in both environment files, then start the API and frontend in separate terminals:

```bash
corepack pnpm dev:api
corepack pnpm dev
```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:4000`.

Before signing up, apply `server/supabase/migrations/202608040001_initial_schema.sql` in the Supabase SQL editor. Add `http://localhost:5173` as an allowed Site URL/redirect URL in Supabase Auth.

## Environment and security

The root `.env` contains only browser-safe configuration:

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

Server secrets belong only in `server/.env` (the backend also supports the existing root `.env` during local development). Never prefix a private key, Supabase secret key, or RPC secret with `VITE_`; all Vite variables are public in the browser bundle. Both `.env` files are ignored by Git.

If credentials are ever pasted into chat, logs, issues, or commits, rotate them before running the application. Use a dedicated, minimally funded Sepolia deployer/settlement wallet rather than a personal wallet.

## Authentication and roles

- Merchants sign up and sign in through Supabase Auth.
- The frontend sends the Supabase access token as `Authorization: Bearer <token>`.
- A signed-in user completes merchant onboarding through `PUT /api/merchants/me`.
- Merchant dashboard, invoice, and settings routes are protected.
- Customer landing, invoice payment, and transaction routes remain public; customers do not create accounts.
- The API derives merchant identity from the verified JWT and does not trust a browser-supplied merchant ID.

## Payment flow

1. A merchant creates a GHS invoice through `POST /api/invoices`.
2. The customer opens or scans the public invoice reference and connects a Sepolia wallet.
3. ETH calls `payInvoice(onchainId, zeroAddress, amount)` with the ETH value. USDC first approves the SikaPay contract, then calls `payInvoice(onchainId, usdcAddress, amount)`.
4. The frontend waits for the wallet receipt and submits the transaction hash to `POST /api/payments`.
5. In `PAYMENT_MODE=rpc`, the API verifies the contract event and payment details on Sepolia before returning success. The UI never marks a payment successful from a wallet popup alone.

Use `PAYMENT_MODE=simulation` only for UI demos without real blockchain verification. Use `PAYMENT_MODE=rpc` for the hackathon judging flow.

## Verification

```bash
corepack pnpm build
corepack pnpm build:api
corepack pnpm test:api
```

## Deployment

Recommended hackathon setup:

- Vercel hosts the React/Vite frontend from the repository root.
- Render hosts the Express backend with `render.yaml`.
- Supabase stores auth, merchants, invoices, payments, and payouts.

### Backend on Render

Create a Render Web Service from this repository. Render can read `render.yaml`.
The backend build command is:

```bash
corepack pnpm install --frozen-lockfile && corepack pnpm --filter sikapay-backend build
```

The backend start command is:

```bash
corepack pnpm --filter sikapay-backend start
```

Set these Render environment variables in the dashboard:

```env
NODE_ENV=production
HOST=0.0.0.0
PAYMENT_MODE=rpc
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
GHS_PER_ETH=65000
GHS_PER_USDC=15.50
SEPOLIA_RPC_URL=...
SIKAPAY_CONTRACT_ADDRESS=...
SEPOLIA_PRIVATE_KEY=...
SETTLEMENT_WALLET=...
USDC_CONTRACT_ADDRESS=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

Do not manually set `PORT` on Render unless Render asks for it; the API already
uses Render's provided `PORT`.

### Frontend on Vercel

Create a Vercel project from this repository root. `vercel.json` configures the
Vite build and SPA routing.

Set these Vercel environment variables:

```env
VITE_API_URL=https://your-render-api.onrender.com
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_CHAIN_ID=11155111
VITE_SIKAPAY_CONTRACT_ADDRESS=...
VITE_USDC_CONTRACT_ADDRESS=...
VITE_WALLETCONNECT_PROJECT_ID=...
VITE_ENABLE_MOCK_MODE=false
```

After deploying Vercel, add the Vercel URL to:

- Render `FRONTEND_ORIGIN`
- Supabase Auth Site URL / Redirect URLs

On Render's free tier, open `/health` before presenting to wake the backend from
sleep.

Contract commands run from the API workspace:

```bash
corepack pnpm --filter sikapay-backend contract:compile
corepack pnpm --filter sikapay-backend contract:test
```

## License

SikaPay is proprietary software. The repository may be public for review,
collaboration, or hackathon judging, but the code, product design, brand,
business logic, and smart contract flow are not open-source. See `LICENSE` for
the full terms.

## Main API routes

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/health` | Public |
| `GET` | `/api/me` | Merchant token |
| `PUT` | `/api/merchants/me` | Merchant token |
| `POST` | `/api/invoices` | Merchant token |
| `GET` | `/api/invoices` | Merchant token |
| `GET` | `/api/invoices/:reference` | Public |
| `POST` | `/api/payments` | Public, chain-verified in RPC mode |
| `GET` | `/api/payments` | Merchant token |

See `server/README.md` for API, Supabase, and contract deployment details.

## Visual asset credit

The Ethereum mark is the official project mark sourced from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ETHEREUM-YOUTUBE-PROFILE-PIC.png) under CC BY 3.0. The market photograph is by Jakub Zerdzicki from [Pexels](https://www.pexels.com/photo/ethereum-coin-and-stock-market-graph-interaction-31220975/). Motion respects the operating system's reduced-motion preference.
