import { h } from '../h.js';
import { parseTaka } from '../../domain/money.js';
import { WALLET_PRESETS } from '../../domain/seed.js';

export function onboardingScreen({ store, onDone }) {
  const rows = WALLET_PRESETS.map((p, i) => ({ ...p, on: i < 2, amount: '' }));   // Cash + bKash pre-picked
  const error = h('p', { class: 'error', role: 'alert' });
  const list = h('div', { class: 'stack' });
  const customName = h('input', { class: 'input', placeholder: 'Other wallet (e.g. DBBL Rocket)', 'aria-label': 'Custom wallet name' });

  function draw() {
    list.replaceChildren(...rows.map((r) => h('div', { class: 'wrow' },
      h('button', { class: 'chip' + (r.on ? ' on' : ''), type: 'button', 'aria-pressed': String(r.on), onclick: () => { r.on = !r.on; draw(); } }, r.name),
      r.on && h('input', { class: 'input amt', inputmode: 'decimal', placeholder: 'Balance today (৳)', 'aria-label': r.name + ' balance', value: r.amount,
        oninput: (e) => { r.amount = e.target.value; } }))));
  }
  draw();
  const start = async () => {
    const picked = rows.filter((r) => r.on);
    if (!picked.length) { error.textContent = 'Pick at least one wallet.'; return; }
    const wallets = [];
    for (const r of picked) {
      const v = r.amount.trim() === '' ? 0 : parseTaka(r.amount);
      if (v === null) { error.textContent = `Check the balance for ${r.name}: use numbers like 1500 or 1500.50.`; return; }
      wallets.push({ name: r.name, kind: r.kind, color: r.color, openingBalance: v });
    }
    await store.dispatch({ type: 'onboard/complete', wallets }); onDone();
  };
  return h('main', { class: 'screen onboarding' },
    h('h1', null, 'Welcome to TakaTrack'),
    h('p', { class: 'muted' }, 'Which wallets do you use? Enter what is in each one right now. Everything stays on this device.'),
    list,
    h('div', { class: 'wrow' }, customName, h('button', { class: 'btn ghost', type: 'button', onclick: () => {
      const n = customName.value.trim(); if (!n) return;
      rows.push({ name: n, kind: 'other', color: '#6b5b3e', on: true, amount: '' }); customName.value = ''; draw(); } }, 'Add')),
    error,
    h('button', { class: 'btn primary wide', type: 'button', onclick: start }, 'Start tracking'));
}
