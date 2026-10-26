import { h } from '../h.js';
import { createSvgIcon } from '../icons.js';
import { templateChips } from '../templates.js';
import { txnTitle } from '../../domain/labels.js';
import { formatTaka as rawTaka } from '../../domain/money.js';
import { backupDue, daysSinceBackup } from '../../domain/backup.js';
import { doExport } from '../../backup.js';
let hide = false;
const formatTaka = (v) => (hide ? "৳ ••••" : rawTaka(v));
import { walletBalances, totals, periodSummary, categoryTotals, dailySeries, budgetProgress, dueSoon } from '../../domain/ledger.js';
import { periodAt, formatPeriod, formatRecent, weekdayShort, formatDayShort } from '../../domain/dates.js';
import { trend } from '../trend.js';
const NS = "http://www.w3.org/2000/svg";
let offset = 0;
export function bars(rows) {
  const max = Math.max(1, ...rows.map((r) => r[1])),
    svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 300 ${rows.length * 28}`);
  svg.setAttribute("class", "bars");
  svg.setAttribute("role", "img");
  svg.style.width = "100%";
  svg.style.height = "auto";
  rows.forEach(([label, v], i) => {
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("x", 0);
    bg.setAttribute("y", i * 28 + 14);
    bg.setAttribute("height", 8);
    bg.setAttribute("rx", 4);
    bg.setAttribute("width", 300);
    bg.setAttribute("fill", "var(--line-subtle)");
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", 0);
    r.setAttribute("y", i * 28 + 14);
    r.setAttribute("height", 8);
    r.setAttribute("rx", 4);
    r.setAttribute("width", Math.max(3, (300 * v) / max));
    r.setAttribute("fill", "var(--green)");
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", 0);
    t.setAttribute("y", i * 28 + 10);
    t.setAttribute("font-size", 11);
    t.setAttribute("font-weight", "500");
    t.setAttribute("fill", "var(--ink)");
    t.setAttribute("font-family", "var(--font)");
    t.textContent = `${label} · ${formatTaka(v)}`;
    svg.append(bg, r, t);
  });
  return svg;
}
export function homeScreen({ state, store }) {
  hide = !!state.settings.hideBalances;
  const t = totals(state.wallets, state.txns),
    bal = walletBalances(state.wallets, state.txns),
    f = state.settings.timeFormat;
  const { start, end } = periodAt(Date.now(), offset, state.settings.monthStartDay),
    sum = periodSummary(state.txns, start, end);
  const cats = categoryTotals(state.txns, start, end)
    .slice(0, 5)
    .map(([id, v]) => [state.categories.find((c) => c.id === id)?.name ?? "Other", v]);
  const recent = state.txns
    .filter((x) => !x.deletedAt)
    .sort((a, b) => b.ts - a.ts || b.createdAt - a.createdAt)
    .slice(0, 5);
  const go = () => store.dispatch({ type: "settings/update", patch: {} });
  return h(
    "div",
    { class: "stack" },
    backupDue(state) &&
      h(
        "div",
        { class: "card row", style: { borderLeft: "3px solid var(--gold)" } },
        h(
          "span",
          { style: { flex: 1, fontSize: "0.86rem" } },
          daysSinceBackup(state.settings) === null
            ? "You have not backed up yet."
            : `Last backup ${daysSinceBackup(state.settings)} days ago.`,
        ),
        h("button", { class: "btn small primary", onclick: () => doExport(store) }, "Back up"),
      ),
    // Modern Hero Card
    h(
      "section",
      { class: "hero-card" },
      h(
        "div",
        { class: "hero-header" },
        h("span", { class: "hero-label muted" }, "Total Balance"),
        h(
          "button",
          {
            class: "hero-privacy-btn",
            "aria-label": hide ? "Show balances" : "Hide balances",
            onclick: () =>
              store.dispatch({ type: "settings/update", patch: { hideBalances: !hide } }),
          },
          createSvgIcon(hide ? "eye-off" : "eye", 16),
        ),
      ),
      h("div", { class: "big amount" }, formatTaka(t.walletsTotal)),
      h(
        "div",
        { class: "hero-metrics" },
        h(
          "a",
          { class: "metric-pill green", href: "#/people" },
          h("span", { class: "metric-label" }, "To receive"),
          h("span", { class: "metric-value" }, formatTaka(t.toReceive)),
        ),
        h(
          "a",
          { class: "metric-pill red", href: "#/people" },
          h("span", { class: "metric-label" }, "To pay"),
          h("span", { class: "metric-value" }, formatTaka(t.toPay)),
        ),
      ),
      h(
        "div",
        { class: "net-worth-row muted small" },
        h("span", null, "Net worth across all assets"),
        h("strong", { class: "amount", style: { color: "var(--ink)" } }, formatTaka(t.netWorth)),
      ),
    ),
    // Templates quick chips if any
    state.templates.length > 0 &&
      h("div", { class: "row scroll" }, templateChips(store, state.templates)),
    // Wallets strip
    h(
      "div",
      null,
      h(
        "div",
        { class: "row", style: { justifyContent: "space-between", marginBottom: "6px" } },
        h(
          "span",
          {
            class: "muted small",
            style: { fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
          },
          "Wallets",
        ),
        h("a", { href: "#/wallets", class: "link" }, "Manage →"),
      ),
      h(
        "div",
        { class: "strip" },
        state.wallets
          .filter((w) => !w.archived)
          .map((w) =>
            h(
              "div",
              { class: "card mini" },
              h(
                "div",
                { class: "mini-top" },
                h("span", {
                  class: "color-dot",
                  style: { backgroundColor: w.color || "var(--green)" },
                }),
                h("span", { class: "muted small", style: { fontWeight: 600 } }, w.name),
              ),
              h(
                "div",
                { class: "amount", style: { fontSize: "1rem", marginTop: "2px" } },
                formatTaka(bal.get(w.id)),
              ),
            ),
          ),
      ),
    ),
    // Monthly summary card
    h(
      "div",
      { class: "card" },
      h(
        "div",
        { class: "row", style: { marginBottom: "12px" } },
        h(
          "button",
          {
            class: "icon-btn",
            "aria-label": "Previous month",
            onclick: () => {
              offset++;
              go();
            },
          },
          "◀",
        ),
        h(
          "strong",
          { style: { flex: 1, textAlign: "center", fontSize: "0.98rem" } },
          formatPeriod({ start, end }, state.settings.monthStartDay),
        ),
        h(
          "button",
          {
            class: "icon-btn",
            "aria-label": "Next month",
            disabled: offset === 0,
            onclick: () => {
              offset = Math.max(0, offset - 1);
              go();
            },
          },
          "▶",
        ),
      ),
      h(
        "div",
        { class: "row wrap", style: { gap: "16px", marginBottom: "12px", fontSize: "0.88rem" } },
        h(
          "span",
          null,
          h("span", { class: "muted" }, "In: "),
          h(
            "strong",
            { class: "amount", style: { color: "var(--green)" } },
            formatTaka(sum.income),
          ),
        ),
        h(
          "span",
          null,
          h("span", { class: "muted" }, "Out: "),
          h(
            "strong",
            { class: "amount", style: { color: "var(--red)" } },
            formatTaka(sum.expense),
          ),
        ),
        h(
          "span",
          null,
          h("span", { class: "muted" }, "Net: "),
          h("strong", { class: "amount" }, formatTaka(sum.net)),
        ),
      ),
      cats.length
        ? bars(cats)
        : h("p", { class: "muted small empty" }, "No spending recorded for this period."),
    ),
    // 7-day trend (the month-by-week trend lives in Reports)
    (() => {
      const week = dailySeries(state.txns, Date.now(), 7),
        wIn = week.reduce((x, d) => x + d.income, 0),
        wOut = week.reduce((x, d) => x + d.expense, 0);
      return h(
        "div",
        { class: "card" },
        h(
          "div",
          { class: "row", style: { justifyContent: "space-between", marginBottom: "8px" } },
          h("strong", null, "Last 7 Days"),
          h("a", { href: "#/reports", class: "link" }, "Details →"),
        ),
        h(
          "div",
          { class: "row wrap", style: { gap: "16px", marginBottom: "6px", fontSize: "0.86rem" } },
          h("span", null, h("span", { class: "muted" }, "In: "), h("strong", { class: "amount", style: { color: "var(--green)" } }, formatTaka(wIn))),
          h("span", null, h("span", { class: "muted" }, "Out: "), h("strong", { class: "amount", style: { color: "var(--red)" } }, formatTaka(wOut))),
        ),
        trend(week, {
          label: (d) => weekdayShort(d.start),
          strong: week.length - 1,
          aria: "Income vs expense, last 7 days",
          tip: (d) => `${weekdayShort(d.start)} ${formatDayShort(d.start)} · In ${formatTaka(d.income)} · Out ${formatTaka(d.expense)}`,
        }),
        h("div", { class: "muted small" }, "Green = in · Red = out · Today is bold"),
      );
    })(),
    // Budgets
    (() => {
      const bp = budgetProgress(state.budgets, state.txns, start, end);
      return (
        bp.length > 0 &&
        h(
          "div",
          { class: "card stack" },
          h("strong", null, "Monthly Budgets"),
          bp.map((b) =>
            h(
              "div",
              { class: "stack", style: { gap: "4px" } },
              h(
                "div",
                { class: "row small" },
                h(
                  "span",
                  { style: { flex: 1, fontWeight: 500 } },
                  state.categories.find((c) => c.id === b.categoryId)?.name,
                ),
                h(
                  "span",
                  { class: "amount", style: { color: b.over ? "var(--red)" : "var(--muted)" } },
                  `${formatTaka(b.spent)} / ${formatTaka(b.limit)}`,
                ),
              ),
              h(
                "div",
                {
                  class: "meter",
                  role: "progressbar",
                  "aria-valuenow": Math.min(100, b.pct),
                  "aria-valuemin": 0,
                  "aria-valuemax": 100,
                },
                h("div", {
                  style: {
                    width: Math.min(100, b.pct) + "%",
                    background: b.over ? "var(--red)" : "var(--green)",
                  },
                }),
              ),
            ),
          ),
        )
      );
    })(),
    // Due Soon Reminders
    (() => {
      const due = dueSoon(state.txns, Date.now());
      return (
        due.length > 0 &&
        h(
          "div",
          { class: "card stack" },
          h("strong", null, "Upcoming & Overdue Debts"),
          due.map((d) => {
            const p = state.people.find((x) => x.id === d.personId);
            return h(
              "a",
              {
                class: "row small",
                href: "#/person/" + d.personId,
                style: { padding: "8px 0", borderBottom: "1px solid var(--line-subtle)" },
              },
              h(
                "span",
                { style: { flex: 1, fontWeight: 500 } },
                d.balance > 0
                  ? `${p?.name} owes you ${formatTaka(d.balance)}`
                  : `You owe ${p?.name} ${formatTaka(-d.balance)}`,
              ),
              h(
                "span",
                { style: { color: d.overdue ? "var(--red)" : "var(--muted)", fontWeight: 600 } },
                (d.overdue ? "Overdue · " : "") +
                  formatRecent(d.txn.dueTs, Date.now(), f).replace(/ \d.*$/, ""),
              ),
            );
          }),
        )
      );
    })(),
    // Recent Activity
    h(
      "div",
      null,
      h(
        "div",
        { class: "row", style: { justifyContent: "space-between", margin: "14px 0 8px" } },
        h("h2", { class: "dayhead", style: { margin: 0 } }, "Recent Activity"),
        h("a", { href: "#/transactions", class: "link" }, "View all →"),
      ),
      recent.length
        ? h(
            "div",
            { class: "stack" },
            recent.map((x) =>
              h(
                "div",
                { class: "trow" },
                h(
                  "div",
                  null,
                  h("div", { class: "trow-title" }, txnTitle(x, state)),
                  h("div", { class: "trow-meta" }, formatRecent(x.ts, Date.now(), f)),
                ),
                h(
                  "div",
                  {
                    class: "amount",
                    style: {
                      fontSize: "1rem",
                      color: x.type === "income" ? "var(--green)" : "inherit",
                    },
                  },
                  formatTaka(x.amount),
                ),
              ),
            ),
          )
        : h(
            "div",
            { class: "card empty" },
            h("p", null, "No transactions yet. Tap the + button to log your first."),
          ),
    ),
  );
}
