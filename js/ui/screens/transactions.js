import { h } from '../h.js';
import { toast } from '../toast.js';
import { openAddSheet } from '../addsheet.js';
import { txnTitle } from '../../domain/labels.js';
import { formatTaka } from '../../domain/money.js';
import { groupByDay, formatDay, formatTime, formatDateTime } from '../../domain/dates.js';
const SIGN = { expense: -1, income: 1, lend: -1, borrow: 1, repay_in: 1, repay_out: -1 };
let q = "",
  wf = null,
  cf = "",
  pf = "",
  from = "",
  to = "";
export function transactionsScreen({ state, store }) {
  const refresh = () => store.dispatch({ type: "settings/update", patch: {} });
  const name = (list, id) => list.find((x) => x.id === id)?.name ?? "";
  const live = state.txns.filter(
    (t) =>
      !t.deletedAt &&
      (!wf || t.walletId === wf || t.toWalletId === wf) &&
      (!cf || t.categoryId === cf) &&
      (!pf || t.personId === pf) &&
      (!from || t.ts >= new Date(from + "T00:00").getTime()) &&
      (!to || t.ts <= new Date(to + "T23:59:59.999").getTime()) &&
      (!q ||
        [
          txnTitle(t, state),
          name(state.categories, t.categoryId),
          name(state.wallets, t.walletId),
          t.note,
          String(t.amount / 100),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  const row = (t) =>
    h(
      "button",
      { class: "trow", onclick: () => detail(t, state, store) },
      h(
        "div",
        null,
        h("div", { class: "trow-title" }, txnTitle(t, state)),
        h(
          "div",
          { class: "trow-meta" },
          [
            formatTime(t.ts, state.settings.timeFormat),
            name(state.wallets, t.walletId) || "No wallet",
            t.note,
          ]
            .filter(Boolean)
            .join(" · "),
        ),
      ),
      h(
        "div",
        { class: "amount", style: { color: SIGN[t.type] > 0 ? "var(--green)" : "inherit" } },
        (SIGN[t.type] < 0 ? "−" : SIGN[t.type] > 0 ? "+" : "") + formatTaka(t.amount),
      ),
    );
  return h(
    "div",
    { class: "stack" },
    h("h1", null, "Activity"),
    h("input", {
      class: "input",
      type: "search",
      placeholder: "Search category, note, amount...",
      value: q,
      onchange: (e) => {
        q = e.target.value;
        refresh();
      },
    }),
    h(
      "div",
      { class: "row scroll" },
      [[null, "All Accounts"], ...state.wallets.map((w) => [w.id, w.name])].map(([id, l]) =>
        h(
          "button",
          {
            class: wf === id ? "chip on" : "chip",
            onclick: () => {
              wf = id;
              refresh();
            },
          },
          l,
        ),
      ),
    ),
    h(
      "div",
      { class: "row wrap" },
      h(
        "select",
        {
          class: "input",
          style: { flex: "1 1 9rem" },
          "aria-label": "Category",
          onchange: (e) => {
            cf = e.target.value;
            refresh();
          },
        },
        h("option", { value: "" }, "All Categories"),
        state.categories.map((c) =>
          h("option", { value: c.id, selected: c.id === cf ? true : null }, c.name),
        ),
      ),
      h(
        "select",
        {
          class: "input",
          style: { flex: "1 1 9rem" },
          "aria-label": "Person",
          onchange: (e) => {
            pf = e.target.value;
            refresh();
          },
        },
        h("option", { value: "" }, "All People"),
        state.people
          .filter((p) => !p.archived)
          .map((p) => h("option", { value: p.id, selected: p.id === pf ? true : null }, p.name)),
      ),
    ),
    h(
      "div",
      { class: "row wrap" },
      h(
        "label",
        { class: "field" },
        h("span", { class: "muted small" }, "From"),
        h("input", {
          class: "input",
          type: "date",
          value: from,
          onchange: (e) => {
            from = e.target.value;
            refresh();
          },
        }),
      ),
      h(
        "label",
        { class: "field" },
        h("span", { class: "muted small" }, "To"),
        h("input", {
          class: "input",
          type: "date",
          value: to,
          onchange: (e) => {
            to = e.target.value;
            refresh();
          },
        }),
      ),
      (from || to) &&
        h(
          "button",
          {
            class: "btn small",
            onclick: () => {
              from = "";
              to = "";
              refresh();
            },
          },
          "Clear",
        ),
    ),
    live.length
      ? groupByDay(live).map((g) =>
          h(
            "section",
            null,
            h("h2", { class: "dayhead" }, formatDay(g.ts)),
            h("div", { class: "stack" }, g.items.map(row)),
          ),
        )
      : h("div", { class: "card empty" }, h("p", null, "No transactions found.")),
  );
}
function detail(t, state, store) {
  const f = state.settings.timeFormat,
    close = () => ov.remove();
  const ov = h(
    "div",
    { class: "overlay", onclick: (e) => e.target === ov && close() },
    h(
      "div",
      { class: "sheet" },
      h("div", { class: "drag-handle" }),
      h(
        "div",
        { class: "sheet-head" },
        h("strong", { style: { fontSize: "1.1rem" } }, formatTaka(t.amount)),
        h("button", { class: "btn small", onclick: close }, "Done"),
      ),
      h(
        "div",
        { class: "card stack", style: { gap: "6px" } },
        h("strong", { style: { fontSize: "1.05rem" } }, txnTitle(t, state)),
        t.note && h("p", { class: "muted small" }, "Note: " + t.note),
        h("div", { class: "muted small" }, "Time: " + formatDateTime(t.ts, f)),
        h(
          "div",
          { class: "muted small" },
          "Added: " +
            formatDateTime(t.createdAt, f) +
            (Math.abs(t.ts - t.createdAt) > 3e5 ? "  (added later)" : ""),
        ),
        t.updatedAt !== t.createdAt &&
          h("div", { class: "muted small" }, "Edited: " + formatDateTime(t.updatedAt, f)),
      ),
      t.type !== "adjust" &&
        h(
          "div",
          { class: "row scroll" },
          [
            ["monthly", "Repeat Monthly"],
            ["weekly", "Repeat Weekly"],
          ].map(([freq, label]) =>
            h(
              "button",
              {
                class: "chip",
                onclick: async () => {
                  const d = new Date(t.ts),
                    nm = state.categories.find((c) => c.id === t.categoryId)?.name ?? t.type;
                  await store.dispatch({
                    type: "recurring/add",
                    name: nm,
                    txn: {
                      type: t.type,
                      amount: t.amount,
                      walletId: t.walletId,
                      toWalletId: t.toWalletId,
                      categoryId: t.categoryId,
                      personId: t.personId,
                      note: t.note,
                    },
                    rule: {
                      freq,
                      day: freq === "monthly" ? d.getDate() : d.getDay(),
                      hour: d.getHours(),
                      minute: d.getMinutes(),
                    },
                  });
                  close();
                  toast(`${label} scheduled: check More → Recurring`);
                },
              },
              label,
            ),
          ),
        ),
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            class: "btn primary",
            style: { flex: 1 },
            onclick: () => {
              close();
              openAddSheet(store, t);
            },
          },
          "Edit Entry",
        ),
        t.type !== "adjust" &&
          h(
            "button",
            {
              class: "btn",
              onclick: async () => {
                const n = prompt("Template name");
                if (n?.trim()) {
                  close();
                  await store.dispatch({
                    type: "entity/add",
                    kind: "template",
                    fields: {
                      name: n.trim(),
                      type: t.type,
                      amount: t.amount,
                      walletId: t.walletId,
                      categoryId: t.categoryId,
                      personId: t.personId,
                      order: state.templates.length,
                    },
                  });
                  toast("Template saved");
                }
              },
            },
            "Save Template",
          ),
        h(
          "button",
          {
            class: "btn",
            style: { color: "var(--red)" },
            onclick: async () => {
              close();
              const ids = [
                t.id,
                ...state.txns.filter((x) => x.linkId === t.id && !x.deletedAt).map((x) => x.id),
              ];
              for (const id of ids) await store.dispatch({ type: "txn/delete", id });
              document.querySelector(".toast")?.remove();
              const el = h(
                "div",
                { class: "toast" },
                h("span", null, "Deleted"),
                h(
                  "button",
                  {
                    class: "btn small",
                    onclick: async () => {
                      for (const id of ids) await store.dispatch({ type: "txn/restore", id });
                      el.remove();
                    },
                  },
                  "Undo",
                ),
              );
              document.body.append(el);
              setTimeout(() => el.remove(), 5e3);
            },
          },
          "Delete",
        ),
      ),
    ),
  );
  document.body.append(ov);
}
