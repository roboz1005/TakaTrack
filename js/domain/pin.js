// PIN = local privacy only (not encryption). PBKDF2-SHA256, random salt.
const enc = (s) => new TextEncoder().encode(s), b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(pin, salt) {
  const key = await crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256));
}
export const validPin = (p) => /^\d{4,8}$/.test(p);
export async function hashPin(pin) { const salt = crypto.getRandomValues(new Uint8Array(16)); return { pinSalt: b64(salt), pinHash: await derive(pin, salt) }; }
export async function verifyPin(pin, { pinSalt, pinHash }) { return !!pinHash && (await derive(pin, unb64(pinSalt))) === pinHash; }
