import { h } from './h.js';
let timer;
export function toast(msg, ms = 2600) {
  document.querySelector('.toast')?.remove(); clearTimeout(timer);
  const el = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(el);
  timer = setTimeout(() => el.remove(), ms);
}
export function banner(msg, label, onClick) {
  const el = h('div', { class: 'toast banner', role: 'alert' }, h('span', null, msg), h('button', { class: 'btn small', onclick: onClick }, label));
  document.body.append(el); return el;
}
