// Human-readable one-line titles for transactions (who it was with, what it was for). Pure.
const nm = (list, id) => list.find((x) => x.id === id)?.name ?? '';
export function txnTitle(t, { categories, wallets, people }) {
  const who = nm(people, t.personId) || 'someone';
  switch (t.type) {
    case 'lend': return `Lent to ${who}`;
    case 'borrow': return `Borrowed from ${who}`;
    case 'repay_in': return `${who} paid you back`;
    case 'repay_out': return `You paid back ${who}`;
    case 'transfer': return `${nm(wallets, t.walletId)} → ${nm(wallets, t.toWalletId)}`;
    case 'adjust': return 'Balance adjustment';
    default: return nm(categories, t.categoryId) || (t.type === 'income' ? 'Income' : 'Expense');
  }
}
