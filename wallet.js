// ============================================================
// GENRIFT — /api/wallet
// Returns wallet tier, balance, and usage info
// ============================================================
const express = require('express');
const router  = express.Router();

const { verifyWalletSignature } = require('../middleware/walletAuth');
const { getUserTier }           = require('../src/tokenGate');
const { getUsageToday }         = require('../src/store');

// GET /api/wallet/info
router.get('/info', verifyWalletSignature, async (req, res) => {
  const wallet = req.walletAddress;

  try {
    const { tier, balance } = await getUserTier(wallet);
    const usedToday = getUsageToday(wallet);

    return res.json({
      wallet: wallet.slice(0, 8) + '...' + wallet.slice(-4),
      tier: tier.name,
      badge: tier.badge,
      riftBalance: balance,
      usage: {
        usedToday,
        dailyLimit: tier.dailyLimit,
        remaining: Math.max(0, tier.dailyLimit - usedToday)
      },
      thresholds: {
        holder:  parseInt(process.env.RIFT_HOLDER_MIN)  || 100,
        premium: parseInt(process.env.RIFT_PREMIUM_MIN) || 10000
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch wallet info', detail: err.message });
  }
});

module.exports = router;
