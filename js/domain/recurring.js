// Recurring rules. rule = { freq:'monthly'|'weekly', day (1-31 or 0-6 weekday), hour, minute }. Pure.
const at = (y, m, day, hour = 9, minute = 0) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()), hour, minute).getTime();
/** First occurrence at or after `from` */
export function firstDue(rule, from) {
  const d = new Date(from), h = rule.hour ?? 9, mi = rule.minute ?? 0;
  if (rule.freq === 'weekly') { for (let i = 0; i < 8; i++) { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, h, mi); if (c.getDay() === rule.day && c.getTime() >= from) return c.getTime(); } }
  const c = at(d.getFullYear(), d.getMonth(), rule.day, h, mi); return c >= from ? c : at(d.getFullYear(), d.getMonth() + 1, rule.day, h, mi);
}
/** Occurrence after the one at `ts` */
export function nextAfter(rule, ts) {
  const d = new Date(ts), h = rule.hour ?? 9, mi = rule.minute ?? 0;
  return rule.freq === 'weekly' ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, h, mi).getTime() : at(d.getFullYear(), d.getMonth() + 1, rule.day, h, mi);
}
/** All occurrences due by `now` starting at nextDue, plus the new nextDue */
export function occurrencesUntil(rule, nextDue, now, cap = 500) {
  const due = []; let n = nextDue;
  while (n <= now && due.length < cap) { due.push(n); n = nextAfter(rule, n); }
  return { due, next: n };
}
export function describeRule(rule) {
  const t = `${String(rule.hour ?? 9).padStart(2, '0')}:${String(rule.minute ?? 0).padStart(2, '0')}`;
  return rule.freq === 'weekly' ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][rule.day]} at ${t}` : `Monthly on day ${rule.day} at ${t}`;
}
