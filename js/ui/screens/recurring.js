import { h } from '../h.js';
import { formatTaka } from '../../domain/money.js';
import { formatDateTime } from '../../domain/dates.js';
import { describeRule } from '../../domain/recurring.js';
export function recurringScreen({ state, store }) {
  return h('div', null, h('a', { href: '#/more', class: 'link' }, '‹ More'), h('h1', null, 'Recurring'),
    state.recurring.length ? h('div', { class: 'stack' }, state.recurring.map((r) => h('div', { class: 'card trow' },
      h('div', null, h('strong', null, `${r.name} · ${formatTaka(r.txn.amount)}`), h('div', { class: 'muted small' }, describeRule(r.rule)), h('div', { class: 'muted small' }, 'Next: ' + formatDateTime(r.nextDue, state.settings.timeFormat))),
      h('button', { class: 'btn small', onclick: () => confirm(`Stop "${r.name}"? Past entries stay.`) && store.dispatch({ type: 'recurring/delete', id: r.id }) }, 'Stop'))))
      : h('div', { class: 'card empty' }, h('p', null, 'Nothing repeats yet.'), h('p', { class: 'muted small' }, 'Open a transaction in Activity and tap "Repeat monthly" or "Repeat weekly". Missed entries are created when you open the app, each stamped with its due date and time.')));
}
