import { toast } from './toast.js';
export async function addPersonUI(store, name) {
  try { return await store.dispatch({ type: 'person/add', name }); } catch (e) { toast(e.message, 4000); return null; }
}
export async function renamePersonUI(store, p) {
  const n = prompt('Rename', p.name); if (n == null) return;
  try { await store.dispatch({ type: 'person/rename', id: p.id, name: n }); } catch (e) { toast(e.message, 4000); }
}
export async function deletePersonUI(store, state, p) {
  const n = state.txns.filter((t) => t.personId === p.id && !t.deletedAt).length;
  if (!confirm(n ? `Delete ${p.name} and their ${n} transaction${n > 1 ? 's' : ''}? Wallet balances will change. This cannot be undone.` : `Delete ${p.name}?`)) return false;
  await store.dispatch({ type: 'person/delete', id: p.id }); toast(`${p.name} deleted.`); return true;
}
