// Browser side of backup: downloads + file picker. Logic lives in domain/backup.js.
import { buildBackup, validateBackup, toCsv } from './domain/backup.js';
import { encryptText, decryptText, isEncrypted } from './domain/crypto.js';
import { toast } from './ui/toast.js';
function download(name, text, type) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const day = () => new Date().toISOString().slice(0, 10);
export async function doExport(store) {
  download(`takatrack-backup-${day()}.json`, JSON.stringify(buildBackup(store.state()), null, 1), 'application/json');
  await store.dispatch({ type: 'settings/update', patch: { backup: { ...store.state().settings.backup, lastAt: Date.now() } } });
  toast('Backup saved to your downloads.');
}
export async function doExportEncrypted(store) {
  const p = prompt('Choose a passphrase (8+ characters). Without it the backup cannot be opened — there is no recovery.'); if (p == null) return;
  if (p.length < 8) return toast('Passphrase must be at least 8 characters.'); if (prompt('Repeat the passphrase') !== p) return toast('Passphrases did not match.');
  download(`takatrack-backup-${day()}.enc.json`, JSON.stringify(await encryptText(JSON.stringify(buildBackup(store.state())), p)), 'application/json');
  await store.dispatch({ type: 'settings/update', patch: { backup: { ...store.state().settings.backup, lastAt: Date.now() } } });
  toast('Encrypted backup saved.');
}
export const doCsv = (store) => download(`takatrack-${day()}.csv`, '\ufeff' + toCsv(store.state()), 'text/csv');
export function pickImport(store) {
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  inp.onchange = async () => {
    try {
      let obj = JSON.parse(await inp.files[0].text());
      if (isEncrypted(obj)) { const p = prompt('Passphrase for this backup'); if (p == null) return; obj = JSON.parse(await decryptText(obj, p)); }
      const data = validateBackup(obj);
      const merge = confirm(`Backup has ${data.txns.length} transactions.\nOK = MERGE into current data (newer edits win)\nCancel = choose REPLACE instead`);
      if (!merge && !confirm('REPLACE all current data with this backup? This cannot be undone.')) return;
      await store.dispatch({ type: 'data/import', data, mode: merge ? 'merge' : 'replace' });
      toast('Import complete.');
    } catch (e) { toast('Could not import: ' + e.message, 5000); }
  };
  inp.click();
}
