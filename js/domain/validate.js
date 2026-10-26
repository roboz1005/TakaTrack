import { TXN_TYPES, DEBT_TYPES } from './ledger.js';
/** Throws on an invalid txn. Debt types may have no wallet (non-cash). */
export function validateTxn(t) {
  const bad = (m) => { throw new Error('Invalid transaction: ' + m); };
  if (!TXN_TYPES.includes(t.type)) bad('unknown type');
  if (!Number.isSafeInteger(t.amount)) bad('amount must be whole poisha');
  if (t.type === 'adjust' ? t.amount === 0 : t.amount <= 0) bad('amount must be positive');
  if (!Number.isFinite(t.ts)) bad('missing date/time');
  if (DEBT_TYPES.includes(t.type)) { if (!t.personId) bad('person required'); }
  else if (!t.walletId) bad('wallet required');
  if (t.type === 'transfer' && (!t.toWalletId || t.toWalletId === t.walletId)) bad('transfer needs a different destination wallet');
  return t;
}
