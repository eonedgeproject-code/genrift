// ============================================================
// GENRIFT — /api/status
// Public endpoint — no auth required
// ============================================================
const express = require('express');
const router  = express.Router();

router.get('/', (req, res) => {
  res.json({
    protocol: 'GENRIFT',
    version: '1.0.0',
    status: 'ONLINE',
    apiConnected: !!process.env.ANTHROPIC_API_KEY,
    tokenMint: process.env.RIFT_TOKEN_MINT || 'NOT_CONFIGURED',
    tiers: {
      FREE:    { dailyLimit: parseInt(process.env.FREE_DAILY_LIMIT)    || 3   },
      HOLDER:  { dailyLimit: parseInt(process.env.HOLDER_DAILY_LIMIT)  || 50,  minBalance: parseInt(process.env.RIFT_HOLDER_MIN)  || 100   },
      PREMIUM: { dailyLimit: parseInt(process.env.PREMIUM_DAILY_LIMIT) || 999, minBalance: parseInt(process.env.RIFT_PREMIUM_MIN) || 10000 }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
