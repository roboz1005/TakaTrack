// Amount expressions like "30+20" or "100-30.5". Integer poisha only; parsed by hand, no dynamic code execution.
import { parseTaka } from './money.js';
/** -> poisha (> 0) or null if empty/invalid/not positive */
export function evalExpr(s) {
  if (!/^\d[\d.]*([+-]\d[\d.]*)*$/.test(s)) return null;
  const nums = s.split(/[+-]/), ops = s.match(/[+-]/g) || [];
  let total = parseTaka(nums[0]); if (total == null) return null;
  for (let i = 0; i < ops.length; i++) { const v = parseTaka(nums[i + 1]); if (v == null) return null; total += ops[i] === '+' ? v : -v; }
  return total > 0 ? total : null;
}
export const plain = (p) => `${Math.floor(p / 100)}${p % 100 ? '.' + String(p % 100).padStart(2, '0').replace(/0$/, '') : ''}`;
const isOp = (c) => c === '+' || c === '-';
const MAX = 60;
/** Clean typed/pasted text into a valid-looking expression: digits, one '.' and max 2 decimals per number, single operators, no leading operator */
export function sanitizeExpr(raw) {
  let out = '';
  for (const c0 of String(raw)) {
    const c = c0 === '−' || c0 === '–' ? '-' : c0, seg = out.split(/[+-]/).pop();
    if (/\d/.test(c)) { if (/\.\d\d$/.test(seg)) continue; out += c; }
    else if (c === '.') { if (seg.includes('.')) continue; out += seg === '' ? '0.' : '.'; }
    else if (isOp(c)) { if (out === '') continue; out = isOp(out.at(-1)) ? out.slice(0, -1) + c : out + c; }
    if (out.length >= MAX) break;
  }
  return out;
}
/** Keypad press at the caret/selection [start,end]. Returns { amt, caret } */
export function pressKeyAt(amt, k, start = amt.length, end = start) {
  const a = Math.max(0, Math.min(start, end, amt.length)), b = Math.min(amt.length, Math.max(start, end)), same = { amt, caret: a };
  if (k === '⌫') { const from = a === b ? a - 1 : a; if (from < 0) return same; return { amt: amt.slice(0, from) + amt.slice(b), caret: from }; }
  if (k === '=') { const v = evalExpr(amt), r = v == null ? amt : plain(v); return { amt: r, caret: r.length }; }
  const left = amt.slice(0, a), right = amt.slice(b), fit = (r, caret) => (r.length > MAX ? same : { amt: r, caret });
  if (k === '+' || k === '−' || k === '-') return /\d$/.test(left) && !isOp(right[0] ?? '') ? fit(left + (k === '+' ? '+' : '-') + right, a + 1) : same;
  const segL = left.split(/[+-]/).pop(), segR = right.split(/[+-]/)[0], seg = segL + segR, dot = seg.indexOf('.');
  if (k === '.') return dot >= 0 ? same : fit(left + (segL === '' ? '0.' : '.') + right, a + (segL === '' ? 2 : 1));
  if (dot >= 0 && segL.length > dot && seg.length - dot - 1 >= 2) return same;   // caret inside decimals that are already full
  return fit(left + k + right, a + 1);
}
/** Keypad press at the end of the text (kept for simple callers/tests) */
export const pressKey = (amt, k) => pressKeyAt(amt, k).amt;
