// Cache-first app shell. VERSION and ASSETS are rewritten by tools/stamp.mjs — do not edit by hand.
const VERSION = '8c4cd0ff72';
const ASSETS = ["./","./css/base.css","./css/components.css","./css/tokens.css","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./js/backup.js","./js/db.js","./js/domain/backup.js","./js/domain/crypto.js","./js/domain/dates.js","./js/domain/deeplink.js","./js/domain/expr.js","./js/domain/labels.js","./js/domain/ledger.js","./js/domain/migrations.js","./js/domain/money.js","./js/domain/names.js","./js/domain/pin.js","./js/domain/recurring.js","./js/domain/seed.js","./js/domain/statement.js","./js/domain/suggest.js","./js/domain/validate.js","./js/main.js","./js/store.js","./js/ui/addsheet.js","./js/ui/h.js","./js/ui/personActions.js","./js/ui/screens/categories.js","./js/ui/screens/goals.js","./js/ui/screens/home.js","./js/ui/screens/lock.js","./js/ui/screens/onboarding.js","./js/ui/screens/people.js","./js/ui/screens/recurring.js","./js/ui/screens/reports.js","./js/ui/screens/settings.js","./js/ui/screens/stubs.js","./js/ui/screens/transactions.js","./js/ui/screens/wallets.js","./js/ui/templates.js","./js/ui/toast.js","./manifest.webmanifest"];
const CACHE = 'takatrack-' + VERSION;

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); }); // no skipWaiting: the page asks first
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('takatrack-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
