import { h } from '../h.js';
export function moreScreen() {
  const item = (href, label, sub) =>
    h(
      "a",
      { class: "card link-card", href },
      h("strong", null, label),
      h("span", { class: "muted small" }, sub),
    );
  return h(
    "div",
    null,
    h("h1", null, "More"),
    h(
      "div",
      { class: "stack" },
      item("#/wallets", "Wallets", "Add, rename, manage accounts"),
      item("#/goals", "Savings Goals", "Save towards specific financial targets"),
      item("#/recurring", "Recurring Rules", "Automate salary, rent, subscriptions"),
      item("#/reports", "Analytics & Reports", "Category breakdown & 12-month trends"),
      item("#/categories", "Categories & Templates", "Customize labels and quick-add templates"),
      item("#/settings", "Settings & Backups", "Theme, digits, security PIN, export/import"),
    ),
  );
}
