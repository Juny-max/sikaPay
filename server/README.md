# SikaPay Backend

Ethereum-to-Mobile-Money bridge API for the hackathon MVP.

## Run locally

```bash
pnpm install
copy .env.example .env
pnpm dev
```

The API starts at `http://localhost:4000`. It defaults to simulation mode, so the
complete demo flow works before the Sepolia contract is deployed.

Invoices and payments persist to `data/sikapay.json` by default.

## Demo API flow

Create an invoice:

```http
POST /api/invoices
Content-Type: application/json

{
  "amountGhs": 20
}
```

This request requires `Authorization: Bearer <supabase-access-token>` and an
existing merchant profile.

Submit the customer's confirmed wallet transaction:

```http
POST /api/payments
Content-Type: application/json

{
  "invoiceReference": "SP-...",
  "txHash": "0x...64 hex characters...",
  "senderAddress": "0x...40 hex characters...",
  "asset": "USDC",
  "cryptoAmount": "1.30"
}
```

Dashboard endpoints:

- `GET /api/invoices?merchantId=kojo-store`
- `GET /api/invoices/:reference`
- `GET /api/payments?merchantId=kojo-store`
- `GET /api/events/merchants/kojo-store` (Server-Sent Events)
- `GET /health`

## Supabase authentication

1. Run `supabase/migrations/202608040001_initial_schema.sql` in the Supabase SQL editor.
2. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
3. Sign users up from the frontend with Supabase Auth.
4. Send the returned access token as `Authorization: Bearer <token>`.
5. Create or update the merchant profile:

```http
PUT /api/merchants/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "Kojo Store",
  "momoPhone": "+233241234567"
}
```

`GET /api/me` returns the authenticated user and merchant profile. Merchant
invoice and payment list routes are scoped from the JWT and never trust a
merchant ID supplied by the browser.

## Configuration

See `.env.example`. Exchange rates are fixed demo rates. `PAYMENT_MODE=rpc` is
used for real Sepolia invoice creation and payment receipt verification.

## Smart contract

Compile and test:

```bash
pnpm contract:compile
pnpm contract:test
```

For Sepolia deployment, set `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`, and
optionally `SETTLEMENT_WALLET`, then run:

```bash
pnpm contract:deploy
```

Put the printed address in `SIKAPAY_CONTRACT_ADDRESS`, set Sepolia USDC in
`USDC_CONTRACT_ADDRESS`, and change `PAYMENT_MODE=rpc`.

The frontend uses the invoice's `onchainId` and calls:

- ETH: `payInvoice(onchainId, 0x0000000000000000000000000000000000000000, amountWei)` with `value: amountWei`
- USDC: approve SikaPay first, then call `payInvoice(onchainId, usdcAddress, amountInSixDecimals)`

After the wallet transaction confirms, send its hash to `POST /api/payments`.
In RPC mode the API derives the payer, token, amount, and confirmation time from
the contract event; client-supplied payment details are not trusted.
