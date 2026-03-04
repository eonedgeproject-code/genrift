// ============================================================
// GENRIFT — Wallet Auth Middleware
// Verifies Solana wallet signature to prove ownership
// ============================================================
const nacl = require('tweetnacl');
const bs58 = require('bs58');

/**
 * Middleware: verifies that the request comes from the claimed wallet.
 * 
 * Frontend must send:
 *   x-wallet-address   — Solana public key (base58)
 *   x-wallet-message   — The message that was signed (e.g. "GENRIFT_AUTH_<timestamp>")
 *   x-wallet-signature — base58-encoded signature bytes
 */
function verifyWalletSignature(req, res, next) {
  const walletAddress = req.headers['x-wallet-address'];
  const message       = req.headers['x-wallet-message'];
  const signature     = req.headers['x-wallet-signature'];

  // ── All headers required ──────────────────────────────
  if (!walletAddress || !message || !signature) {
    return res.status(401).json({
      error: 'Wallet authentication required',
      hint: 'Provide x-wallet-address, x-wallet-message, x-wallet-signature headers'
    });
  }

  // ── Validate address format ───────────────────────────
  if (walletAddress.length < 32 || walletAddress.length > 44) {
    return res.status(401).json({ error: 'Invalid wallet address format' });
  }

  // ── Message must be recent (within 5 minutes) ─────────
  try {
    const parts = message.split('_');
    const timestamp = parseInt(parts[parts.length - 1]);
    if (!isNaN(timestamp)) {
      const age = Date.now() - timestamp;
      if (age > 5 * 60 * 1000) {
        return res.status(401).json({ error: 'Signature expired. Re-authenticate.' });
      }
    }
  } catch (_) {
    // If message format doesn't include timestamp, skip age check
  }

  // ── Verify signature ──────────────────────────────────
  try {
    const publicKeyBytes = bs58.decode(walletAddress);
    const messageBytes   = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid wallet signature' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Signature verification failed', detail: err.message });
  }

  // ── Attach wallet to request ──────────────────────────
  req.walletAddress = walletAddress;
  next();
}

module.exports = { verifyWalletSignature };
