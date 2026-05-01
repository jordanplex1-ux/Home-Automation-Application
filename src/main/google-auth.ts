import { shell } from 'electron'
import * as http from 'http'
import { randomBytes, createHash } from 'crypto'
import { AddressInfo } from 'net'
import Store from 'electron-store'

// ---------------------------------------------------------------------------
// OAuth credentials are injected at build time via Vite's `define` from
// .env.local (gitignored — see .env.example for the variable names).
// Setup:
//   1. Copy .env.example to .env.local
//   2. Paste your Google Cloud OAuth Client ID + Secret
//   3. Restart the dev server / rebuild
//
// The "secret" for installed-app OAuth clients is not truly secret per
// Google's own docs — it's embedded in distributed binaries. Even so, keeping
// it out of git history is good hygiene and lets contributors use their own
// Google Cloud projects.
// ---------------------------------------------------------------------------
declare const __GOOGLE_CLIENT_ID__: string
declare const __GOOGLE_CLIENT_SECRET__: string

const GOOGLE_CLIENT_ID = __GOOGLE_CLIENT_ID__
const GOOGLE_CLIENT_SECRET = __GOOGLE_CLIENT_SECRET__

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

// ---------------------------------------------------------------------------

interface GoogleAccountRecord {
  email: string
  name: string
  refreshToken: string
  addedAt: string
}

interface AccountsStoreShape {
  accounts: Record<string /* email */, GoogleAccountRecord>
}

const accountsStore = new Store<AccountsStoreShape>({
  name: 'home-planner-google-accounts',
  defaults: { accounts: {} }
})

// In-memory access-token cache so we don't refresh on every API call.
// Keyed by email; cleared on disconnect.
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>()

export interface GoogleAccount {
  email: string
  name: string
  addedAt: string
}

export function listAccounts(): GoogleAccount[] {
  const records = accountsStore.get('accounts')
  return Object.values(records).map((r) => ({
    email: r.email,
    name: r.name,
    addedAt: r.addedAt
  }))
}

export function disconnectAccount(email: string): void {
  const records = accountsStore.get('accounts')
  delete records[email]
  accountsStore.set('accounts', records)
  accessTokenCache.delete(email)
}

export function isConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0 && GOOGLE_CLIENT_SECRET.length > 0
}

// ---------------------------------------------------------------------------
// PKCE helpers (recommended by Google for desktop loopback flow)
// ---------------------------------------------------------------------------

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generatePkcePair() {
  const verifier = base64UrlEncode(randomBytes(32))
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

// ---------------------------------------------------------------------------
// Loopback HTTP server — captures the OAuth redirect
// ---------------------------------------------------------------------------

interface AuthorizationResult {
  code: string
  state: string
}

function startLoopbackServer(): Promise<{
  port: number
  waitForCode: (expectedState: string) => Promise<string>
  close: () => void
}> {
  return new Promise((resolve, reject) => {
    let resolveCode: ((code: string) => void) | null = null
    let rejectCode: ((err: Error) => void) | null = null
    let expectedState = ''

    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.statusCode = 400
        res.end('Bad request')
        return
      }
      const url = new URL(req.url, `http://127.0.0.1`)
      if (url.pathname !== '/callback') {
        res.statusCode = 404
        res.end('Not found')
        return
      }
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state') ?? ''
      const err = url.searchParams.get('error')

      if (err) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(buildResultPage('Authorisation cancelled', false))
        rejectCode?.(new Error(`OAuth error: ${err}`))
        return
      }
      if (!code) {
        res.statusCode = 400
        res.end('Missing code')
        rejectCode?.(new Error('Missing authorization code'))
        return
      }
      if (state !== expectedState) {
        res.statusCode = 400
        res.end('State mismatch — possible CSRF, refusing.')
        rejectCode?.(new Error('OAuth state mismatch'))
        return
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(buildResultPage('Account connected', true))
      resolveCode?.(code)
    })

    server.on('error', (err) => reject(err))
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      resolve({
        port,
        waitForCode: (state: string) =>
          new Promise<string>((res, rej) => {
            expectedState = state
            resolveCode = res
            rejectCode = rej
            // Hard timeout — give the user 5 minutes to approve.
            setTimeout(() => rej(new Error('OAuth timed out — no response from browser')), 5 * 60 * 1000)
          }),
        close: () => server.close()
      })
    })
  })
}

