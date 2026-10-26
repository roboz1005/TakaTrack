import { h } from '../h.js';
import { formatTaka } from '../../domain/money.js';
import { formatDateTime } from '../../domain/dates.js';
import { describeRule } from '../../domain/recurring.js';
export function recurringScreen({ state, store }) {
  return h(
    "div",
    { class: "stack" },
    h("a", { href: "#/more", class: "link" }, "‹ More"),
    h("h1", null, "Recurring Rules"),
    state.recurring.length
      ? h(
          "div",
          { class: "stack" },
          state.recurring.map((r) =>
            h(
              "div",
              { class: "card trow" },
              h(
                "div",
                null,
                h("div", { class: "trow-title" }, `${r.name} · ${formatTaka(r.txn.amount)}`),
                h("div", { class: "muted small" }, describeRule(r.rule)),
                h(
                  "div",
                  { class: "muted small" },
                  "Next due: " + formatDateTime(r.nextDue, state.settings.timeFormat),
                ),
              ),
              h(
                "button",
                {
                  class: "btn small",
                  onclick: () =>
                    confirm(`Stop "${r.name}"? Past recorded entries will stay.`) &&
                    store.dispatch({ type: "recurring/delete", id: r.id }),
                },
                "Stop",
              ),
            ),
          ),
        )
      : h(
          "div",
          { class: "card empty" },
          h("p", null, "No recurring transactions active."),
          h(
            "p",
            { class: "muted small" },
            'Open any transaction in Activity and tap "Repeat Monthly" or "Repeat Weekly". Missed occurrences are logged automatically when the app is opened.',
          ),
        ),
  );
}
