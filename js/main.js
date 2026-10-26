import { h } from './ui/h.js';
import { createSvgIcon } from './ui/icons.js';
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
const routes = {
  home: homeScreen,
  transactions: transactionsScreen,
  people: peopleScreen,
  more: moreScreen,
  wallets: walletsScreen,
  person: personScreen,
  categories: categoriesScreen,
  settings: settingsScreen,
  reports: reportsScreen,
  recurring: recurringScreen,
  goals: goalsScreen,
};
const TABS = [
  ["home", "Home"],
  ["transactions", "Activity"],
  ["fab"],
  ["people", "People"],
  ["more", "More"],
];
const root = document.getElementById("app");
let store,
  locked = false,
  hiddenAt = 0,
  pending = parseDeepLink(location.search);
function runPending() {
  const s = store.state().settings;
  if (!pending && s.launchIntoAdd) pending = { type: "expense" };
  if (pending && !locked && s.onboarded) {
    openAddSheet(store, null, pending);
    pending = null;
    history.replaceState(null, "", location.pathname + location.hash);
  }
}
const current = () => (location.hash.replace(/^#\/?/, "") || "home").split("?")[0];
function topbar(route, state, store2) {
  const titles = {
    home: "Overview",
    transactions: "Activity",
    people: "Debts & People",
    more: "More",
    wallets: "Wallets",
    person: "Person Detail",
    categories: "Categories",
    settings: "Settings",
    reports: "Financial Reports",
    recurring: "Recurring Rules",
    goals: "Savings Goals",
  };
  const isDark =
    document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const hide = !!state.settings.hideBalances;
  return h(
    "header",
    { class: "topbar" },
    h(
      "div",
      { class: "topbar-inner" },
      h(
        "a",
        { class: "topbar-brand", href: "#/home" },
        h("span", { class: "brand-mark" }, createSvgIcon("taka", 18)),
        h(
          "div",
          { class: "brand-text" },
          h("span", { class: "brand-title" }, "TakaTrack"),
          h("span", { class: "brand-subtitle" }, titles[route] || "Personal Finance"),
        ),
      ),
      h(
        "div",
        { class: "topbar-actions" },
        h(
          "button",
          {
            class: "icon-btn",
            type: "button",
            "aria-label": hide ? "Show balances" : "Hide balances",
            title: hide ? "Show balances" : "Hide balances",
            onclick: () =>
              store2.dispatch({ type: "settings/update", patch: { hideBalances: !hide } }),
          },
          createSvgIcon(hide ? "eye-off" : "eye", 18),
        ),
        h(
          "button",
          {
            class: "icon-btn",
            type: "button",
            "aria-label": isDark ? "Switch to light mode" : "Switch to dark mode",
            title: isDark ? "Switch to light mode" : "Switch to dark mode",
            onclick: () => {
              const next = isDark ? "light" : "dark";
              store2.dispatch({ type: "settings/update", patch: { theme: next } });
            },
          },
          createSvgIcon(isDark ? "sun" : "moon", 18),
        ),
      ),
    ),
  );
}
function tabbar(route) {
  const active =
    route === "wallets" ||
    route === "categories" ||
    route === "settings" ||
    route === "reports" ||
    route === "recurring" ||
    route === "goals"
      ? "more"
      : route === "person"
        ? "people"
        : route;
  return h(
    "nav",
    { class: "tabbar", "aria-label": "Main Navigation" },
    TABS.map(([id, label]) => {
      if (id === "fab") {
        return h(
          "button",
          {
            class: "fab",
            type: "button",
            "aria-label": "Add new transaction",
            onclick: () => openAddSheet(store),
          },
          createSvgIcon("plus", 24),
        );
      }
      const isActive = id === active;
      return h(
        "a",
        {
          href: "#/" + id,
          class: isActive ? "tab on" : "tab",
          "aria-current": isActive ? "page" : null,
        },
        createSvgIcon(
          id === "home"
            ? "home"
            : id === "transactions"
              ? "transactions"
              : id === "people"
                ? "people"
                : "more",
          20,
        ),
        h("span", { class: "tab-label" }, label),
      );
    }),
  );
}
function render() {
  try {
    renderInner();
  } catch (e) {
    console.error(e);
    root.replaceChildren(
      h(
        "main",
        { class: "screen" },
        h("h1", null, "Something went wrong"),
        h("p", null, "Your financial records remain secure on this device."),
        h(
          "button",
          { class: "btn primary wide", onclick: () => location.reload() },
          "Reload App",
        ),
        h("a", { class: "btn wide", href: "#/home" }, "Go to Overview"),
      ),
    );
  }
}
function renderInner() {
  const state = store.state();
  setDigits(state.settings.digits);
  document.documentElement.dataset.theme =
    state.settings.theme === "auto" ? "" : state.settings.theme;
  if (locked && state.settings.pinHash) {
    root.replaceChildren(
      lockScreen({
        settings: state.settings,
        onUnlock: () => {
          locked = false;
          render();
          runPending();
        },
      }),
    );
    return;
  }
  if (!state.settings.onboarded) {
    root.replaceChildren(
      onboardingScreen({
        store,
        onDone: () => {
          location.hash = "#/home";
          render();
        },
      }),
    );
    return;
  }
  const [seg, arg] = current().split("/"),
    route = routes[seg] ? seg : "home";
  const topbarEl = topbar(route, state, store);
  const screenContent = routes[route]({ state, store, arg });
  const screenEl = h(
    "main",
    { class: "screen screen-fade-in", "data-route": route },
    screenContent,
  );
  const tabbarEl = tabbar(route);
  root.replaceChildren(topbarEl, screenEl, tabbarEl);
}
async function registerSW() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  try {
    const reg = await navigator.serviceWorker.register("./sw.js").catch(() => null);
    if (!reg) return;
    const offer = (worker) => {
      if (navigator.serviceWorker.controller)
        banner("A new version of TakaTrack is ready.", "Reload", () =>
          worker.postMessage("SKIP_WAITING"),
        );
    };
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => {
        if (w.state === "installed") offer(w);
      });
    });
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloaded) {
        reloaded = true;
        location.reload();
      }
    });
  } catch (err) {}
}
(async function boot() {
  try {
    store = createStore(await openDb());
    await store.init();
    await store.dispatch({ type: "recurring/run" }).catch(() => {});
  } catch (e) {
    root.replaceChildren(
      h(
        "main",
        { class: "screen" },
        h("h1", null, "Could not access storage"),
        h(
          "p",
          null,
          "TakaTrack preserves your records in your browser storage. Please ensure cookies and storage permissions are enabled.",
        ),
      ),
    );
    return;
  }
  locked = !!store.state().settings.pinHash;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else {
      store.dispatch({ type: "recurring/run" });
      if (store.state().settings.pinHash && Date.now() - hiddenAt > 3e4) {
        locked = true;
        render();
      }
    }
  });
  store.subscribe(() => {
    if (store.state().settings.onboarded) render();
  });
  addEventListener("hashchange", render);
  if (location.hash && location.hash !== "#/home")
    history.replaceState(null, "", location.pathname + location.search + "#/home");
  render();
  registerSW();
  runPending();
  navigator.storage?.persist?.();
})();
