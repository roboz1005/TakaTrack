import { h } from '../h.js';
import { toast } from '../toast.js';
import { doExport, doExportEncrypted, doCsv, pickImport } from '../../backup.js';
import { walletBalances } from '../../domain/ledger.js';
import { formatTaka, parseTaka } from '../../domain/money.js';
import { hashPin, verifyPin, validPin } from '../../domain/pin.js';
import { daysSinceBackup } from '../../domain/backup.js';

export function settingsScreen({ state, store }) {
  const s = state.settings, set = (patch) => store.dispatch({ type: 'settings/update', patch });
  const toggle = (label, key) => h('label', { class: 'card trow' }, h('span', null, label), h('input', { type: 'checkbox', checked: s[key] ? true : null, onchange: (e) => set({ [key]: e.target.checked }) }));
  const bal = walletBalances(state.wallets, state.txns);
  async function reconcile(w) {
    const v = prompt(`Real balance of ${w.name} (৳)? App says ${formatTaka(bal.get(w.id))}`), real = v == null ? null : parseTaka(v);
    if (v == null) return; if (real == null) return toast('Enter a valid amount.');
    const diff = real - bal.get(w.id); if (!diff) return toast('Already matches.');
    await store.dispatch({ type: 'txn/add', txn: { type: 'adjust', amount: diff, walletId: w.id, note: 'Reconcile' } });   // stamped now
    toast('Adjusted by ' + formatTaka(diff));
  }
  async function pin() {
    if (s.pinHash) { const cur = prompt('Enter current PIN to remove it'); if (cur == null) return; if (!(await verifyPin(cur, s))) return toast('Wrong PIN.'); await set({ pinHash: null, pinSalt: null }); return toast('PIN removed.'); }
    const p = prompt('Choose a PIN (4–8 digits). It only keeps casual eyes out; it is not encryption.'); if (p == null) return;
    if (!validPin(p)) return toast('PIN must be 4–8 digits.'); if (prompt('Repeat the PIN') !== p) return toast('PINs did not match.');
    await set(await hashPin(p)); toast('PIN set. The app locks after 30 s in the background.');
  }
  const limitOf = (id) => state.budgets.find((b) => b.categoryId === id)?.monthlyLimit ?? 0;
  const last = daysSinceBackup(s);
  return h('div', null, h('a', { href: '#/more', class: 'link' }, '‹ More'), h('h1', null, 'Settings'),
    h('div', { class: 'stack' },
      toggle('Tap a category or person to save instantly (skips the Add button)', 'fastSaveTap'), toggle('Open straight into Add', 'launchIntoAdd'), toggle('Hide balances', 'hideBalances'),
      h('label', { class: 'card trow' }, h('span', null, 'Time format'), h('select', { class: 'input', style: { width: 'auto' }, onchange: (e) => set({ timeFormat: e.target.value }) },
        [['12h', '12-hour (AM/PM)'], ['24h', '24-hour']].map(([v, l]) => h('option', { value: v, selected: v === (s.timeFormat === '24h' ? '24h' : '12h') ? true : null }, l)))),
      h('label', { class: 'card trow' }, h('span', null, 'Month starts on day'), h('input', { class: 'input', style: { width: '5rem' }, type: 'number', min: 1, max: 28, value: s.monthStartDay, onchange: (e) => set({ monthStartDay: Math.min(28, Math.max(1, Number(e.target.value) || 1)) }) }))),
    h('div', { class: 'stack' }, h('label', { class: 'card trow' }, h('span', null, 'Theme'), h('select', { class: 'input', style: { width: 'auto' }, onchange: (e) => set({ theme: e.target.value }) }, ['auto', 'light', 'dark'].map((v) => h('option', { value: v, selected: v === s.theme ? true : null }, v)))),
      h('label', { class: 'card trow' }, h('span', null, 'Digits'), h('select', { class: 'input', style: { width: 'auto' }, onchange: (e) => set({ digits: e.target.value }) }, [['latin', '1234'], ['bangla', '১২৩৪']].map(([v, l]) => h('option', { value: v, selected: v === (s.digits ?? 'latin') ? true : null }, l)))),
      h('button', { class: 'card trow', onclick: pin }, h('span', null, 'PIN lock'), h('span', { class: 'muted' }, s.pinHash ? 'On — tap to remove' : 'Off — tap to set'))),
    h('h2', { class: 'dayhead' }, 'Monthly budgets'),
    h('div', { class: 'stack' }, state.categories.filter((c) => c.kind === 'expense' && !c.archived).map((c) => h('button', { class: 'card trow', onclick: () => { const v = prompt(`Monthly limit for ${c.name} (৳, 0 = none)`, String(limitOf(c.id) / 100)); const a = v == null ? null : parseTaka(v); if (v == null) return; if (a == null) return toast('Enter a valid amount.'); store.dispatch({ type: 'budget/set', categoryId: c.id, monthlyLimit: a }); } }, h('span', null, c.name), h('span', { class: 'muted' }, limitOf(c.id) ? formatTaka(limitOf(c.id)) : 'No limit')))),
    h('h2', { class: 'dayhead' }, 'Backup'), h('p', { class: 'muted small' }, last === null ? 'Never backed up.' : `Last backup ${last} day(s) ago.`),
    h('div', { class: 'stack' }, h('button', { class: 'btn', onclick: () => doExport(store) }, 'Export JSON backup'), h('button', { class: 'btn', onclick: () => doCsv(store) }, 'Export CSV'), h('button', { class: 'btn', onclick: () => doExportEncrypted(store) }, 'Export encrypted backup'), h('button', { class: 'btn', onclick: () => pickImport(store) }, 'Import backup (plain or encrypted)')),
    h('h2', { class: 'dayhead' }, 'Reconcile a wallet'), h('div', { class: 'stack' }, state.wallets.filter((w) => !w.archived).map((w) => h('button', { class: 'card trow', onclick: () => reconcile(w) }, h('span', null, w.name), h('span', { class: 'amount' }, formatTaka(bal.get(w.id)))))),
    h('p', { class: 'muted small' }, 'TakaTrack · data stays on this device.'));
}
