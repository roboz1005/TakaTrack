import { personEffect } from './ledger.js';
import { formatTaka } from './money.js';
import { formatDateTime } from './dates.js';
const LABEL = { lend: 'You lent', borrow: 'You borrowed', repay_in: 'They paid you', repay_out: 'You paid back' };
const bal = (p, v) => (v > 0 ? `${p.name} owes you ${formatTaka(v)}` : v < 0 ? `You owe ${p.name} ${formatTaka(-v)}` : 'Settled');
/** Shareable plain-text statement; every figure comes from the same ledger effects */
export function personStatement(person, txns, now, timeFormat = 'auto') {
  const rows = txns.filter((t) => t.personId === person.id && !t.deletedAt).sort((a, b) => a.ts - b.ts || a.createdAt - b.createdAt);
  let run = 0;
  const lines = rows.map((t) => { run += personEffect(t); return `${formatDateTime(t.ts, timeFormat)} — ${LABEL[t.type]} ${formatTaka(t.amount)}${t.note ? ` (${t.note})` : ''}`; });
  return { balance: run, text: [`Statement: ${person.name}`, `As of ${formatDateTime(now, timeFormat)}`, '', ...lines, '', `Balance: ${bal(person, run)}`].join('\n') };
}
