# GENRIFT Backend — Proxy + Token Gate

Backend server for the GENRIFT AI Generation Protocol.  
Hides the Anthropic API key from users and manages access based on $RIFT token balance.

---

## Architecture

```
User (Frontend) 
  → Connect Phantom Wallet
  → Sign Message (prove ownership)
  → POST /api/generate
      → Verify Signature
      → Check $RIFT Balance (Solana)
      → Check Daily Usage
      → Proxy to Anthropic API
      → Return generated code
```

---

## Tier System

| Tier    | $RIFT Required | Daily Limit |
|---------|---------------|-------------|
| FREE    | 0             | 3 gens/day  |
| HOLDER  | 100+          | 50 gens/day |
| PREMIUM | 10,000+       | Unlimited   |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
```

### 3. Run development server
```bash
npm run dev
```

### 4. Run production
```bash
npm start
```

---

## API Endpoints

### `GET /api/status`
Public. Returns server status, tier config, token mint.

### `GET /api/wallet/info`
Requires wallet auth headers.  
Returns tier, $RIFT balance, daily usage.

### `POST /api/generate`
Requires wallet auth headers + JSON body.

**Body:**
```json
{
  "prompt": "A snake game with neon aesthetics",
  "pipeline": "normal"
}
```

**Pipelines:** `normal` | `fast` | `deep` | `v4`

**Auth Headers:**
```
x-wallet-address:   <Solana pubkey>
x-wallet-message:   GENRIFT_AUTH_<timestamp>
x-wallet-signature: <bs58 signature>
```

---

## Deployment

### VPS Deployment
```bash
# Upload project
scp -r genrift-backend/ user@your-vps:/var/www/

# Install & run with PM2
npm install -g pm2
cd /var/www/genrift-backend
npm install
pm2 start src/index.js --name genrift-backend
pm2 save
```

### ENV Variables on VPS
```bash
nano .env
# Set ANTHROPIC_API_KEY, FRONTEND_URL, SOLANA_RPC
```

---

## Token Gate Notes

- \$RIFT token mint not configured yet ? all users get FREE tier
- Set `RIFT_TOKEN_MINT` in .env after token launch on pump.fun
- For testing: set `RIFT_HOLDER_MIN=0` so all wallets get HOLDER tier

---

## File Structure

```
genrift-backend/
├── src/
│   ├── index.js        ← Express server entry
│   ├── tokenGate.js    ← Solana $RIFT balance checker
│   └── store.js        ← Usage tracking (in-memory)
├── routes/
│   ├── generate.js     ← POST /api/generate (main proxy)
│   ├── wallet.js       ← GET /api/wallet/info
│   └── status.js       ← GET /api/status
├── middleware/
│   └── walletAuth.js   ← Signature verification
├── config/
│   └── frontend-integration.js  ← Frontend code snippet
├── .env.example
├── package.json
└── README.md
```
