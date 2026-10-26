import { h } from '../h.js';
import { toast } from '../toast.js';
import { openAddSheet } from '../addsheet.js';
import { addPersonUI, renamePersonUI, deletePersonUI } from '../personActions.js';
import { formatTaka, parseTaka } from '../../domain/money.js';
import { personBalances } from '../../domain/ledger.js';
import { personStatement } from '../../domain/statement.js';
import { groupByDay, formatDay, formatTime } from '../../domain/dates.js';

const LABEL = { lend: 'You lent', borrow: 'You borrowed', repay_in: 'They paid you', repay_out: 'You paid back' };
const owes = (p, b) => (b > 0 ? `${p.name} owes you ${formatTaka(b)}` : b < 0 ? `You owe ${p.name} ${formatTaka(-b)}` : 'Settled');

export function peopleScreen({ state, store }) {
  const bal = personBalances(state.txns), people = state.people.filter((p) => !p.archived);
  return h('div', null, h('h1', null, 'People'),
    h('div', { class: 'stack' }, people.length ? people.map((p) => h('div', { class: 'row' }, h('a', { class: 'card link-card', style: { flex: 1 }, href: '#/person/' + p.id }, h('strong', null, p.name), h('span', { class: 'muted small' }, owes(p, bal.get(p.id) || 0))), h('button', { class: 'btn small', 'aria-label': 'Delete ' + p.name, onclick: () => deletePersonUI(store, state, p) }, '🗑')))
      : h('div', { class: 'card empty' }, h('p', null, 'No one yet. Tap + → Debt to lend or borrow.'))),
    h('button', { class: 'btn wide', onclick: async () => { const n = prompt('Person name'); if (n?.trim()) await addPersonUI(store, n); } }, '＋ Add person'));
}

export function personScreen({ state, store, arg }) {
  const p = state.people.find((x) => x.id === arg); if (!p) return h('p', null, 'Person not found.');
  const b = personBalances(state.txns).get(p.id) || 0, f = state.settings.timeFormat;
  const mine = state.txns.filter((t) => t.personId === p.id && !t.deletedAt);
  async function settle() {
    const v = prompt('Amount to settle (৳)', String(Math.abs(b) / 100)), a = v == null ? null : parseTaka(v);
    if (v == null) return; if (!a || a > Math.abs(b)) return toast('Enter an amount up to ' + formatTaka(Math.abs(b)));
    const wid = state.settings.lastUsed?.debt?.walletId ?? state.wallets.find((w) => !w.archived)?.id ?? null;
    await store.dispatch({ type: 'txn/add', txn: { type: b > 0 ? 'repay_in' : 'repay_out', amount: a, personId: p.id, walletId: wid, note: 'Settle-up' } });   // ts = now
    toast('Settled ' + formatTaka(a));
  }
  return h('div', null, h('a', { href: '#/people', class: 'link' }, '‹ People'), h('h1', null, p.name),
    h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => renamePersonUI(store, p) }, 'Rename'), h('button', { class: 'btn small', onclick: async () => { if (await deletePersonUI(store, state, p)) location.hash = '#/people'; } }, 'Delete person')),
    h('div', { class: 'hero' }, h('div', { class: 'big' }, formatTaka(Math.abs(b))), h('div', { class: 'muted' }, owes(p, b))),
    b !== 0 && h('button', { class: 'btn primary wide', onclick: settle }, 'Settle'),
    mine.length > 0 && h('button', { class: 'btn wide', onclick: async () => {
      const { text } = personStatement(p, state.txns, Date.now(), f);
      try { if (navigator.share) await navigator.share({ title: 'Statement: ' + p.name, text }); else { await navigator.clipboard.writeText(text); toast('Statement copied.'); } }
      catch (e) { if (e.name !== 'AbortError') { await navigator.clipboard?.writeText(text).catch(() => {}); toast('Statement copied.'); } } } }, 'Share statement'),
    groupByDay(mine).map((g) => h('section', null, h('h2', { class: 'dayhead' }, formatDay(g.ts)),
      h('div', { class: 'stack' }, g.items.map((t) => h('button', { class: 'card trow', onclick: () => openAddSheet(store, t) },
        h('div', null, h('strong', null, LABEL[t.type]), h('div', { class: 'muted small' }, formatTime(t.ts, f) + (t.note ? ' · ' + t.note : ''))), h('div', { class: 'amount' }, formatTaka(t.amount))))))),
    h('p', { class: 'muted small' }, 'Added ' + new Date(p.createdAt).toDateString()));
}
