import { h } from '../h.js';
import { toast } from '../toast.js';
import { openAddSheet } from '../addsheet.js';
import { formatTaka, parseTaka } from '../../domain/money.js';
import { goalProgress } from '../../domain/ledger.js';
export function goalsScreen({ state, store }) {
  const goals = goalProgress(state.wallets, state.txns),
    ask = (msg, def = "") => {
      const v = prompt(msg, def);
      return v == null ? null : parseTaka(v);
    };
  const patchWallet = (id, patch) =>
    store.dispatch({ type: "entity/update", kind: "wallet", id, patch });
  return h(
    "div",
    { class: "stack" },
    h("a", { href: "#/more", class: "link" }, "‹ More"),
    h("h1", null, "Savings Goals"),
    goals.length
      ? h(
          "div",
          { class: "stack" },
          goals.map((g) =>
            h(
              "div",
              { class: "card stack" },
              h(
                "div",
                { class: "row", style: { justifyContent: "space-between" } },
                h("strong", { style: { fontSize: "1.05rem" } }, g.wallet.name),
                h(
                  "span",
                  {
                    class: "small amount",
                    style: { color: g.done ? "var(--green)" : "var(--muted)", fontWeight: 600 },
                  },
                  g.done ? "Target Reached! 🎉" : g.pct + "%",
                ),
              ),
              h(
                "div",
                { class: "row small" },
                h(
                  "span",
                  { style: { flex: 1 } },
                  `${formatTaka(g.saved)} saved of ${formatTaka(g.target)} target`,
                ),
                !g.done && h("span", { class: "muted" }, `${formatTaka(g.remaining)} left`),
              ),
              h(
                "div",
                {
                  class: "meter",
                  role: "progressbar",
                  "aria-valuenow": Math.min(100, g.pct),
                  "aria-valuemin": 0,
                  "aria-valuemax": 100,
                },
                h("div", {
                  style: { width: Math.min(100, g.pct) + "%", background: "var(--green)" },
                }),
              ),
              h(
                "div",
                { class: "row scroll" },
                h(
                  "button",
                  {
                    class: "btn small primary",
                    onclick: () =>
                      openAddSheet(store, null, { type: "transfer", toWalletId: g.wallet.id }),
                  },
                  "Deposit",
                ),
                h(
                  "button",
                  {
                    class: "btn small",
                    onclick: () =>
                      openAddSheet(store, null, { type: "transfer", walletId: g.wallet.id }),
                  },
                  "Withdraw",
                ),
                h(
                  "button",
                  {
                    class: "btn small",
                    onclick: () => {
                      const t = ask("New target (৳)", String(g.target / 100));
                      if (t) patchWallet(g.wallet.id, { goal: { target: t } });
                      else if (t === 0) toast("Target must be above zero.");
                    },
                  },
                  "Edit Target",
                ),
                h(
                  "button",
                  {
                    class: "btn small",
                    onclick: () =>
                      confirm("Stop tracking this goal? The wallet and its balance stay safe.") &&
                      patchWallet(g.wallet.id, { goal: null }),
                  },
                  "Remove",
                ),
              ),
            ),
          ),
        )
      : h(
          "div",
          { class: "card empty" },
          h("p", null, "No goals configured yet."),
          h(
            "p",
            { class: "muted small" },
            "A savings goal links to a dedicated wallet with a target amount.",
          ),
        ),
    h(
      "button",
      {
        class: "btn primary wide",
        onclick: async () => {
          const name = prompt("What are you saving for? (e.g. Travel, Emergency, Gadget)");
          if (!name?.trim()) return;
          const t = ask("Target amount (৳)");
          if (!t) return toast("Enter a target amount above zero.");
          const w = await store.dispatch({
            type: "wallet/add",
            name,
            kind: "other",
            color: "#b27c19",
          });
          await patchWallet(w.id, { goal: { target: t } });
        },
      },
      "＋ New Savings Goal",
    ),
  );
}
