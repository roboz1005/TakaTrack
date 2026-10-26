// In-memory state + write-through persistence. UI -> dispatch(action) -> update state -> persist -> subscribers.
import { defaultSettings, defaultCategories } from './domain/seed.js';
import { validateTxn } from './domain/validate.js';
import { migrate } from './domain/migrations.js';
import { normName, findDuplicate } from './domain/names.js';
import { firstDue, occurrencesUntil } from './domain/recurring.js';
import { ALL as KEYS, mergeLists } from './domain/backup.js';

const KINDS = { wallet: 'wallets', category: 'categories', person: 'people', txn: 'txns', template: 'templates', budget: 'budgets', recurring: 'recurring' };
const intOr0 = (n) => (Number.isSafeInteger(n) ? n : 0);

export function createStore(db, { now = () => Date.now(), uuid = () => globalThis.crypto.randomUUID() } = {}) {
  let state = { wallets: [], categories: [], people: [], txns: [], templates: [], budgets: [], recurring: [], settings: defaultSettings(), ready: false };
  const subs = new Set();
  const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f(state)); };

  // every created entity is stamped here — callers never pass createdAt/updatedAt
  const stamp = (fields, t = now()) => ({ id: uuid(), ...fields, createdAt: t, updatedAt: t });
  const replace = (list, id, fn) => list.map((x) => (x.id === id ? fn(x) : x));

  const actions = {
    async 'entity/add'({ kind, fields }) {
      const key = KINDS[kind], obj = stamp(fields);
      set({ [key]: [...state[key], obj] }); await db.put(key, obj); return obj;
    },
    async 'entity/update'({ kind, id, patch }) {
      const key = KINDS[kind]; let out;
      set({ [key]: replace(state[key], id, (x) => (out = { ...x, ...patch, id: x.id, createdAt: x.createdAt, updatedAt: now() })) });
      if (!out) throw new Error(`${kind} not found`);
      await db.put(key, out); return out;
    },
    'wallet/add': ({ name, kind = 'cash', color = '#0e5a43', openingBalance = 0 }) =>
      actions['entity/add']({ kind: 'wallet', fields: { name: name.trim(), kind, color, icon: '', openingBalance: intOr0(openingBalance), archived: false, order: state.wallets.length } }),
    'wallet/rename': ({ id, name }) => actions['entity/update']({ kind: 'wallet', id, patch: { name: name.trim() } }),
    'wallet/archive': ({ id, archived = true }) => actions['entity/update']({ kind: 'wallet', id, patch: { archived } }),
    'person/add': ({ name, phone = '', note = '' }) => {
      const n = normName(name); if (!n) return Promise.reject(new Error('Enter a name.'));
      const dup = findDuplicate(state.people, n); if (dup) return Promise.reject(new Error(`"${dup.name}" already exists.`));
      return actions['entity/add']({ kind: 'person', fields: { name: n, phone, note, archived: false } });
    },
    'person/rename': ({ id, name }) => {
      const n = normName(name); if (!n) return Promise.reject(new Error('Enter a name.'));
      const dup = findDuplicate(state.people, n, id); if (dup) return Promise.reject(new Error(`"${dup.name}" already exists.`));
      return actions['entity/update']({ kind: 'person', id, patch: { name: n } });
    },
    async 'person/delete'({ id }) {   // their transactions are deleted too; the person row is only hidden if history still points at it (keeps backups valid)
      const refs = state.txns.filter((t) => t.personId === id);
      for (const t of refs) if (!t.deletedAt) await actions['txn/delete']({ id: t.id });
      if (refs.length) await actions['entity/update']({ kind: 'person', id, patch: { archived: true } });
      else { set({ people: state.people.filter((p) => p.id !== id) }); await db.del('people', id); }
    },
    'txn/add'({ txn: a }) {   // action = { type:'txn/add', txn:{ type:'expense', amount, walletId, ... } }
      const t = validateTxn({ walletId: null, toWalletId: null, categoryId: null, personId: null, note: '', linkId: null, dueTs: null,
        ext: { source: 'manual' }, deletedAt: null, ...a, ts: a.ts ?? now() });   // ts defaults to the save moment
      return actions['entity/add']({ kind: 'txn', fields: t });
    },
    'txn/update'({ id, patch }) {
      const old = state.txns.find((t) => t.id === id); if (!old) throw new Error('txn not found');
      validateTxn({ ...old, ...patch }); return actions['entity/update']({ kind: 'txn', id, patch });
    },
    'txn/delete': ({ id }) => actions['entity/update']({ kind: 'txn', id, patch: { deletedAt: now() } }),
    'txn/restore': ({ id }) => actions['entity/update']({ kind: 'txn', id, patch: { deletedAt: null } }),
    async 'data/import'({ data, mode }) {   // caller validates with validateBackup first
      const next = {}; for (const k of KEYS) next[k] = mode === 'merge' ? mergeLists(state[k], data[k] ?? []) : (data[k] ?? []);
      if (mode !== 'merge') for (const k of KEYS) { const keep = new Set(next[k].map((x) => x.id)); for (const x of state[k]) if (!keep.has(x.id)) await db.del(k, x.id); }
      const settings = mode === 'merge' ? state.settings : { ...defaultSettings(), ...data.settings, onboarded: true };
      set({ ...next, settings });
      await Promise.all([...KEYS.map((k) => db.putMany(k, next[k])), db.put('settings', settings)]);
    },
    async 'budget/set'({ categoryId, monthlyLimit }) {   // upsert; limit 0 removes
      const cur = state.budgets.find((b) => b.categoryId === categoryId);
      if (!monthlyLimit) { if (cur) { set({ budgets: state.budgets.filter((b) => b !== cur) }); await db.del('budgets', cur.id); } return null; }
      return cur ? actions['entity/update']({ kind: 'budget', id: cur.id, patch: { monthlyLimit } }) : actions['entity/add']({ kind: 'budget', fields: { categoryId, monthlyLimit } });
    },
    'recurring/add'({ name, txn, rule }) { return actions['entity/add']({ kind: 'recurring', fields: { name, txn, rule, nextDue: firstDue(rule, now()), active: true } }); },
    async 'recurring/run'() {   // creates every missed occurrence, each stamped with its due moment; nextDue prevents duplicates
      const t = now(); let n = 0;
      for (const r of [...state.recurring]) {
        if (!r.active) continue;
        const { due, next } = occurrencesUntil(r.rule, r.nextDue, t); if (!due.length) continue;
        for (const ts of due) {
          if (state.txns.some((x) => x.ext?.ruleId === r.id && x.ts === ts)) continue;
          await actions['txn/add']({ txn: { ...r.txn, ts, ext: { source: 'recurring', ruleId: r.id } } }); n++;
        }
        await actions['entity/update']({ kind: 'recurring', id: r.id, patch: { nextDue: next } });
      }
      return n;
    },
    async 'recurring/delete'({ id }) { set({ recurring: state.recurring.filter((r) => r.id !== id) }); await db.del('recurring', id); },
    async 'template/delete'({ id }) { set({ templates: state.templates.filter((t) => t.id !== id) }); await db.del('templates', id); },
    async 'settings/update'({ patch }) {
      const next = { ...state.settings, ...patch }; set({ settings: next }); await db.put('settings', next); return next;
    },
    async 'onboard/complete'({ wallets }) {
      const t = now();   // every onboarding record is stamped with the onboarding moment
      const ws = wallets.map((w, order) => stamp({ name: w.name.trim(), kind: w.kind, color: w.color, icon: '', openingBalance: intOr0(w.openingBalance), archived: false, order }, t));
      const cats = defaultCategories().map((c) => stamp(c, t));
      const settings = { ...state.settings, onboarded: true, onboardedAt: t };
      set({ wallets: ws, categories: cats, settings });
      await Promise.all([db.putMany('wallets', ws), db.putMany('categories', cats), db.put('settings', settings)]);
    },
  };

  return {
    state: () => state,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    dispatch(action) { const fn = actions[action.type]; if (!fn) throw new Error('Unknown action ' + action.type); return fn(action); },
    async init() {
      const all = await db.loadAll();
      const stored = all.settings.find((s) => s.id === 'app');
      const settings = migrate({ ...defaultSettings(), ...(stored || {}) });
      set({ wallets: all.wallets.sort((a, b) => a.order - b.order), categories: all.categories.sort((a, b) => a.order - b.order),
        people: all.people, txns: all.txns, templates: all.templates, budgets: all.budgets, recurring: all.recurring, settings, ready: true });
    },
  };
}
