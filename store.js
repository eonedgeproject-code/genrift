// ============================================================
// GENRIFT — Usage Store
// In-memory for development. Replace with Redis/SQLite in prod.
// ============================================================

// Structure: { walletAddress: { count: N, date: 'YYYY-MM-DD' } }
const usageStore = new Map();

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

/**
 * Get today's generation count for a wallet
 */
function getUsageToday(walletAddress) {
  const entry = usageStore.get(walletAddress);
  if (!entry || entry.date !== getTodayKey()) return 0;
  return entry.count;
}

/**
 * Increment usage count for a wallet
 */
function incrementUsage(walletAddress) {
  const today = getTodayKey();
  const entry = usageStore.get(walletAddress);
  if (!entry || entry.date !== today) {
    usageStore.set(walletAddress, { count: 1, date: today });
  } else {
    entry.count += 1;
  }
}

/**
 * Reset usage for a wallet (admin use)
 */
function resetUsage(walletAddress) {
  usageStore.delete(walletAddress);
}

module.exports = { getUsageToday, incrementUsage, resetUsage };
