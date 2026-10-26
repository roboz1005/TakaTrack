// Smart defaults for quick-add. Pure.
const DAY = 86400000;
/** Category ids ordered best-first: exact amount+wallet match > frequency > recency (time-decayed). */
export function rankCategories(txns, { type, amount = 0, walletId = null, now = Date.now() }) {
  const score = new Map();
  for (const t of txns) {
    if (t.deletedAt || t.type !== type || !t.categoryId) continue;
    let s = 1 + 2 * Math.exp(-Math.max(0, now - t.ts) / (30 * DAY));
    if (amount && t.amount === amount) s += 5;
    if (amount && t.amount === amount && walletId && t.walletId === walletId) s += 10;
    score.set(t.categoryId, (score.get(t.categoryId) || 0) + s);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
export function defaultWallet(settings, wallets, type) {
  const ids = new Set(wallets.filter((w) => !w.archived).map((w) => w.id));
  const last = settings.lastUsed?.[type]?.walletId;
  return ids.has(last) ? last : [...ids][0] ?? null;
}
