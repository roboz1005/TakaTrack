// Money = integer poisha (1 ৳ = 100 poisha). Pure, no DOM.
/** "1,200.75" -> 120075 ; invalid -> null */
export function parseTaka(input) {
  const s = String(input ?? '').trim().replace(/[,\s৳]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [w, f = ''] = s.split('.');
  const v = Number(w) * 100 + Number((f + '00').slice(0, 2));
  return Number.isSafeInteger(v) ? v : null;
}
/** Lakh/crore grouping: "1234567" -> "12,34,567" */
export function groupLakh(digits) {
  if (digits.length <= 3) return digits;
  return digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + digits.slice(-3);
}
let digitMode = 'latin';
export const setDigits = (m) => { digitMode = m === 'bangla' ? 'bangla' : 'latin'; };
/** Latin -> Bangla digits when the setting is on (display only; stored data is never changed) */
export const dg = (s) => (digitMode === 'bangla' ? String(s).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]) : s);
export function formatTaka(poisha, opts) { return dg(rawFormatTaka(poisha, opts)); }
function rawFormatTaka(poisha, { symbol = true, fixed = false } = {}) {
  const abs = Math.abs(poisha), whole = Math.floor(abs / 100), frac = abs % 100;
  let s = groupLakh(String(whole));
  if (frac) s += '.' + String(frac).padStart(2, '0');
  else if (fixed) s += '.00';
  return (poisha < 0 ? '-' : '') + (symbol ? '৳' : '') + s;
}
