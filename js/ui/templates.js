import { h } from './h.js';
import { formatTaka } from '../domain/money.js';
/** One tap logs the template with the current moment as ts. */
export async function logTemplate(store, t) {
  const { type, amount, walletId, categoryId, personId } = t;
  const txn = await store.dispatch({ type: 'txn/add', txn: { type, amount, walletId, categoryId: categoryId ?? null, personId: personId ?? null, ext: { source: 'template' } } });
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, h('span', null, `Saved ${formatTaka(amount)} · ${t.name}`),
    h('button', { class: 'btn small', onclick: () => { store.dispatch({ type: 'txn/delete', id: txn.id }); el.remove(); } }, 'Undo'));
  document.body.append(el); setTimeout(() => el.remove(), 5000);
}
export const templateChips = (store, templates) => templates.map((t) => h('button', { class: 'chip', onclick: () => logTemplate(store, t) }, `${t.name} ${formatTaka(t.amount)}`));
