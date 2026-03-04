// ============================================================
// GENRIFT — Solana Token Gate
// Checks $RIFT balance on Solana — works with pump.fun tokens
// ============================================================
// 
// HOW PUMP.FUN TOKENS WORK:
// When you launch $RIFT on pump.fun, you get a MINT ADDRESS
// like: RiFTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// 
// Set that address as RIFT_TOKEN_MINT in your .env
// The rest works automatically — this code reads the SPL token
// balance for any wallet and compares it to your tier thresholds.
//
// pump.fun tokens are standard Solana SPL tokens,
// so this code works with them out of the box.
// ============================================================

const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount, getAssociatedTokenAddress } = require('@solana/spl-token');

const RPC       = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const RIFT_MINT = process.env.RIFT_TOKEN_MINT || null;

// Token decimals — pump.fun uses 6 decimals by default
const TOKEN_DECIMALS = parseInt(process.env.RIFT_TOKEN_DECIMALS) || 6;

const RIFT_HOLDER_MIN  = parseInt(process.env.RIFT_HOLDER_MIN)  || 100;
const RIFT_PREMIUM_MIN = parseInt(process.env.RIFT_PREMIUM_MIN) || 10000;

const FREE_DAILY_LIMIT    = parseInt(process.env.FREE_DAILY_LIMIT)    || 3;
const HOLDER_DAILY_LIMIT  = parseInt(process.env.HOLDER_DAILY_LIMIT)  || 50;
const PREMIUM_DAILY_LIMIT = parseInt(process.env.PREMIUM_DAILY_LIMIT) || 999;

const TIERS = {
  FREE:    { name: 'FREE',    dailyLimit: FREE_DAILY_LIMIT,    badge: '◈'   },
  HOLDER:  { name: 'HOLDER',  dailyLimit: HOLDER_DAILY_LIMIT,  badge: '◈◈'  },
  PREMIUM: { name: 'PREMIUM', dailyLimit: PREMIUM_DAILY_LIMIT, badge: '◈◈◈' },
};

/**
 * Get $RIFT SPL token balance for a Solana wallet.
 * Works with pump.fun tokens — they are standard SPL tokens.
 * 
 * Returns 0 if:
 * - RIFT_TOKEN_MINT not set yet (pre-launch)
 * - Wallet has no ATA for $RIFT (never bought)
 * - RPC error
 */
async function getRiftBalance(walletAddress) {
  // Pre-launch: token mint not configured yet
  if (!RIFT_MINT || RIFT_MINT === 'RiFTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    console.log('[TokenGate] Token not launched yet — all users get FREE tier');
    return 0;
  }

  try {
    const connection   = new Connection(RPC, 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey   = new PublicKey(RIFT_MINT);

    // ATA = the token account automatically associated with this wallet
    const ata     = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
    const account = await getAccount(connection, ata);

    // Convert from raw amount (with decimals) to human-readable
    return Number(account.amount) / Math.pow(10, TOKEN_DECIMALS);

  } catch (err) {
    // Token account doesn't exist = wallet has 0 $RIFT
    return 0;
  }
}

/**
 * Determine user tier based on $RIFT balance
 */
async function getUserTier(walletAddress) {
  const balance = await getRiftBalance(walletAddress);

  let tier;
  if (balance >= RIFT_PREMIUM_MIN)     tier = TIERS.PREMIUM;
  else if (balance >= RIFT_HOLDER_MIN) tier = TIERS.HOLDER;
  else                                  tier = TIERS.FREE;

  return { tier, balance };
}

module.exports = { getUserTier, getRiftBalance, TIERS };
