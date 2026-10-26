// Screens that arrive in later milestones. Home shows the live total + wallet strip already.
import { h } from '../h.js';
import { formatTaka } from '../../domain/money.js';
import { walletBalances, totals } from '../../domain/ledger.js';

const soon = (title, ms, text) => () => h('div', null, h('h1', null, title),
  h('div', { class: 'card empty' }, h('p', null, text), h('p', { class: 'muted small' }, `Arrives in milestone ${ms}.`)));

export function moreScreen() {
  const item = (href, label, sub) => h('a', { class: 'card link-card', href }, h('strong', null, label), h('span', { class: 'muted small' }, sub));
  return h('div', null, h('h1', null, 'More'), h('div', { class: 'stack' },
    item('#/wallets', 'Wallets', 'Add, rename, archive'),
    item('#/goals', 'Savings goals', 'Save towards something'),
    item('#/recurring', 'Recurring', 'Salary, rent, subscriptions'),
    item('#/reports', 'Reports', 'Category breakdown and 12-month trend'),
    item('#/categories', 'Categories & templates', 'Add, rename, archive'),
    item('#/settings', 'Settings & backup', 'Display, export, import, CSV, reconcile')));
}
