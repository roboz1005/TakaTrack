/** "?a=expense|income|lend" -> add-sheet preset, or null */
export function parseDeepLink(search) {
  const a = new URLSearchParams(search).get('a');
  if (a === 'expense' || a === 'income') return { type: a };
  if (a === 'lend') return { type: 'debt', debt: 'lend' };
  return null;
}
