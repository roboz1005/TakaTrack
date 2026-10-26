import { SCHEMA_VERSION } from './migrations.js';
export const EXPENSE_CATEGORIES = ['Food','Transport','Groceries','Bills & Utilities','Mobile/Internet','Shopping','Health','Education','Rent','Entertainment','Family & Gifts','Fees & Charges','Other'];
export const INCOME_CATEGORIES = ['Salary','Business','Freelance','Gift','Refund','Other'];
export const WALLET_PRESETS = [
  { name: 'Cash', kind: 'cash', color: '#0e5a43' }, { name: 'bKash', kind: 'mobile', color: '#d12a6b' },
  { name: 'Nagad', kind: 'mobile', color: '#e8590c' }, { name: 'Rocket', kind: 'mobile', color: '#7b2d8e' },
  { name: 'Bank', kind: 'bank', color: '#1d4f91' }, { name: 'Card', kind: 'card', color: '#4a4a52' },
];
export function defaultSettings() {
  return { id: 'app', currency: 'BDT', locale: 'en-BD', monthStartDay: 1, fastSave: true, launchIntoAdd: false,
    hideBalances: false, theme: 'auto', lang: 'en', timeFormat: '12h', lastUsed: {},
    backup: { lastAt: null, nudgeDays: 7 }, schemaVersion: SCHEMA_VERSION, onboarded: false };
}
export function defaultCategories() {
  const mk = (kind) => (name, order) => ({ name, kind, color: '', icon: '', archived: false, order });
  return [...EXPENSE_CATEGORIES.map(mk('expense')), ...INCOME_CATEGORIES.map(mk('income'))];
}
