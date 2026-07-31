import { safeStorage } from 'electron'

/**
 * Encryption helpers for secrets held in electron-store.
 *
 * Electron's safeStorage is backed by the OS keystore — DPAPI on Windows,
 * Keychain on macOS, libsecret on Linux — so ciphertext is bound to the user
 * account and can't simply be lifted out of the JSON file and reused.
 *
 * Values are tagged with a version prefix so we can tell an encrypted value
 * from a legacy plaintext one and migrate transparently on first read.
 */

const PREFIX = 'enc:v1:'

let warnedUnavailable = false

/** True when the OS keystore is usable. Only meaningful after `app.whenReady()`. */
export function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function isProtected(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/**
 * Encrypt a secret for storage. If the OS keystore is unavailable we fall back
 * to storing plaintext rather than losing the user's session — the app keeps
 * working, just without at-rest protection. Logged once so it's visible.
 */
export function protect(plain: string): string {
  if (!plain) return plain
  if (isProtected(plain)) return plain // already encrypted, don't double-wrap
  if (!isEncryptionAvailable()) {
    if (!warnedUnavailable) {
      console.warn(
        '[secure-store] OS keystore unavailable — secrets will be stored unencrypted.'
      )
      warnedUnavailable = true
    }
    return plain
  }
  try {
    return PREFIX + safeStorage.encryptString(plain).toString('base64')
  } catch (err) {
    console.warn('[secure-store] Encrypt failed, storing plaintext:', (err as Error).message)
    return plain
  }
}

/**
 * Decrypt a stored secret. Legacy plaintext values (written before encryption
 * was introduced) are returned as-is so existing sessions keep working.
 * Returns null if a value was encrypted but can't be decrypted — e.g. the
 * store was copied from another machine or user profile.
 */
export function unprotect(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (!isProtected(stored)) return stored // legacy plaintext
  try {
    return safeStorage.decryptString(Buffer.from(stored.slice(PREFIX.length), 'base64'))
  } catch (err) {
    console.warn(
      '[secure-store] Could not decrypt a stored secret (wrong machine/profile?):',
      (err as Error).message
    )
    return null
  }
}

/**
 * Returns the plaintext value and, when the stored form was legacy plaintext,
 * the encrypted form to write back. Lets callers migrate on read without
 * duplicating the branch everywhere.
 */
export function unprotectAndUpgrade(
  stored: string | null | undefined
): { value: string | null; upgraded: string | null } {
  if (!stored) return { value: null, upgraded: null }
  if (isProtected(stored)) return { value: unprotect(stored), upgraded: null }
  // Legacy plaintext — hand back an encrypted version for the caller to persist
  const upgraded = protect(stored)
  return { value: stored, upgraded: upgraded !== stored ? upgraded : null }
}
