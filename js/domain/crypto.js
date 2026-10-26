// Passphrase-encrypted backups: PBKDF2-SHA256 -> AES-GCM-256 (WebCrypto).
const enc = new TextEncoder(), dec = new TextDecoder();
const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function aesKey(pass, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export const isEncrypted = (o) => o?.app === 'takatrack-encrypted';
export async function encryptText(text, pass, iter = 250000) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(pass, salt, iter), enc.encode(text));
  return { app: 'takatrack-encrypted', v: 1, kdf: 'PBKDF2-SHA256', iter, salt: toB64(salt), iv: toB64(iv), data: toB64(new Uint8Array(ct)) };
}
export async function decryptText(o, pass) {
  try { return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(o.iv) }, await aesKey(pass, fromB64(o.salt), o.iter), fromB64(o.data))); }
  catch { throw new Error('Wrong passphrase or damaged file'); }
}
