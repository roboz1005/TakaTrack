// Dates = epoch ms, shown in device-local time. Formatting is manual (no ICU variance).
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
import { dg } from './money.js';
const p2 = (n) => String(n).padStart(2, '0');

export function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
export function startOfDay(ts) { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
export function localDate(ts) { return dayKey(ts); }
export function localTime(ts) { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; }

function use12h(timeFormat) {
  return timeFormat !== '24h';   // AM/PM is the default (old 'auto' setting counts as 12-hour)
}
/** "3:45 PM" or "15:45" */
export function formatTime(ts, timeFormat = 'auto') {
  const d = new Date(ts), h = d.getHours(), m = p2(d.getMinutes());
  return dg(use12h(timeFormat) ? `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}` : `${p2(h)}:${m}`);
}
/** "Mon, 26 Oct 2026" (day header) */
export function formatDay(ts) { const d = new Date(ts); return dg(`${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`); }
/** "26 Oct 2026, 3:45 PM" (detail) */
export function formatDateTime(ts, timeFormat = 'auto') {
  const d = new Date(ts);
  return dg(`${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${formatTime(ts, timeFormat)}`);
}
/** "Today 3:45 PM" / "Yesterday 9:10 AM" / "24 Oct" (+ year if not this year) */
export function formatRecent(ts, now = Date.now(), timeFormat = 'auto') { return dg(recentRaw(ts, now, timeFormat)); }
function recentRaw(ts, now, timeFormat) {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / 86400000);
  if (diff === 0) return `Today ${formatTime(ts, timeFormat)}`;
  if (diff === 1) return `Yesterday ${formatTime(ts, timeFormat)}`;
  const d = new Date(ts), y = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MON[d.getMonth()]}${y}`;
}
/** "2026-10-26T15:45:00+06:00" */
export function toISOWithOffset(ts) {
  const d = new Date(ts), off = -d.getTimezoneOffset(), a = Math.abs(off);
  return `${dayKey(ts)}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}${off < 0 ? '-' : '+'}${p2(Math.floor(a / 60))}:${p2(a % 60)}`;
}
/** Period containing ts, [start, end) — starts on `startDay` (clamped to short months). */
export function monthRange(ts, startDay = 1) {
  const startOf = (y, m) => new Date(y, m, Math.min(startDay, new Date(y, m + 1, 0).getDate())).getTime();
  const t = new Date(ts); let y = t.getFullYear(), m = t.getMonth(), start = startOf(y, m);
  if (ts < start) { m -= 1; if (m < 0) { m = 11; y -= 1; } start = startOf(y, m); }
  const ny = m === 11 ? y + 1 : y, nm = (m + 1) % 12;
  return { start, end: startOf(ny, nm) };
}
/** Newest first; ties by createdAt. Returns [{key, ts, items}] grouped by local day. */
export function groupByDay(txns) {
  const sorted = [...txns].sort((a, b) => b.ts - a.ts || b.createdAt - a.createdAt);
  const groups = [];
  for (const t of sorted) {
    const key = dayKey(t.ts), g = groups[groups.length - 1];
    if (g && g.key === key) g.items.push(t); else groups.push({ key, ts: t.ts, items: [t] });
  }
  return groups;
}
const LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
/** The period `offset` periods before the one containing `now` */
export function periodAt(now, offset = 0, startDay = 1) { let r = monthRange(now, startDay); for (let i = 0; i < offset; i++) r = monthRange(r.start - 1, startDay); return r; }
/** "October 2026" (day-1 months) or "25 Sep – 24 Oct" (custom start day) */
export function formatPeriod({ start, end }, startDay = 1) {
  const s = new Date(start), e = new Date(end - 1);
  return dg(startDay === 1 ? `${LONG[s.getMonth()]} ${s.getFullYear()}` : `${s.getDate()} ${MON[s.getMonth()]} – ${e.getDate()} ${MON[e.getMonth()]}`);
}
