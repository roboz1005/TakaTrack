// IndexedDB wrapper behind a small adapter interface (put/del/putMany/loadAll). Memory twin for tests.
export const STORES = ['wallets', 'categories', 'people', 'txns', 'templates', 'budgets', 'recurring', 'settings', 'meta'];

export function openDb(name = 'takatrack', factory = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    const rq = factory.open(name, 1);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      for (const s of STORES) {
        const os = db.createObjectStore(s, { keyPath: 'id' });
        if (s === 'txns') for (const i of ['ts', 'walletId', 'categoryId', 'personId', 'type']) os.createIndex(i, i);
      }
    };
    rq.onsuccess = () => resolve(wrap(rq.result));
    rq.onerror = () => reject(rq.error);
  });
}
function wrap(db) {
  const run = (stores, mode, fn) => new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode); const out = fn(t);
    t.oncomplete = () => resolve(out); t.onerror = t.onabort = () => reject(t.error);
  });
  return {
    async loadAll() {
      const out = {};
      await run(STORES, 'readonly', (t) => { for (const s of STORES) { const r = t.objectStore(s).getAll(); r.onsuccess = () => { out[s] = r.result; }; } });
      return out;
    },
    put: (s, v) => run([s], 'readwrite', (t) => { t.objectStore(s).put(v); }),
    del: (s, id) => run([s], 'readwrite', (t) => { t.objectStore(s).delete(id); }),
    putMany: (s, vs) => run([s], 'readwrite', (t) => { vs.forEach((v) => t.objectStore(s).put(v)); }),
    persist: () => navigator.storage?.persist?.().catch(() => false),
  };
}
/** In-memory adapter with the same interface (tests). */
export function createMemoryDb() {
  const data = Object.fromEntries(STORES.map((s) => [s, new Map()]));
  const clone = (v) => JSON.parse(JSON.stringify(v));
  return {
    async loadAll() { return Object.fromEntries(STORES.map((s) => [s, [...data[s].values()].map(clone)])); },
    async put(s, v) { data[s].set(v.id, clone(v)); },
    async del(s, id) { data[s].delete(id); },
    async putMany(s, vs) { vs.forEach((v) => data[s].set(v.id, clone(v))); },
    async persist() { return true; },
  };
}
