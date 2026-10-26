import { h } from '../h.js';
import { templateChips } from '../templates.js';
import { formatTaka as rawTaka } from '../../domain/money.js';
import { backupDue, daysSinceBackup } from '../../domain/backup.js';
import { doExport } from '../../backup.js';
let hide = false;
const formatTaka = (v) => (hide ? '৳ ••••' : rawTaka(v));
import { walletBalances, totals, periodSummary, categoryTotals, monthlySeries, budgetProgress, dueSoon } from '../../domain/ledger.js';
import { monthRange, periodAt, formatPeriod, formatRecent } from '../../domain/dates.js';

export function trend(series) {   // 6-month income (green) vs expense (red) mini bars, inline SVG
  const n = series.length, step = 300 / n, bw = Math.min(16, step * 0.38), max = Math.max(1, ...series.flatMap((m) => [m.income, m.expense])), svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 90'); svg.setAttribute('class', 'bars'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Income vs expense, last 6 months');
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  series.forEach((m, i) => { const x = i * step + step * 0.12;
    for (const [j, v, c] of [[0, m.income, '#2e7d32'], [1, m.expense, '#c62828']]) { const hh = 60 * v / max; svg.append(el('rect', { x: x + j * (bw + 2), y: 66 - hh, width: bw, height: Math.max(hh, v ? 2 : 0), rx: 3, fill: c })); }
    const t = el('text', { x: x + bw + 1, y: 84, 'text-anchor': 'middle', 'font-size': 10, fill: 'currentColor' }); t.textContent = new Date(m.end - 1).toLocaleString('en', { month: 'short' }).slice(0, n > 8 ? 1 : 3); svg.append(t); });
  return svg;
}
let offset = 0;   // months back from now
const NS = 'http://www.w3.org/2000/svg';
export function bars(rows) {   // inline SVG horizontal bars
  const max = Math.max(1, ...rows.map((r) => r[1])), svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 300 ${rows.length * 26}`); svg.setAttribute('class', 'bars'); svg.setAttribute('role', 'img');
  rows.forEach(([label, v], i) => {
    const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', 0); r.setAttribute('y', i * 26 + 14); r.setAttribute('height', 8); r.setAttribute('rx', 4); r.setAttribute('width', Math.max(2, 300 * v / max)); r.setAttribute('fill', 'currentColor');
    const t = document.createElementNS(NS, 'text'); t.setAttribute('x', 0); t.setAttribute('y', i * 26 + 10); t.setAttribute('font-size', 11); t.setAttribute('fill', 'currentColor'); t.textContent = `${label} · ${formatTaka(v)}`;
    svg.append(t, r);
  });
  return svg;
}
export function homeScreen({ state, store }) {
  hide = !!state.settings.hideBalances;
  const t = totals(state.wallets, state.txns), bal = walletBalances(state.wallets, state.txns), f = state.settings.timeFormat;
  const { start, end } = periodAt(Date.now(), offset, state.settings.monthStartDay), sum = periodSummary(state.txns, start, end);
  const cats = categoryTotals(state.txns, start, end).slice(0, 5).map(([id, v]) => [state.categories.find((c) => c.id === id)?.name ?? 'Other', v]);
  const recent = state.txns.filter((x) => !x.deletedAt).sort((a, b) => b.ts - a.ts || b.createdAt - a.createdAt).slice(0, 5);
  const go = () => store.dispatch({ type: 'settings/update', patch: {} });
  return h('div', null,
    backupDue(state) && h('div', { class: 'card row' }, h('span', { style: { flex: 1 } }, daysSinceBackup(state.settings) === null ? 'You have not backed up yet.' : `Last backup ${daysSinceBackup(state.settings)} days ago.`), h('button', { class: 'btn small primary', onclick: () => doExport(store) }, 'Back up')),
    h('section', { class: 'hero' }, h('div', { class: 'muted row' }, 'Total money', h('button', { class: 'link', 'aria-label': 'Hide or show balances', onclick: () => store.dispatch({ type: 'settings/update', patch: { hideBalances: !hide } }) }, hide ? '🙈' : '👁')), h('div', { class: 'big' }, formatTaka(t.walletsTotal))),
    h('div', { class: 'row' }, h('a', { class: 'chip', href: '#/people' }, 'To receive ' + formatTaka(t.toReceive)), h('a', { class: 'chip', href: '#/people' }, 'To pay ' + formatTaka(t.toPay))),
    h('div', { class: 'muted small' }, 'Net worth ' + formatTaka(t.netWorth)),
    state.templates.length > 0 && h('div', { class: 'row scroll' }, templateChips(store, state.templates)),
    h('div', { class: 'strip' }, state.wallets.filter((w) => !w.archived).map((w) => h('div', { class: 'card mini', style: { borderTopColor: w.color } }, h('div', { class: 'muted small' }, w.name), h('div', { class: 'amount' }, formatTaka(bal.get(w.id)))))),
    h('div', { class: 'card' }, h('div', { class: 'row' }, h('button', { class: 'chip', 'aria-label': 'Previous month', onclick: () => { offset++; go(); } }, '◀'),
      h('strong', { style: { flex: 1, textAlign: 'center' } }, formatPeriod({ start, end }, state.settings.monthStartDay)), h('button', { class: 'chip', 'aria-label': 'Next month', disabled: offset === 0, onclick: () => { offset = Math.max(0, offset - 1); go(); } }, '▶')),
      h('p', null, `In ${formatTaka(sum.income)} · Out ${formatTaka(sum.expense)} · Net ${formatTaka(sum.net)}`), cats.length ? bars(cats) : h('p', { class: 'muted small' }, 'No spending this month.')),
    h('div', { class: 'card' }, h('strong', null, 'Last 6 months'), h('div', { class: 'muted small' }, 'Green = in, red = out'), trend(monthlySeries(state.txns, Date.now(), state.settings.monthStartDay, 6, monthRange))),
    (() => { const bp = budgetProgress(state.budgets, state.txns, start, end); return bp.length > 0 && h('div', { class: 'card' }, h('strong', null, 'Budgets'),
      bp.map((b) => h('div', { class: 'stack' }, h('div', { class: 'row small' }, h('span', { style: { flex: 1 } }, state.categories.find((c) => c.id === b.categoryId)?.name), h('span', { style: { color: b.over ? 'var(--red)' : 'inherit' } }, `${formatTaka(b.spent)} / ${formatTaka(b.limit)}`)),
        h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': Math.min(100, b.pct), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('div', { style: { width: Math.min(100, b.pct) + '%', background: b.over ? 'var(--red)' : 'var(--green)' } }))))); })(),
    (() => { const due = dueSoon(state.txns, Date.now()); return due.length > 0 && h('div', { class: 'card' }, h('strong', null, 'Due soon'),
      due.map((d) => { const p = state.people.find((x) => x.id === d.personId); return h('a', { class: 'row small', href: '#/person/' + d.personId, style: { padding: '6px 0' } },
        h('span', { style: { flex: 1 } }, d.balance > 0 ? `${p?.name} owes you ${formatTaka(d.balance)}` : `You owe ${p?.name} ${formatTaka(-d.balance)}`), h('span', { style: { color: d.overdue ? 'var(--red)' : 'inherit' } }, (d.overdue ? 'Overdue · ' : '') + formatRecent(d.txn.dueTs, Date.now(), f).replace(/ \d.*$/, ''))); })); })(),
    h('h2', { class: 'dayhead' }, 'Recent'),
    recent.length ? h('div', { class: 'stack' }, recent.map((x) => h('div', { class: 'card trow' }, h('div', null, h('strong', null, state.categories.find((c) => c.id === x.categoryId)?.name ?? x.type), h('div', { class: 'muted small' }, formatRecent(x.ts, Date.now(), f))), h('div', { class: 'amount' }, formatTaka(x.amount)))))
      : h('div', { class: 'card empty' }, h('p', null, 'No transactions yet. Tap + to add your first.')));
}
