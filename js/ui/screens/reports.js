import { h } from '../h.js';
import { bars } from './home.js';
import { trend } from '../trend.js';
import { formatTaka } from '../../domain/money.js';
import { periodSummary, categoryTotals, monthlySeries, dailySeries, weeklySeries } from '../../domain/ledger.js';
import { monthRange, periodAt, formatPeriod, weekdayShort, formatDayShort } from '../../domain/dates.js';

let off = 0;
let mode = 'week';   // trend view: 'week' = last 7 days, 'month' = the period above as 4 weeks + extra days, 'year' = 12 months
const MODES = [['week', '7 Days'], ['month', 'Month'], ['year', '12 Months']];
export function reportsScreen({ state, store }) {
  const sd = state.settings.monthStartDay,
    r = periodAt(Date.now(), off, sd),
    sum = periodSummary(state.txns, r.start, r.end),
    go = () => store.dispatch({ type: 'settings/update', patch: {} });
  const nm = (id) => state.categories.find((c) => c.id === id)?.name ?? 'Other';
  const block = (type, title, total) => {
    const rows = categoryTotals(state.txns, r.start, r.end, type);
    return h('div', { class: 'card stack' },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('strong', null, title),
        h('strong', { class: 'amount', style: { color: type === 'income' ? 'var(--green)' : 'var(--red)' } }, formatTaka(total))),
      rows.length ? bars(rows.map(([id, v]) => [`${nm(id)} · ${Math.round((100 * v) / (total || 1))}%`, v])) : h('p', { class: 'muted small empty' }, 'No data recorded.'));
  };

  // ---- trend card: three views of the same income-vs-expense bars
  const days = (a, b) => Math.round((b - a) / 86400000);
  const rangeText = (b) => (days(b.start, b.end) === 1 ? formatDayShort(b.start) : `${formatDayShort(b.start)} – ${formatDayShort(b.end - 1)}`);
  const rowOf = (name, note, b, strong) => h('div', { class: 'trend-row' + (strong ? ' strong' : '') },
    h('div', { class: 'trend-name' }, h('span', null, name), note && h('span', { class: 'muted small' }, note)),
    h('span', { class: 'amount trend-in' }, b.income ? formatTaka(b.income) : '—'),
    h('span', { class: 'amount trend-out' }, b.expense ? formatTaka(b.expense) : '—'));
  const header = h('div', { class: 'trend-row trend-head muted small' }, h('span', null, ''), h('span', { class: 'amount' }, 'In'), h('span', { class: 'amount' }, 'Out'));
  let title, chart, table;
  if (mode === 'week') {
    const week = dailySeries(state.txns, Date.now(), 7);
    title = 'Last 7 Days';
    chart = trend(week, { label: (d) => weekdayShort(d.start), sub: (d) => String(new Date(d.start).getDate()), strong: week.length - 1, aria: 'Income vs expense, last 7 days',
      tip: (d) => `${weekdayShort(d.start)} ${formatDayShort(d.start)} · In ${formatTaka(d.income)} · Out ${formatTaka(d.expense)}` });
    table = [header, ...week.map((d, i) => rowOf(i === week.length - 1 ? 'Today' : weekdayShort(d.start), formatDayShort(d.start), d, i === week.length - 1))];
  } else if (mode === 'month') {
    const weeks = weeklySeries(state.txns, r.start, r.end), name = (b) => (b.extra ? `+${days(b.start, b.end)} day${days(b.start, b.end) > 1 ? 's' : ''}` : `W${b.week}`);
    title = `${formatPeriod(r, sd)} by week`;
    chart = trend(weeks, { label: name, sub: (b) => `${new Date(b.start).getDate()}–${new Date(b.end - 1).getDate()}`, aria: 'Income vs expense by week, 4 weeks plus extra days',
      tip: (b) => `${rangeText(b)} · In ${formatTaka(b.income)} · Out ${formatTaka(b.expense)}` });
    table = [header, ...weeks.map((b) => rowOf(b.extra ? `Extra ${days(b.start, b.end)} day${days(b.start, b.end) > 1 ? 's' : ''}` : `Week ${b.week}`, rangeText(b), b))];
  } else {
    title = 'Last 12 Months';
    chart = trend(monthlySeries(state.txns, Date.now(), sd, 12, monthRange), { aria: 'Income vs expense, last 12 months' });
    table = [];
  }
  const trendCard = h('div', { class: 'card stack' },
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Trend range' },
      MODES.map(([id, l]) => h('button', { class: mode === id ? 'chip on' : 'chip', type: 'button', 'aria-pressed': mode === id, onclick: () => { mode = id; go(); } }, l))),
    h('strong', null, title),
    h('div', { class: 'muted small' }, mode === 'month' ? 'Green = in · Red = out. Uses the period selected above: 7-day weeks, leftover days form the last bar.' : 'Green = in · Red = out'),
    chart,
    table.length > 0 && h('div', { class: 'trend-table' }, table));

  return h('div', { class: 'stack' },
    h('a', { href: '#/more', class: 'link' }, '‹ More'),
    h('h1', null, 'Analytics & Reports'),
    h('div', { class: 'card' },
      h('div', { class: 'row', style: { marginBottom: '8px' } },
        h('button', { class: 'icon-btn', 'aria-label': 'Previous period', onclick: () => { off++; go(); } }, '◀'),
        h('strong', { style: { flex: 1, textAlign: 'center', fontSize: '1rem' } }, formatPeriod(r, sd)),
        h('button', { class: 'icon-btn', 'aria-label': 'Next period', disabled: off === 0, onclick: () => { off = Math.max(0, off - 1); go(); } }, '▶')),
      h('div', { class: 'row wrap', style: { justifyContent: 'space-around', padding: '8px 0', borderTop: '1px solid var(--line-subtle)' } },
        h('div', { class: 'right' }, h('div', { class: 'muted small' }, 'Income'), h('div', { class: 'amount', style: { color: 'var(--green)' } }, formatTaka(sum.income))),
        h('div', { class: 'right' }, h('div', { class: 'muted small' }, 'Expense'), h('div', { class: 'amount', style: { color: 'var(--red)' } }, formatTaka(sum.expense))),
        h('div', { class: 'right' }, h('div', { class: 'muted small' }, 'Net Cash'), h('div', { class: 'amount' }, formatTaka(sum.net))))),
    trendCard,
    block('expense', 'Spending by Category', sum.expense),
    block('income', 'Income by Category', sum.income));
}
