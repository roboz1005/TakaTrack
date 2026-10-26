// Quick-add bottom sheet. Lives in its own overlay so store re-renders never interrupt typing (§5).
import { h } from './h.js';
import { toast } from './toast.js';
import { addPersonUI } from './personActions.js';
import { templateChips, logTemplate } from './templates.js';
import { formatTaka } from '../domain/money.js';
import { evalExpr, pressKey, plain } from '../domain/expr.js';
import { rankCategories, defaultWallet } from '../domain/suggest.js';
import { formatRecent, localDate, localTime } from '../domain/dates.js';

const TYPES = [['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Transfer'], ['debt', 'Debt']];
const DEBT = ['lend', 'borrow', 'repay_in', 'repay_out'];
const DEBT_LABELS = [['lend', 'I lent'], ['borrow', 'I borrowed'], ['repay_in', 'They paid me'], ['repay_out', 'I paid back']];
const pad = ['7', '8', '9', '⌫', '4', '5', '6', '+', '1', '2', '3', '−', '.', '0', '='];

export function openAddSheet(store, edit = null, preset = null) {
  const st = () => store.state();
  const isDebt = DEBT.includes(edit?.type);
  const m = { type: isDebt ? 'debt' : (edit?.type ?? 'expense'), debt: isDebt ? edit.type : 'lend', personId: edit?.personId ?? null, categoryId: edit?.categoryId ?? null, noWallet: isDebt && !edit.walletId, due: edit?.dueTs ? localDate(edit.dueTs) : '', amt: edit ? String(edit.amount / 100) : '', walletId: edit?.walletId ?? null, toWalletId: edit?.toWalletId ?? null,
    note: edit?.note ?? '', pinned: edit ? edit.ts : null, more: false, fee: '' };
  if (preset) Object.assign(m, preset);
  if (!m.walletId && !m.noWallet) m.walletId = defaultWallet(st().settings, st().wallets, m.type);
  if (m.toWalletId && m.walletId === m.toWalletId) m.walletId = st().wallets.find((w) => !w.archived && w.id !== m.toWalletId)?.id ?? null;
  const ts = () => m.pinned ?? Date.now();                       // live "now" unless the user pinned a moment
  const wallets = () => st().wallets.filter((w) => !w.archived);
  const cats = () => st().categories.filter((c) => c.kind === m.type && !c.archived);
  const amount = () => evalExpr(m.amt) ?? 0;
  const close = () => ov.remove();

  async function save(categoryId, personId = null) {
    const a = amount();
    if (!a) { sheet.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); return; }
    if (ts() > Date.now() + 60000 && !confirm('This date/time is in the future. Save anyway?')) return;
    const base = { type: m.type, amount: a, walletId: m.walletId, categoryId: categoryId ?? null, note: m.note, ts: ts() };
    if (m.type === 'debt') Object.assign(base, { type: m.debt, personId: personId ?? m.personId, categoryId: null, walletId: m.noWallet ? null : m.walletId, dueTs: (m.debt === 'lend' || m.debt === 'borrow') && m.due ? new Date(m.due + 'T23:59:59.999').getTime() : null });
    if (m.type === 'transfer') {
      if (!m.toWalletId || m.toWalletId === m.walletId) return toast('Pick a different destination wallet.');
      Object.assign(base, { toWalletId: m.toWalletId, categoryId: null });
    }
    if (edit) await store.dispatch({ type: 'txn/update', id: edit.id, patch: base });
    else {
      const t = await store.dispatch({ type: 'txn/add', txn: base });
      const fee = evalExpr(m.fee);
      if (m.type === 'transfer' && fee) {   // fee leg shares the transfer's ts and linkId
        const fc = st().categories.find((c) => c.name === 'Fees & Charges' && c.kind === 'expense');
        await store.dispatch({ type: 'txn/add', txn: { type: 'expense', amount: fee, walletId: m.walletId, categoryId: fc?.id ?? null, ts: t.ts, linkId: t.id, note: 'Transfer fee' } });
      }
      await store.dispatch({ type: 'settings/update', patch: { lastUsed: { ...st().settings.lastUsed, [m.type]: { walletId: m.walletId, categoryId } } } });
      const w = st().wallets.find((x) => x.id === m.walletId), c = st().categories.find((x) => x.id === categoryId);
      toastUndo(`Saved ${formatTaka(a)} · ${c?.name ?? m.type} · ${w?.name ?? ''}`, t.id);
    }
    close();
  }
  /** chosen category, else the best suggestion for this amount/wallet */
  function selectedCat() {
    if (m.categoryId) return m.categoryId;
    const ids = new Set(cats().map((c) => c.id));
    return rankCategories(st().txns, { type: m.type, amount: amount(), walletId: m.walletId }).find((id) => ids.has(id)) ?? null;
  }
  function onAdd() {
    if (m.type === 'transfer') return save(null);
    if (m.type === 'debt') return m.personId ? save(null, m.personId) : toast('Pick a person first.');
    const c = selectedCat(); return c ? save(c) : toast('Pick a category first.');
  }
  function debtUi() {
    const people = st().people.filter((p) => !p.archived).sort((a, b) => b.createdAt - a.createdAt);
    return h('div', { class: 'stack' },
      h('div', { class: 'row scroll' }, DEBT_LABELS.map(([id, l]) => h('button', { class: m.debt === id ? 'chip on' : 'chip', onclick: () => { m.debt = id; draw(); } }, l)),
        h('button', { class: m.noWallet ? 'chip on' : 'chip', onclick: () => { m.noWallet = !m.noWallet; draw(); } }, 'No wallet')),
      (m.debt === 'lend' || m.debt === 'borrow') && h('label', { class: 'row small' }, 'Due date (optional)', h('input', { class: 'input', type: 'date', value: m.due, onchange: (e) => { m.due = e.target.value; } })),
      h('div', { class: 'grid' }, people.map((p) => h('button', { class: m.personId === p.id ? 'chip on' : 'chip', onclick: () => { m.personId = p.id; if (st().settings.fastSaveTap) save(null, p.id); else draw(); } }, p.name)),
        h('button', { class: 'chip', onclick: async () => { const n = prompt('Person name'); if (n?.trim()) { const p = await addPersonUI(store, n); if (p) { m.personId = p.id; draw(); } } } }, '＋ New person')));
  }
  function toastUndo(msg, id) {
    document.querySelector('.toast')?.remove();
    const el = h('div', { class: 'toast', role: 'status' }, h('span', null, msg),
      h('button', { class: 'btn small', onclick: () => { store.dispatch({ type: 'txn/delete', id }); el.remove(); } }, 'Undo'),
      h('button', { class: 'btn small', onclick: () => { el.remove(); openAddSheet(store, st().txns.find((t) => t.id === id)); } }, 'Edit'));
    document.body.append(el); setTimeout(() => el.remove(), 5000);
  }

  const ov = h('div', { class: 'overlay', onclick: (e) => e.target === ov && close() });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Add transaction' });
  ov.append(sheet);
  function draw() {
    const ranked = rankCategories(st().txns, { type: m.type, amount: amount(), walletId: m.walletId });
    const list = cats().sort((a, b) => (ranked.indexOf(a.id) + 1 || 99) - (ranked.indexOf(b.id) + 1 || 99));
    const shown = m.more ? list : list.slice(0, 8), sel = selectedCat();
    sheet.replaceChildren(
      !edit && st().templates.length > 0 && h('div', { class: 'row scroll' }, st().templates.map((t) => h('button', { class: 'chip', onclick: () => { close(); logTemplate(store, t); } }, t.name))),
      h('div', { class: 'row' }, TYPES.map(([id, label]) => h('button', { class: m.type === id ? 'chip on' : 'chip', onclick: () => { m.type = id; m.categoryId = null; draw(); } }, label))),
      h('div', { class: 'big amt-display' }, m.amt ? '৳' + m.amt.replace(/-/g, '−') : '৳0'), /[+-]/.test(m.amt) && h('div', { class: 'muted small amt-display' }, amount() ? '= ' + formatTaka(amount()) : 'incomplete'),
      h('div', { class: 'keypad' }, pad.map((k) => h('button', { class: 'key', type: 'button', 'aria-label': k === '⌫' ? 'Backspace' : k === '=' ? 'Calculate' : k, onclick: () => {
        m.amt = pressKey(m.amt, k); draw(); } }, k))),
      h('div', { class: 'row scroll' }, wallets().map((w) => h('button', { class: m.walletId === w.id ? 'chip on' : 'chip', onclick: () => { m.walletId = w.id; draw(); } }, w.name))),
      m.type === 'transfer'
        ? h('div', null, h('div', { class: 'muted small' }, 'To'), h('div', { class: 'row scroll' }, wallets().filter((w) => w.id !== m.walletId).map((w) => h('button', { class: m.toWalletId === w.id ? 'chip on' : 'chip', onclick: () => { m.toWalletId = w.id; draw(); } }, w.name))),
          h('input', { class: 'input', placeholder: 'Fee (optional)', inputmode: 'decimal', value: m.fee, oninput: (e) => (m.fee = e.target.value) }))
        : m.type === 'debt' ? debtUi() : h('div', { class: 'grid' }, shown.map((c) => h('button', { class: sel === c.id ? 'chip on' : 'chip', 'aria-pressed': sel === c.id, onclick: () => { m.categoryId = c.id; if (st().settings.fastSaveTap) save(c.id); else draw(); } }, c.name)),
          !m.more && list.length > 8 && h('button', { class: 'chip', onclick: () => { m.more = true; draw(); } }, 'More…')),
      h('div', { class: 'row' },
        h('button', { class: 'chip', onclick: () => { m.pinned = null; draw(); } }, m.pinned ? formatRecent(m.pinned, Date.now(), st().settings.timeFormat) : 'Now'),
        h('input', { class: 'input', type: 'date', 'aria-label': 'Date', value: localDate(ts()), onchange: (e) => { m.pinned = new Date(e.target.value + 'T' + localTime(ts())).getTime(); draw(); } }),
        h('input', { class: 'input', type: 'time', 'aria-label': 'Time', value: localTime(ts()), onchange: (e) => { m.pinned = new Date(localDate(ts()) + 'T' + e.target.value).getTime(); draw(); } })),
      h('input', { class: 'input', placeholder: 'Note (optional)', value: m.note, oninput: (e) => (m.note = e.target.value) }),
      h('button', { class: 'btn primary wide add-btn', onclick: onAdd }, (edit ? 'Save changes' : 'Add') + (amount() ? ' ' + formatTaka(amount()) : '')));
  }
  ov.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  sheet.tabIndex = -1; draw(); document.body.append(ov); sheet.focus();
}
