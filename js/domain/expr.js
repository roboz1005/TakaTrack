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
/** Keypad logic: returns the new amount string after pressing key k */
export function pressKey(amt, k) {
  if (k === '⌫') return amt.slice(0, -1);
  if (k === '=') { const v = evalExpr(amt); return v == null ? amt : plain(v); }
  if (k === '+' || k === '−' || k === '-') return /\d$/.test(amt) ? amt + (k === '+' ? '+' : '-') : amt;
  if (amt.length >= 24) return amt;
  const seg = amt.split(/[+-]/).pop();
  if (k === '.') return seg.includes('.') ? amt : amt + (seg === '' ? '0.' : '.');
  return /\.\d\d$/.test(seg) ? amt : amt + k;
}
