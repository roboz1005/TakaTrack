import { h } from './ui/h.js';
import { toast, banner } from './ui/toast.js';
import { openDb } from './db.js';
import { createStore } from './store.js';
import { onboardingScreen } from './ui/screens/onboarding.js';
import { walletsScreen } from './ui/screens/wallets.js';
import { moreScreen } from './ui/screens/stubs.js';
import { homeScreen } from './ui/screens/home.js';
import { categoriesScreen } from './ui/screens/categories.js';
import { peopleScreen, personScreen } from './ui/screens/people.js';
import { transactionsScreen } from './ui/screens/transactions.js';
import { openAddSheet } from './ui/addsheet.js';
import { parseDeepLink } from './domain/deeplink.js';
import { goalsScreen } from './ui/screens/goals.js';
import { setDigits } from './domain/money.js';
import { recurringScreen } from './ui/screens/recurring.js';
import { reportsScreen } from './ui/screens/reports.js';
import { lockScreen } from './ui/screens/lock.js';
import { settingsScreen } from './ui/screens/settings.js';

const routes = { home: homeScreen, transactions: transactionsScreen, people: peopleScreen, more: moreScreen, wallets: walletsScreen, person: personScreen, categories: categoriesScreen, settings: settingsScreen, reports: reportsScreen, recurring: recurringScreen, goals: goalsScreen };
const TABS = [['home', 'Home'], ['transactions', 'Activity'], ['fab'], ['people', 'People'], ['more', 'More']];
const root = document.getElementById('app');
let store, locked = false, hiddenAt = 0, pending = parseDeepLink(location.search);
function runPending() {
  const s = store.state().settings;
  if (!pending && s.launchIntoAdd) pending = { type: 'expense' };
  if (pending && !locked && s.onboarded) { openAddSheet(store, null, pending); pending = null; history.replaceState(null, '', location.pathname + location.hash); }
}

const current = () => (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];

function tabbar(route) {
  const active = route === 'wallets' || route === 'categories' || route === 'settings' || route === 'reports' || route === 'recurring' || route === 'goals' ? 'more' : route === 'person' ? 'people' : route;
  return h('nav', { class: 'tabbar', 'aria-label': 'Main' }, TABS.map(([id, label]) => id === 'fab'
    ? h('button', { class: 'fab', type: 'button', 'aria-label': 'Add transaction', onclick: () => openAddSheet(store) }, '+')
    : h('a', { href: '#/' + id, class: id === active ? 'tab on' : 'tab', 'aria-current': id === active ? 'page' : null }, label)));
}
function render() {
  try { renderInner(); } catch (e) {   // error boundary: never leave a blank screen
    console.error(e);
    root.replaceChildren(h('main', { class: 'screen' }, h('h1', null, 'Something went wrong'), h('p', null, 'Your data is safe on this device. Try reloading.'),
      h('button', { class: 'btn primary wide', onclick: () => location.reload() }, 'Reload'), h('a', { class: 'btn wide', href: '#/home' }, 'Go Home')));
  }
}
function renderInner() {
  const state = store.state();
  setDigits(state.settings.digits);
  document.documentElement.dataset.theme = state.settings.theme === 'auto' ? '' : state.settings.theme;
  if (locked && state.settings.pinHash) { root.replaceChildren(lockScreen({ settings: state.settings, onUnlock: () => { locked = false; render(); runPending(); } })); return; }
  if (!state.settings.onboarded) { root.replaceChildren(onboardingScreen({ store, onDone: () => { location.hash = '#/home'; render(); } })); return; }
  const [seg, arg] = current().split('/'), route = routes[seg] ? seg : 'home';
  root.replaceChildren(h('main', { class: 'screen' }, routes[route]({ state, store, arg })), tabbar(route));
}

async function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;   // offline cache needs http(s); the single-file build skips it
  const reg = await navigator.serviceWorker.register('./sw.js').catch(() => null);
  if (!reg) return;
  const offer = (worker) => { if (navigator.serviceWorker.controller) banner('A new version of TakaTrack is ready.', 'Reload', () => worker.postMessage('SKIP_WAITING')); };
  if (reg.waiting) offer(reg.waiting);
  reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); }); });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

(async function boot() {
  try {
    store = createStore(await openDb());
    await store.init();
    await store.dispatch({ type: 'recurring/run' }).catch(() => {});
  } catch (e) {
    root.replaceChildren(h('main', { class: 'screen' }, h('h1', null, 'Could not open local storage'),
      h('p', null, 'TakaTrack keeps its data in your browser. Private/incognito mode or blocked site data can prevent that. Allow site data and reload.')));
    return;
  }
  locked = !!store.state().settings.pinHash;
  document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else { store.dispatch({ type: 'recurring/run' }); if (store.state().settings.pinHash && Date.now() - hiddenAt > 30000) { locked = true; render(); } } });
  store.subscribe(() => { if (store.state().settings.onboarded) render(); });
  addEventListener('hashchange', render);
  if (location.hash && location.hash !== '#/home') history.replaceState(null, '', location.pathname + location.search + '#/home');   // a reload always starts on Home
  render(); registerSW();
  runPending();
  navigator.storage?.persist?.();
})();
