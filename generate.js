// ============================================================
// GENRIFT — /api/generate
// Core proxy route: Token Gate → Usage Check → Anthropic API
// ============================================================
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const { verifyWalletSignature } = require('../middleware/walletAuth');
const { getUserTier }           = require('../src/tokenGate');
const { getUsageToday, incrementUsage } = require('../src/store');

// Pipeline system prompt map
const PIPELINE_PROMPTS = {
  normal: 'You are GenRift AI, an expert full-stack developer. Generate a complete, single-file HTML application based on the description. Include ALL CSS and JavaScript inline. Make it visually impressive with a dark modern aesthetic, animations, and interactions. Return ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no backticks, no explanations.',
  fast:   'You are GenRift AI. Generate a clean, functional single-file HTML app quickly. Include inline CSS and JS. Dark modern design. Return ONLY raw HTML starting with <!DOCTYPE html>.',
  deep:   'You are GenRift AI with extended reasoning. Deeply analyze the request and generate a comprehensive, feature-rich single-file HTML application. Consider edge cases, UX, accessibility. Return ONLY raw HTML starting with <!DOCTYPE html>.',
  v4:     'You are GenRift GEN V4, optimized for code quality. Generate a perfectly structured, well-commented single-file HTML application. Prioritize clean architecture, performance, and beautiful visuals. Return ONLY raw HTML starting with <!DOCTYPE html>.'
};

// Pipeline token limits
const PIPELINE_MAX_TOKENS = {
  normal: 8000,
  fast:   4000,
  deep:   12000,
  v4:     10000
};

// ── POST /api/generate ─────────────────────────────────────
router.post('/', verifyWalletSignature, async (req, res) => {
  const { prompt, pipeline = 'normal' } = req.body;
  const wallet = req.walletAddress;

  // ── 1. Validate input ─────────────────────────────────
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt too long. Max 2000 characters.' });
  }
  if (!PIPELINE_PROMPTS[pipeline]) {
    return res.status(400).json({ error: 'Invalid pipeline. Use: normal, fast, deep, v4' });
  }

  // ── 2. Token Gate — check tier & balance ──────────────
  let tierInfo;
  try {
    tierInfo = await getUserTier(wallet);
  } catch (err) {
    console.error('[TokenGate Error]', err.message);
    // On RPC error, fall back to FREE tier
    tierInfo = { tier: { name: 'FREE', dailyLimit: 3, badge: '◈' }, balance: 0 };
  }

  const { tier, balance } = tierInfo;

  // ── 3. Usage Check ────────────────────────────────────
  const usedToday = getUsageToday(wallet);
  if (usedToday >= tier.dailyLimit) {
    return res.status(429).json({
      error: 'Daily generation limit reached',
      tier: tier.name,
      limit: tier.dailyLimit,
      used: usedToday,
      riftBalance: balance,
      hint: tier.name === 'FREE'
        ? `Hold ${process.env.RIFT_HOLDER_MIN || 100} $RIFT to unlock ${process.env.HOLDER_DAILY_LIMIT || 50} daily generations`
        : `Upgrade to PREMIUM by holding ${process.env.RIFT_PREMIUM_MIN || 10000} $RIFT for unlimited generations`
    });
  }

  // ── 4. Call Anthropic API (proxy) ─────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: 'Server not configured — missing API key' });
  }

  try {
    console.log(`[Generate] wallet=${wallet.slice(0,8)}... tier=${tier.name} pipeline=${pipeline}`);

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: PIPELINE_MAX_TOKENS[pipeline],
        system: PIPELINE_PROMPTS[pipeline],
        messages: [{ role: 'user', content: `Build this application: ${prompt}` }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        timeout: 120000 // 2 minute timeout
      }
    );

    // ── 5. Extract code ──────────────────────────────────
    let code = response.data.content?.[0]?.text || '';
    // Strip any accidental markdown fences
    code = code.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim();

    // ── 6. Increment usage ────────────────────────────────
    incrementUsage(wallet);

    // ── 7. Return result ──────────────────────────────────
    return res.json({
      success: true,
      code,
      usage: {
        tier: tier.name,
        badge: tier.badge,
        riftBalance: balance,
        usedToday: usedToday + 1,
        dailyLimit: tier.dailyLimit,
        remaining: tier.dailyLimit - (usedToday + 1)
      },
      pipeline,
      tokens: response.data.usage
    });

  } catch (err) {
    // Handle Anthropic API errors
    if (err.response?.data) {
      const apiErr = err.response.data;
      return res.status(502).json({
        error: 'AI generation failed',
        detail: apiErr.error?.message || 'Unknown API error',
        type: apiErr.error?.type
      });
    }
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Generation timed out. Try a simpler prompt or different pipeline.' });
    }
    console.error('[Generate Error]', err.message);
    return res.status(500).json({ error: 'Generation failed. Please try again.' });
  }
});

module.exports = router;
