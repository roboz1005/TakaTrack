// Income (green) vs expense (red) paired bars as inline SVG. One bar pair per bucket: a day, a week, or a month.
//   series: [{ start, end, income, expense }]
//   opts.label(b) -> text under each pair; opts.sub(b) -> optional second line; opts.tip(b) -> hover/long-press text
//   opts.strong -> index of the bucket to emphasise (e.g. today)
import { dg } from '../domain/money.js';
const NS = 'http://www.w3.org/2000/svg';
const monthLabel = (b) => new Date(b.end - 1).toLocaleString('en', { month: 'short' }).slice(0, 3);
export function trend(series, { label = monthLabel, sub = null, tip = null, strong = -1, aria = 'Income vs expense' } = {}) {
  const n = Math.max(1, series.length), step = 300 / n, bw = Math.min(14, step * 0.36), H = sub ? 102 : 90;
  const max = Math.max(1, ...series.flatMap((b) => [b.income, b.expense]));
  const el = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svg = el('svg', { viewBox: `0 0 300 ${H}`, class: 'bars trend', role: 'img', 'aria-label': aria });
  svg.style.width = '100%'; svg.style.height = 'auto';
  svg.append(el('line', { x1: 0, y1: 68, x2: 300, y2: 68, stroke: 'var(--line)', 'stroke-width': 1 }));
  series.forEach((b, i) => {
    const g = el('g', {}), x = i * step + (step - (2 * bw + 2)) / 2, strongOne = i === strong;
    if (tip) { const t = el('title', {}); t.textContent = tip(b); g.append(t); }
    for (const [j, v, c] of [[0, b.income, 'var(--green)'], [1, b.expense, 'var(--red)']]) {
      const hh = Math.max((56 * v) / max, v ? 3 : 0);
      g.append(el('rect', { x: x + j * (bw + 2), y: 68 - hh, width: bw, height: hh, rx: 3, fill: c }));
    }
    const text = (y, s, size, weight, fill) => { const t = el('text', { x: x + bw + 1, y, 'text-anchor': 'middle', 'font-size': size, 'font-weight': weight, fill, 'font-family': 'var(--font)' }); t.textContent = dg(s); return t; };
    g.append(text(82, label(b), 10, strongOne ? '700' : '500', strongOne ? 'var(--ink)' : 'var(--muted)'));
    if (sub) g.append(text(95, sub(b), 8, '500', 'var(--muted-light)'));
    svg.append(g);
  });
  return svg;
}
