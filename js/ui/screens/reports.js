import { h } from '../h.js';
import { bars, trend } from './home.js';
import { formatTaka } from '../../domain/money.js';
import { periodSummary, categoryTotals, monthlySeries } from '../../domain/ledger.js';
import { monthRange, periodAt, formatPeriod } from '../../domain/dates.js';

let off = 0;
export function reportsScreen({ state, store }) {
  const sd = state.settings.monthStartDay, r = periodAt(Date.now(), off, sd), sum = periodSummary(state.txns, r.start, r.end), go = () => store.dispatch({ type: 'settings/update', patch: {} });
  const nm = (id) => state.categories.find((c) => c.id === id)?.name ?? 'Other';
  const block = (type, title, total) => { const rows = categoryTotals(state.txns, r.start, r.end, type);
    return h('div', { class: 'card' }, h('strong', null, `${title} ${formatTaka(total)}`), rows.length ? bars(rows.map(([id, v]) => [`${nm(id)} · ${Math.round((100 * v) / total)}%`, v])) : h('p', { class: 'muted small' }, 'Nothing recorded.')); };
  return h('div', null, h('a', { href: '#/more', class: 'link' }, '‹ More'), h('h1', null, 'Reports'),
    h('div', { class: 'row' }, h('button', { class: 'chip', 'aria-label': 'Previous period', onclick: () => { off++; go(); } }, '◀'), h('strong', { style: { flex: 1, textAlign: 'center' } }, formatPeriod(r, sd)),
      h('button', { class: 'chip', 'aria-label': 'Next period', disabled: off === 0, onclick: () => { off = Math.max(0, off - 1); go(); } }, '▶')),
    h('p', null, `In ${formatTaka(sum.income)} · Out ${formatTaka(sum.expense)} · Net ${formatTaka(sum.net)}`),
    h('div', { class: 'stack' }, block('expense', 'Spending', sum.expense), block('income', 'Income', sum.income),
      h('div', { class: 'card' }, h('strong', null, 'Last 12 months'), h('div', { class: 'muted small' }, 'Green = in, red = out'), trend(monthlySeries(state.txns, Date.now(), sd, 12, monthRange)))));
}
