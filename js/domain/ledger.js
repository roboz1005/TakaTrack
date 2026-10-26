// Derived balances. Never stored. Soft-deleted txns are ignored.
import { addDays } from './dates.js';
export const DEBT_TYPES = ['lend', 'borrow', 'repay_in', 'repay_out'];
export const TXN_TYPES = ['expense', 'income', 'transfer', ...DEBT_TYPES, 'adjust'];

/** [[walletId, delta], ...] for one txn (null wallet = no wallet movement) */
export function walletEffects(t) {
  const a = t.amount;
  switch (t.type) {
    case 'expense': case 'lend': case 'repay_out': return [[t.walletId, -a]];
    case 'income': case 'borrow': case 'repay_in': return [[t.walletId, a]];
    case 'transfer': return [[t.walletId, -a], [t.toWalletId, a]];
    case 'adjust': return [[t.walletId, a]]; // signed
    default: return [];
  }
}
/** Person balance delta: > 0 means they owe me */
export function personEffect(t) {
  switch (t.type) {
    case 'lend': case 'repay_out': return t.amount;
    case 'borrow': case 'repay_in': return -t.amount;
    default: return 0;
  }
}
const live = (txns) => txns.filter((t) => !t.deletedAt);

export function walletBalances(wallets, txns) {
  const bal = new Map(wallets.map((w) => [w.id, w.openingBalance || 0]));
  for (const t of live(txns)) for (const [id, d] of walletEffects(t)) if (id && bal.has(id)) bal.set(id, bal.get(id) + d);
  return bal;
}
export function personBalances(txns) {
  const bal = new Map();
  for (const t of live(txns)) { if (!t.personId) continue; const e = personEffect(t); if (e) bal.set(t.personId, (bal.get(t.personId) || 0) + e); }
  return bal;
}
export function totals(wallets, txns) {
  const bal = walletBalances(wallets, txns);
  const walletsTotal = wallets.filter((w) => !w.archived).reduce((s, w) => s + bal.get(w.id), 0);
  let toReceive = 0, toPay = 0;
  for (const v of personBalances(txns).values()) v > 0 ? (toReceive += v) : (toPay += -v);
  return { walletsTotal, toReceive, toPay, netWorth: walletsTotal + toReceive - toPay };
}
/** Income / expense inside [start, end) */
export function periodSummary(txns, start, end) {
  let income = 0, expense = 0;
  for (const t of live(txns)) {
    if (t.ts < start || t.ts >= end) continue;
    if (t.type === 'income') income += t.amount; else if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense, net: income - expense };
}
/** [[categoryId, total], ...] expense totals in [start, end), biggest first */
export function categoryTotals(txns, start, end, type = 'expense') {
  const m = new Map();
  for (const t of live(txns)) if (t.type === type && t.ts >= start && t.ts < end) m.set(t.categoryId, (m.get(t.categoryId) || 0) + t.amount);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
/** Last n periods ending with the one containing `now`, oldest first: [{start,end,income,expense}] */
export function monthlySeries(txns, now, startDay = 1, n = 6, rangeOf) {
  const out = []; let ts = now;
  for (let i = 0; i < n; i++) { const r = rangeOf(ts, startDay); out.unshift({ ...r, ...periodSummary(txns, r.start, r.end) }); ts = r.start - 1; }
  return out;
}
/** Last n calendar days ending with the day containing `now`, oldest first: [{start,end,income,expense,net}] (7 = one week) */
export function dailySeries(txns, now, n = 7) {
  const today = addDays(now, 0), out = [];
  for (let i = n - 1; i >= 0; i--) { const start = addDays(today, -i), end = addDays(start, 1); out.push({ start, end, ...periodSummary(txns, start, end) }); }
  return out;
}
/** A period [start, end) cut into 7-day weeks: up to 4 full weeks, then ONE bucket for the leftover days (extra: true).
 *  A 31-day month gives W1-W4 (28 days) + 3 extra days; a 28-day month gives exactly 4 weeks. Oldest first. */
export function weeklySeries(txns, start, end) {
  const out = []; let s = start;
  for (let w = 1; w <= 4 && s < end; w++) { const e = Math.min(addDays(s, 7), end); out.push({ start: s, end: e, week: w, extra: false, ...periodSummary(txns, s, e) }); s = e; }
  if (s < end) out.push({ start: s, end, week: 5, extra: true, ...periodSummary(txns, s, end) });
  return out;
}
/** Budget progress for a period: [{categoryId, limit, spent, pct, over}] */
export function budgetProgress(budgets, txns, start, end) {
  const spent = new Map(categoryTotals(txns, start, end));
  return budgets.filter((b) => b.monthlyLimit > 0).map((b) => { const s = spent.get(b.categoryId) || 0;
    return { categoryId: b.categoryId, limit: b.monthlyLimit, spent: s, pct: Math.round((100 * s) / b.monthlyLimit), over: s > b.monthlyLimit }; });
}
/** Open lend/borrow items due within `days` (or overdue), one per person (earliest due), soonest first */
export function dueSoon(txns, now, days = 7) {
  const bal = personBalances(txns), best = new Map();
  for (const t of live(txns)) {
    if (!t.dueTs || !t.personId || (t.type !== 'lend' && t.type !== 'borrow') || t.dueTs > now + days * 86400000) continue;
    const b = bal.get(t.personId) || 0; if (t.type === 'lend' ? b <= 0 : b >= 0) continue;   // already settled
    const o = best.get(t.personId); if (!o || t.dueTs < o.dueTs) best.set(t.personId, t);
  }
  return [...best.values()].sort((a, b) => a.dueTs - b.dueTs).map((t) => ({ txn: t, personId: t.personId, balance: bal.get(t.personId), overdue: t.dueTs < now }));
}
/** Savings goals = wallets with goal.target. saved = live wallet balance (contributions are transfers into it). */
export function goalProgress(wallets, txns) {
  const bal = walletBalances(wallets, txns);
  return wallets.filter((w) => w.goal?.target > 0 && !w.archived).map((w) => {
    const saved = bal.get(w.id) || 0, target = w.goal.target;
    return { wallet: w, saved, target, pct: Math.max(0, Math.floor((100 * saved) / target)), done: saved >= target, remaining: Math.max(0, target - saved) };
  });
}
