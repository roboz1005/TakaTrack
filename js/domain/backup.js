// Pure backup logic: build / validate / merge / CSV. No DOM.
import { validateTxn } from './validate.js';
import { localDate, localTime, toISOWithOffset } from './dates.js';
export const KEYS = ['wallets', 'categories', 'people', 'txns', 'templates', 'budgets'];
export const ALL = [...KEYS, 'recurring'];   // recurring is optional in older backups

export function buildBackup(state, now = Date.now()) {
  const o = { app: 'takatrack', version: 1, exportedAt: now, settings: state.settings };
  for (const k of ALL) o[k] = state[k] ?? [];
  return o;
}
export function validateBackup(d) {
  const bad = (m) => { throw new Error('Invalid backup: ' + m); };
  if (!d || d.app !== 'takatrack') bad('not a TakaTrack file');
  for (const k of KEYS) {
    if (!Array.isArray(d[k])) bad(k + ' missing');
    const ids = new Set();
    for (const x of d[k]) { if (!x || typeof x.id !== 'string' || ids.has(x.id)) bad('bad or duplicate id in ' + k); ids.add(x.id); }
  }
  if (d.recurring !== undefined && !Array.isArray(d.recurring)) bad('recurring must be a list');
  const wallets = new Set(d.wallets.map((w) => w.id)), people = new Set(d.people.map((p) => p.id));
  for (const t of d.txns) {
    try { validateTxn(t); } catch (e) { bad(e.message); }
    for (const w of [t.walletId, t.toWalletId]) if (w && !wallets.has(w)) bad('transaction uses an unknown wallet');
    if (t.personId && !people.has(t.personId)) bad('transaction uses an unknown person');
  }
  return d;
}
/** Union by id; the record with the newer updatedAt wins. */
export function mergeLists(cur, inc) {
  const m = new Map(cur.map((x) => [x.id, x]));
  for (const x of inc) { const o = m.get(x.id); if (!o || x.updatedAt > o.updatedAt) m.set(x.id, x); }
  return [...m.values()];
}
const esc = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const money = (p) => `${p < 0 ? '-' : ''}${Math.floor(Math.abs(p) / 100)}.${String(Math.abs(p) % 100).padStart(2, '0')}`;
export function toCsv(state) {
  const nm = (list, id) => list.find((x) => x.id === id)?.name ?? '';
  const head = ['date', 'time', 'iso_timestamp', 'type', 'amount', 'wallet', 'to_wallet', 'category', 'person', 'note', 'added_at', 'edited_at'];
  const rows = state.txns.filter((t) => !t.deletedAt).sort((a, b) => a.ts - b.ts || a.createdAt - b.createdAt).map((t) => [
    localDate(t.ts), localTime(t.ts), toISOWithOffset(t.ts), t.type, money(t.amount), nm(state.wallets, t.walletId), nm(state.wallets, t.toWalletId),
    nm(state.categories, t.categoryId), nm(state.people, t.personId), t.note, toISOWithOffset(t.createdAt), toISOWithOffset(t.updatedAt)]);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}
/** Whole days since last backup, or null if never */
export const daysSinceBackup = (settings, now = Date.now()) => (settings.backup?.lastAt ? Math.floor((now - settings.backup.lastAt) / 86400000) : null);
export const backupDue = (state, now = Date.now()) => {
  if (!state.txns.length) return false;
  const d = daysSinceBackup(state.settings, now); return d === null || d >= (state.settings.backup?.nudgeDays ?? 7);
};
