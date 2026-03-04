// ============================================================
// GENRIFT Backend — Main Entry Point
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const generateRouter = require('./routes/generate');
const walletRouter = require('./routes/wallet');
const statusRouter = require('./routes/status');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-wallet-address', 'x-wallet-signature', 'x-wallet-message']
}));

// ── Body Parser ───────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Global Rate Limiter ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' }
});
app.use(globalLimiter);

// ── Routes ─────────────────────────────────────────────────
app.use('/api/generate', generateRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/status', statusRouter);

// ── Health Check ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    protocol: 'GENRIFT',
    version: '1.0.0',
    status: 'ONLINE',
    timestamp: new Date().toISOString()
  });
});

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n◈ GENRIFT Backend running on port ${PORT}`);
  console.log(`◈ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`◈ Anthropic API: ${process.env.ANTHROPIC_API_KEY ? 'CONNECTED' : 'MISSING KEY'}\n`);
});
