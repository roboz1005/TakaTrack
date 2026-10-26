import { h } from '../h.js';
import { formatTaka, parseTaka } from '../../domain/money.js';
import { formatDateTime } from '../../domain/dates.js';
import { walletBalances, totals } from '../../domain/ledger.js';
export function walletsScreen({ state, store }) {
  const bal = walletBalances(state.wallets, state.txns),
    tf = state.settings.timeFormat;
  const active = state.wallets.filter((w) => !w.archived),
    archived = state.wallets.filter((w) => w.archived);
  const row = (w) =>
    h(
      "li",
      { class: "card wallet-item" },
      h(
        "div",
        { class: "wallet-left" },
        h("span", { class: "wallet-dot", style: { backgroundColor: w.color || "var(--green)" } }),
        h(
          "div",
          null,
          h("div", { class: "wallet-name" }, w.name),
          h(
            "div",
            { class: "muted small" },
            `${w.kind} · added ${formatDateTime(w.createdAt, tf)}`,
          ),
        ),
      ),
      h(
        "div",
        { class: "right" },
        h("div", { class: "amount" }, formatTaka(bal.get(w.id))),
        h(
          "div",
          { class: "row-gap" },
          h(
            "button",
            {
              class: "link",
              type: "button",
              onclick: () => {
                const n = prompt("Rename wallet", w.name);
                if (n && n.trim()) store.dispatch({ type: "wallet/rename", id: w.id, name: n });
              },
            },
            "Rename",
          ),
          h(
            "button",
            {
              class: "link",
              type: "button",
              onclick: () =>
                store.dispatch({ type: "wallet/archive", id: w.id, archived: !w.archived }),
            },
            w.archived ? "Restore" : "Archive",
          ),
        ),
      ),
    );
  const name = h("input", {
    class: "input",
    placeholder: "Wallet name",
    "aria-label": "New wallet name",
  });
  const open = h("input", {
    class: "input",
    inputmode: "decimal",
    placeholder: "Opening balance (৳)",
    "aria-label": "Opening balance",
  });
  const kind = h(
    "select",
    { class: "input", "aria-label": "Wallet kind" },
    ["cash", "mobile", "bank", "card", "other"].map((k) => h("option", { value: k }, k)),
  );
  const err = h("p", { class: "error", role: "alert" });
  const add = () => {
    const v = open.value.trim() === "" ? 0 : parseTaka(open.value);
    if (!name.value.trim()) {
      err.textContent = "Give the wallet a name.";
      return;
    }
    if (v === null) {
      err.textContent = "Opening balance: use numbers like 1500 or 1500.50.";
      return;
    }
    store.dispatch({ type: "wallet/add", name: name.value, kind: kind.value, openingBalance: v });
  };
  return h(
    "div",
    null,
    h("a", { href: "#/more", class: "link" }, "‹ More"),
    h("h1", null, "Wallets"),
    h(
      "p",
      { class: "muted" },
      `Total in wallets: ${formatTaka(totals(state.wallets, state.txns).walletsTotal)}`,
    ),
    h("ul", { class: "stack plain" }, active.map(row)),
    archived.length > 0 &&
      h(
        "details",
        null,
        h("summary", null, `Archived (${archived.length})`),
        h("ul", { class: "stack plain" }, archived.map(row)),
      ),
    h(
      "div",
      { class: "card stack", style: { marginTop: "16px" } },
      h("strong", null, "Add a new wallet"),
      name,
      kind,
      open,
      err,
      h("button", { class: "btn primary", type: "button", onclick: add }, "Add wallet"),
    ),
  );
}
