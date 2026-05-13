/**
 * PIN hashing for the edit-lock feature. SHA-256 is overkill for "stop a kid
 * unlocking edit mode", but it's free via the WebCrypto API and means the
 * raw PIN never sits in electron-store. Not a security boundary against an
 * adult with file access — the threat model is just "no peeking and tapping".
 */

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin.trim())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPin(pin: string, expectedHash: string): Promise<boolean> {
  const candidate = await hashPin(pin)
  // Constant-time-ish comparison — the input is short and the hash is fixed
  // length, so just compare strings.
  return candidate.length === expectedHash.length && candidate === expectedHash
}