function buildResultPage(message: string, ok: boolean): string {
  const colour = ok ? '#10b981' : '#ef4444'
  return `<!doctype html><html><head><meta charset="utf-8"><title>${message}</title>
    <style>
      body { background:#0a0a0f; color:#e2e8f0; font-family:-apple-system,sans-serif;
             display:flex; align-items:center; justify-content:center;
             height:100vh; margin:0; }
      .card { text-align:center; padding:2rem 3rem; border-radius:16px;
              background:#12121a; border:1px solid ${colour}40;
              box-shadow:0 0 32px ${colour}30; }
      h1 { color:${colour}; margin:0 0 .5rem; font-weight:500; }
      p { color:#8b8fa3; margin:0; font-size:.9rem; }
    </style></head>
    <body><div class="card"><h1>${message}</h1>
      <p>You can close this tab and return to Home Planner.</p>
    </div></body></html>`
}

// ---------------------------------------------------------------------------
// Token exchange + refresh
// ---------------------------------------------------------------------------

async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

async function fetchUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) throw new Error(`User info fetch failed: ${res.status}`)
  const data = (await res.json()) as { email?: string; name?: string }
  if (!data.email) throw new Error('User info response missing email')
  return { email: data.email, name: data.name ?? data.email }
}

// ---------------------------------------------------------------------------
// Public: kick off the OAuth flow
// ---------------------------------------------------------------------------

export async function beginAuthFlow(): Promise<GoogleAccount> {
  if (!isConfigured()) {
    throw new Error(
      'Google OAuth credentials not configured. Edit src/main/google-auth.ts and paste your Client ID and Client Secret.'
    )
  }

  const server = await startLoopbackServer()
  const redirectUri = `http://127.0.0.1:${server.port}/callback`
  const state = base64UrlEncode(randomBytes(16))
  const { verifier, challenge } = generatePkcePair()

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('access_type', 'offline')      // forces refresh_token
  authUrl.searchParams.set('prompt', 'consent')           // ensure refresh_token on re-auth

  try {
    await shell.openExternal(authUrl.toString())
    const code = await server.waitForCode(state)
    const tokens = await exchangeCodeForTokens(code, redirectUri, verifier)
    const userInfo = await fetchUserInfo(tokens.access_token)

    // Persist refresh token, prime the access-token cache
    const records = accountsStore.get('accounts')
    records[userInfo.email] = {
      email: userInfo.email,
      name: userInfo.name,
      refreshToken: tokens.refresh_token,
      addedAt: new Date().toISOString()
    }
    accountsStore.set('accounts', records)
    accessTokenCache.set(userInfo.email, {
      token: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in - 60) * 1000
    })

    return { email: userInfo.email, name: userInfo.name, addedAt: records[userInfo.email].addedAt }
  } finally {
    server.close()
  }
}

// ---------------------------------------------------------------------------
// Public: get a valid access token for an account, refreshing if needed
// ---------------------------------------------------------------------------

export async function getAccessToken(email: string): Promise<string> {
  const cached = accessTokenCache.get(email)
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const records = accountsStore.get('accounts')
  const account = records[email]
  if (!account) throw new Error(`No connected Google account for ${email}`)

  const refreshed = await refreshAccessToken(account.refreshToken)
  accessTokenCache.set(email, {
    token: refreshed.access_token,
    expiresAt: Date.now() + (refreshed.expires_in - 60) * 1000
  })
  return refreshed.access_token
}
