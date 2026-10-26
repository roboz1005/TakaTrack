import { h } from '../h.js';
import { verifyPin } from '../../domain/pin.js';
export function lockScreen({ settings, onUnlock }) {
  const inp = h('input', { class: 'input', type: 'password', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'PIN', maxlength: 8 }), msg = h('p', { class: 'muted', role: 'alert' }, '');
  const go = async () => { if (await verifyPin(inp.value, settings)) onUnlock(); else { msg.textContent = 'Wrong PIN.'; inp.value = ''; } };
  inp.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  queueMicrotask(() => inp.focus());
  return h('main', { class: 'screen' }, h('h1', null, 'TakaTrack is locked'), inp, msg, h('button', { class: 'btn primary wide', onclick: go }, 'Unlock'));
}
