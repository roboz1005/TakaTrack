import { h } from '../h.js';
import { toast } from '../toast.js';
import { openAddSheet } from '../addsheet.js';
import { formatTaka, parseTaka } from '../../domain/money.js';
import { goalProgress } from '../../domain/ledger.js';

export function goalsScreen({ state, store }) {
  const goals = goalProgress(state.wallets, state.txns), ask = (msg, def = '') => { const v = prompt(msg, def); return v == null ? null : parseTaka(v); };
  const patchWallet = (id, patch) => store.dispatch({ type: 'entity/update', kind: 'wallet', id, patch });
  return h('div', null, h('a', { href: '#/more', class: 'link' }, '‹ More'), h('h1', null, 'Savings goals'),
    goals.length ? h('div', { class: 'stack' }, goals.map((g) => h('div', { class: 'card stack' },
      h('strong', null, g.wallet.name),
      h('div', { class: 'row small' }, h('span', { style: { flex: 1 } }, `${formatTaka(g.saved)} of ${formatTaka(g.target)}`), h('span', null, g.done ? 'Reached! 🎉' : g.pct + '%')),
      h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': Math.min(100, g.pct), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('div', { style: { width: Math.min(100, g.pct) + '%', background: 'var(--green)' } })),
      h('div', { class: 'row scroll' },
        h('button', { class: 'btn small primary', onclick: () => openAddSheet(store, null, { type: 'transfer', toWalletId: g.wallet.id }) }, 'Add money'),
        h('button', { class: 'btn small', onclick: () => openAddSheet(store, null, { type: 'transfer', walletId: g.wallet.id }) }, 'Take out'),
        h('button', { class: 'btn small', onclick: () => { const t = ask('New target (৳)', String(g.target / 100)); if (t) patchWallet(g.wallet.id, { goal: { target: t } }); else if (t === 0) toast('Target must be above zero.'); } }, 'Change target'),
        h('button', { class: 'btn small', onclick: () => confirm('Stop tracking this goal? The wallet and its money stay.') && patchWallet(g.wallet.id, { goal: null }) }, 'Remove goal')))))
      : h('div', { class: 'card empty' }, h('p', null, 'No goals yet.'), h('p', { class: 'muted small' }, 'A goal is a savings wallet with a target. Adding money is a transfer from one of your wallets, stamped with the date and time.')),
    h('button', { class: 'btn primary wide', onclick: async () => {
      const name = prompt('What are you saving for?'); if (!name?.trim()) return; const t = ask('Target amount (৳)'); if (!t) return toast('Enter a target above zero.');
      const w = await store.dispatch({ type: 'wallet/add', name, kind: 'other', color: '#a67c1f' }); await patchWallet(w.id, { goal: { target: t } }); } }, '＋ New goal'));
}
