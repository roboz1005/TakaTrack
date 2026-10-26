import { h } from './h.js';
import { createSvgIcon } from './icons.js';
import { toast } from './toast.js';
import { addPersonUI } from './personActions.js';
import { templateChips, logTemplate } from './templates.js';
import { formatTaka } from '../domain/money.js';
import { evalExpr, pressKeyAt, sanitizeExpr } from '../domain/expr.js';
import { rankCategories, defaultWallet } from '../domain/suggest.js';
import { formatRecent, localDate, localTime } from '../domain/dates.js';
const TYPES = [
  ["expense", "Expense"],
  ["income", "Income"],
  ["transfer", "Transfer"],
  ["debt", "Debt"],
];
const DEBT = ["lend", "borrow", "repay_in", "repay_out"];
const DEBT_LABELS = [
  ["lend", "I lent"],
  ["borrow", "I borrowed"],
  ["repay_in", "They paid me"],
  ["repay_out", "I paid back"],
];
let active = false,
  backing = false;
const pad = ["7", "8", "9", "backspace", "4", "5", "6", "+", "1", "2", "3", "−", ".", "0", "="];
export function openAddSheet(store, edit = null, preset = null) {
  if (backing) {
    addEventListener("popstate", () => openAddSheet(store, edit, preset), { once: true });
    return;
  }
  if (active) return;
  active = true;
  const st = () => store.state();
  const isDebt = DEBT.includes(edit?.type);
  const m = {
    type: isDebt ? "debt" : (edit?.type ?? "expense"),
    debt: isDebt ? edit.type : "lend",
    personId: edit?.personId ?? null,
    categoryId: edit?.categoryId ?? null,
    noWallet: isDebt && !edit.walletId,
    due: edit?.dueTs ? localDate(edit.dueTs) : "",
    amt: edit ? String(edit.amount / 100) : "",
    walletId: edit?.walletId ?? null,
    toWalletId: edit?.toWalletId ?? null,
    note: edit?.note ?? "",
    pinned: edit ? edit.ts : null,
    more: false,
    fee: "",
  };
  if (preset) Object.assign(m, preset);
  m.caret = m.amt.length;
  m.amtActive = true;
  m.kbd = false;
  if (!m.walletId && !m.noWallet) m.walletId = defaultWallet(st().settings, st().wallets, m.type);
  if (m.toWalletId && m.walletId === m.toWalletId)
    m.walletId = st().wallets.find((w) => !w.archived && w.id !== m.toWalletId)?.id ?? null;
  const ts = () => m.pinned ?? Date.now();
  const wallets = () => st().wallets.filter((w) => !w.archived);
  const cats = () => st().categories.filter((c) => c.kind === m.type && !c.archived);
  const amount = () => evalExpr(m.amt) ?? 0;
  let pushed = false,
    closed = false;
  const cleanup = () => {
    removeEventListener("popstate", onPop);
    ov.remove();
    document.body.classList.remove("sheet-open");
    document.getElementById("app")?.removeAttribute("inert");
    active = false;
  };
  const onPop = () => {
    if (closed) return;
    closed = true;
    pushed = false;
    cleanup();
  };
  const close = () => {
    if (closed) return;
    closed = true;
    cleanup();
    if (pushed) {
      backing = true;
      addEventListener(
        "popstate",
        () => {
          backing = false;
        },
        { once: true },
      );
      history.back();
    }
  };
  async function save(categoryId, personId = null) {
    const a = amount();
    if (!a) {
      sheet.animate(
        [
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "none" },
        ],
        200,
      );
      return;
    }
    if (ts() > Date.now() + 6e4 && !confirm("This date/time is in the future. Save anyway?"))
      return;
    const base = {
      type: m.type,
      amount: a,
      walletId: m.walletId,
      categoryId: categoryId ?? null,
      note: m.note,
      ts: ts(),
    };
    if (m.type === "debt")
      Object.assign(base, {
        type: m.debt,
        personId: personId ?? m.personId,
        categoryId: null,
        walletId: m.noWallet ? null : m.walletId,
        dueTs:
          (m.debt === "lend" || m.debt === "borrow") && m.due
            ? new Date(m.due + "T23:59:59.999").getTime()
            : null,
      });
    if (m.type === "transfer") {
      if (!m.toWalletId || m.toWalletId === m.walletId)
        return toast("Pick a different destination wallet.");
      Object.assign(base, { toWalletId: m.toWalletId, categoryId: null });
    }
    if (edit) await store.dispatch({ type: "txn/update", id: edit.id, patch: base });
    else {
      const t = await store.dispatch({ type: "txn/add", txn: base });
      const fee = evalExpr(m.fee);
      if (m.type === "transfer" && fee) {
        const fc = st().categories.find(
          (c2) => c2.name === "Fees & Charges" && c2.kind === "expense",
        );
        await store.dispatch({
          type: "txn/add",
          txn: {
            type: "expense",
            amount: fee,
            walletId: m.walletId,
            categoryId: fc?.id ?? null,
            ts: t.ts,
            linkId: t.id,
            note: "Transfer fee",
          },
        });
      }
      await store.dispatch({
        type: "settings/update",
        patch: {
          lastUsed: { ...st().settings.lastUsed, [m.type]: { walletId: m.walletId, categoryId } },
        },
      });
      const w = st().wallets.find((x) => x.id === m.walletId),
        c = st().categories.find((x) => x.id === categoryId);
      toastUndo(`Saved ${formatTaka(a)} · ${c?.name ?? m.type} · ${w?.name ?? ""}`, t.id);
    }
    close();
  }
  function selectedCat() {
    if (m.categoryId) return m.categoryId;
    const ids = new Set(cats().map((c) => c.id));
    return (
      rankCategories(st().txns, { type: m.type, amount: amount(), walletId: m.walletId }).find(
        (id) => ids.has(id),
      ) ?? null
    );
  }
  function onAdd() {
    if (m.type === "transfer") return save(null);
    if (m.type === "debt")
      return m.personId ? save(null, m.personId) : toast("Pick a person first.");
    const c = selectedCat();
    return c ? save(c) : toast("Pick a category first.");
  }
  function debtUi() {
    const people = st()
      .people.filter((p) => !p.archived)
      .sort((a, b) => b.createdAt - a.createdAt);
    return h(
      "div",
      { class: "stack" },
      h(
        "div",
        { class: "row scroll" },
        DEBT_LABELS.map(([id, l]) =>
          h(
            "button",
            {
              class: m.debt === id ? "chip on" : "chip",
              onclick: () => {
                m.debt = id;
                draw();
              },
            },
            l,
          ),
        ),
        h(
          "button",
          {
            class: m.noWallet ? "chip on" : "chip",
            onclick: () => {
              m.noWallet = !m.noWallet;
              draw();
            },
          },
          "No wallet",
        ),
      ),
      (m.debt === "lend" || m.debt === "borrow") &&
        h(
          "label",
          { class: "row small" },
          "Due date (optional)",
          h("input", {
            class: "input",
            type: "date",
            onfocus: blurAmt,
            value: m.due,
            onchange: (e) => {
              m.due = e.target.value;
            },
          }),
        ),
      h(
        "div",
        { class: "grid" },
        people.map((p) =>
          h(
            "button",
            {
              class: m.personId === p.id ? "chip on" : "chip",
              onclick: () => {
                m.personId = p.id;
                if (st().settings.fastSaveTap) save(null, p.id);
                else draw();
              },
            },
            p.name,
          ),
        ),
        h(
          "button",
          {
            class: "chip",
            onclick: async () => {
              const n = prompt("Person name");
              if (n?.trim()) {
                const p = await addPersonUI(store, n);
                if (p) {
                  m.personId = p.id;
                  draw();
                }
              }
            },
          },
          "＋ New person",
        ),
      ),
    );
  }
  function toastUndo(msg, id) {
    document.querySelector(".toast")?.remove();
    const el = h(
      "div",
      { class: "toast", role: "status" },
      h("span", null, msg),
      h(
        "button",
        {
          class: "btn small",
          onclick: () => {
            store.dispatch({ type: "txn/delete", id });
            el.remove();
          },
        },
        "Undo",
      ),
      h(
        "button",
        {
          class: "btn small",
          onclick: () => {
            el.remove();
            openAddSheet(
              store,
              st().txns.find((t) => t.id === id),
            );
          },
        },
        "Edit",
      ),
    );
    document.body.append(el);
    setTimeout(() => el.remove(), 5e3);
  }
  const ov = h("div", { class: "overlay", onclick: (e) => e.target === ov && close() });
  const sheet = h("div", { class: "sheet", role: "dialog", "aria-label": "Add transaction" });
  ov.append(sheet);
  function draw() {
    const ranked = rankCategories(st().txns, {
      type: m.type,
      amount: amount(),
      walletId: m.walletId,
    });
    const list = cats().sort(
      (a, b) => (ranked.indexOf(a.id) + 1 || 99) - (ranked.indexOf(b.id) + 1 || 99),
    );
    const shown = m.more ? list : list.slice(0, 8),
      sel = selectedCat();
    const children = [
      h("div", { class: "drag-handle" }),
      h(
        "div",
        { class: "sheet-head" },
        h("button", { class: "btn small", type: "button", onclick: close }, "Cancel"),
        h(
          "strong",
          { style: { fontSize: "1rem" } },
          edit ? "Edit Transaction" : "New Transaction",
        ),
        h("div", { style: { width: "48px" } }),
      ),
      !edit && st().templates.length > 0
        ? h(
            "div",
            { class: "row scroll" },
            st().templates.map((t) =>
              h(
                "button",
                {
                  class: "chip",
                  onclick: () => {
                    close();
                    logTemplate(store, t);
                  },
                },
                t.name,
              ),
            ),
          )
        : null,
      h(
        "div",
        { class: "row wrap" },
        TYPES.map(([id, label]) =>
          h(
            "button",
            {
              class: m.type === id ? "chip on" : "chip",
              onclick: () => {
                m.type = id;
                m.categoryId = null;
                draw();
              },
            },
            label,
          ),
        ),
      ),
      h(
        "div",
        { class: "amt-row" },
        h("span", { class: "amt-symbol" }, "৳"),
        amtEl,
        h(
          "button",
          {
            class: "icon-btn",
            type: "button",
            "aria-label": m.kbd ? "Use keypad" : "Use keyboard",
            onmousedown: (e) => e.preventDefault(),
            onclick: toggleKbd,
          },
          m.kbd ? "⌨" : "🔢",
        ),
      ),
      /[+-]/.test(m.amt)
        ? h(
            "div",
            { class: "muted small amt-display" },
            amount() ? "= " + formatTaka(amount()) : "calculating...",
          )
        : null,
      h(
        "div",
        { class: "keypad" },
        pad.map((k) =>
          h(
            "button",
            {
              class: "key",
              type: "button",
              "aria-label": k === "backspace" ? "Backspace" : k === "=" ? "Calculate" : k,
              onmousedown: (e) => e.preventDefault(),
              onclick: () => apply(k),
            },
            k === "backspace" ? createSvgIcon("backspace", 22) : k,
          ),
        ),
      ),
      h(
        "div",
        null,
        h(
          "div",
          { class: "muted small", style: { marginBottom: "4px", fontWeight: 600 } },
          "Account / Wallet",
        ),
        h(
          "div",
          { class: "row scroll" },
          wallets().map((w) =>
            h(
              "button",
              {
                class: m.walletId === w.id ? "chip on" : "chip",
                onclick: () => {
                  m.walletId = w.id;
                  draw();
                },
              },
              w.name,
            ),
          ),
        ),
      ),
      m.type === "transfer"
        ? h(
            "div",
            { class: "stack" },
            h("div", { class: "muted small", style: { fontWeight: 600 } }, "Destination Wallet"),
            h(
              "div",
              { class: "row scroll" },
              wallets()
                .filter((w) => w.id !== m.walletId)
                .map((w) =>
                  h(
                    "button",
                    {
                      class: m.toWalletId === w.id ? "chip on" : "chip",
                      onclick: () => {
                        m.toWalletId = w.id;
                        draw();
                      },
                    },
                    w.name,
                  ),
                ),
            ),
            h("input", {
              class: "input",
              placeholder: "Transfer fee (optional)",
              inputmode: "decimal",
              onfocus: blurAmt,
              value: m.fee,
              oninput: (e) => (m.fee = e.target.value),
            }),
          )
        : m.type === "debt"
          ? debtUi()
          : h(
              "div",
              null,
              h(
                "div",
                { class: "muted small", style: { marginBottom: "6px", fontWeight: 600 } },
                "Category",
              ),
              h(
                "div",
                { class: "grid" },
                shown.map((c) =>
                  h(
                    "button",
                    {
                      class: sel === c.id ? "chip on" : "chip",
                      "aria-pressed": sel === c.id,
                      onclick: () => {
                        m.categoryId = c.id;
                        if (st().settings.fastSaveTap) save(c.id);
                        else draw();
                      },
                    },
                    c.name,
                  ),
                ),
                !m.more &&
                  list.length > 8 &&
                  h(
                    "button",
                    {
                      class: "chip",
                      onclick: () => {
                        m.more = true;
                        draw();
                      },
                    },
                    "More…",
                  ),
              ),
            ),
      h(
        "div",
        { class: "row wrap" },
        h(
          "button",
          {
            class: "chip",
            onclick: () => {
              m.pinned = null;
              draw();
            },
          },
          m.pinned ? formatRecent(m.pinned, Date.now(), st().settings.timeFormat) : "Today (Now)",
        ),
        h("input", {
          class: "input",
          type: "date",
          "aria-label": "Date",
          onfocus: blurAmt,
          value: localDate(ts()),
          onchange: (e) => {
            m.pinned = new Date(e.target.value + "T" + localTime(ts())).getTime();
            draw();
          },
        }),
        h("input", {
          class: "input",
          type: "time",
          "aria-label": "Time",
          onfocus: blurAmt,
          value: localTime(ts()),
          onchange: (e) => {
            m.pinned = new Date(localDate(ts()) + "T" + e.target.value).getTime();
            draw();
          },
        }),
      ),
      h("input", {
        class: "input",
        placeholder: "Note or description (optional)",
        onfocus: blurAmt,
        value: m.note,
        oninput: (e) => (m.note = e.target.value),
      }),
      h(
        "button",
        { class: "btn primary wide add-btn", onclick: onAdd },
        (edit ? "Save Changes" : "Add") + (amount() ? " " + formatTaka(amount()) : ""),
      ),
    ].filter(Boolean);
    sheet.replaceChildren(...children);
    if (amtEl.value !== m.amt) amtEl.value = m.amt;
    amtEl.style.fontSize =
      m.amt.length > 36
        ? "1.3rem"
        : m.amt.length > 24
          ? "1.6rem"
          : m.amt.length > 14
            ? "1.9rem"
            : "";
    fit();
    if (m.amtActive) {
      amtEl.focus({ preventScroll: true });
      setCaret(Math.min(m.caret ?? m.amt.length, m.amt.length));
    }
  }
  const blurAmt = () => {
    m.amtActive = false;
  };
  const amtEl = h("textarea", {
    class: "amt-input",
    rows: 1,
    inputmode: "none",
    autocomplete: "off",
    autocorrect: "off",
    spellcheck: "false",
    placeholder: "0",
    "aria-label": "Amount. You can type a calculation like 30+20",
  });
  amtEl.value = m.amt;
  const setCaret = (pos) => {
    m.caret = pos;
    try {
      amtEl.setSelectionRange(pos, pos);
    } catch {}
  };
  const fit = () => {
    amtEl.style.height = "auto";
    amtEl.style.height = amtEl.scrollHeight + "px";
  };
  function apply(k) {
    const r = pressKeyAt(
      m.amt,
      k,
      amtEl.selectionStart ?? m.amt.length,
      amtEl.selectionEnd ?? m.amt.length,
    );
    m.amt = r.amt;
    amtEl.value = r.amt;
    m.caret = r.caret;
    m.amtActive = true;
    draw();
  }
  function toggleKbd() {
    m.kbd = !m.kbd;
    amtEl.setAttribute("inputmode", m.kbd ? "text" : "none");
    m.amtActive = true;
    amtEl.blur();
    draw();
  }
  amtEl.addEventListener("focus", () => {
    m.amtActive = true;
  });
  amtEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (/[+-]/.test(m.amt)) apply("=");
      else onAdd();
    }
  });
  amtEl.addEventListener("input", () => {
    const pos = amtEl.selectionStart ?? amtEl.value.length,
      clean = sanitizeExpr(amtEl.value),
      caret = sanitizeExpr(amtEl.value.slice(0, pos)).length;
    m.amt = clean;
    if (amtEl.value !== clean) amtEl.value = clean;
    m.caret = Math.min(caret, clean.length);
    draw();
  });
  ov.addEventListener("keydown", (e) => e.key === "Escape" && close());
  sheet.tabIndex = -1;
  draw();
  document.body.append(ov);
  amtEl.focus({ preventScroll: true });
  setCaret(m.amt.length);
  history.pushState({ takaSheet: true }, "");
  pushed = true;
  addEventListener("popstate", onPop);
  document.body.classList.add("sheet-open");
  document.getElementById("app")?.setAttribute("inert", "");
}
