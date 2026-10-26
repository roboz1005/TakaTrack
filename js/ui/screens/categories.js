import { h } from '../h.js';
export function categoriesScreen({ state, store }) {
  const section = (kind, title) =>
    h(
      "section",
      null,
      h("h2", { class: "dayhead" }, title),
      h(
        "div",
        { class: "stack" },
        state.categories
          .filter((c) => c.kind === kind)
          .map((c) =>
            h(
              "div",
              { class: "card trow" },
              h(
                "strong",
                { style: { opacity: c.archived ? 0.5 : 1 } },
                c.name + (c.archived ? " (archived)" : ""),
              ),
              h(
                "div",
                { class: "row" },
                h(
                  "button",
                  {
                    class: "btn small",
                    onclick: () => {
                      const n = prompt("Rename category", c.name);
                      if (n?.trim())
                        store.dispatch({
                          type: "entity/update",
                          kind: "category",
                          id: c.id,
                          patch: { name: n.trim() },
                        });
                    },
                  },
                  "Rename",
                ),
                h(
                  "button",
                  {
                    class: "btn small",
                    onclick: () =>
                      store.dispatch({
                        type: "entity/update",
                        kind: "category",
                        id: c.id,
                        patch: { archived: !c.archived },
                      }),
                  },
                  c.archived ? "Restore" : "Archive",
                ),
              ),
            ),
          ),
      ),
      h(
        "button",
        {
          class: "btn wide",
          style: { marginTop: "8px" },
          onclick: () => {
            const n = prompt("New " + kind + " category");
            if (n?.trim())
              store.dispatch({
                type: "entity/add",
                kind: "category",
                fields: {
                  name: n.trim(),
                  kind,
                  color: "",
                  icon: "",
                  archived: false,
                  order: state.categories.length,
                },
              });
          },
        },
        "＋ Add " + kind + " category",
      ),
    );
  return h(
    "div",
    null,
    h("a", { href: "#/more", class: "link" }, "‹ More"),
    h("h1", null, "Categories & Templates"),
    section("expense", "Expense Categories"),
    section("income", "Income Categories"),
    h("h2", { class: "dayhead" }, "Quick Templates"),
    state.templates.length
      ? h(
          "div",
          { class: "stack" },
          state.templates.map((t) =>
            h(
              "div",
              { class: "card trow" },
              h("strong", null, t.name),
              h(
                "button",
                {
                  class: "btn small",
                  onclick: () => store.dispatch({ type: "template/delete", id: t.id }),
                },
                "Delete",
              ),
            ),
          ),
        )
      : h(
          "p",
          { class: "muted small empty card" },
          'Open a transaction in Activity and tap "Save as template" to create shortcuts.',
        ),
  );
}
