import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import Store from 'electron-store'
import { IPC } from '../shared/ipc-channels'
import { protect, unprotectAndUpgrade } from './secure-store'
import type { RingApi, RingCamera } from 'ring-client-api'
import type { RingRestClient } from 'ring-client-api/rest-client'

// ---------------------------------------------------------------------------
// ring-client-api is pure ESM; the main bundle is CJS, so we load it lazily
// via dynamic import() inside async functions (require() can't load ESM).
// ---------------------------------------------------------------------------

interface RingStoreShape {
  refreshToken: string | null
  systemId: string | null
}

const store = new Store<RingStoreShape>({
  name: 'home-planner-ring',
  defaults: { refreshToken: null, systemId: null }
})

function getSystemId(): string {
  let id = store.get('systemId')
  if (!id) {
    id = randomUUID()
    store.set('systemId', id)
  }
  return id
}

// The Ring refresh token is a full account credential — encrypt it at rest via
// the OS keystore. Tokens written before encryption existed are migrated the
// first time they're read.
function saveRefreshToken(token: string | null): void {
  store.set('refreshToken', token ? protect(token) : null)
}

function loadRefreshToken(): string | null {
  const { value, upgraded } = unprotectAndUpgrade(store.get('refreshToken'))
  if (upgraded) {
    store.set('refreshToken', upgraded)
    console.log('[ring] Migrated stored refresh token to encrypted storage')
  }
  return value
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

let ringApi: RingApi | null = null
let cameras: RingCamera[] = []
let pendingLoginClient: RingRestClient | null = null // held between login-start and 2fa
let lastError: string | null = null
// rxjs subscriptions. API-level (token rotation) live for the API's lifetime;
// per-camera event subs are reset every time we (re)load cameras.
const subscriptions: { unsubscribe: () => void }[] = []
const cameraSubs: { unsubscribe: () => void }[] = []

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

function clearSubs(list: { unsubscribe: () => void }[]): void {
  for (const sub of list.splice(0)) {
    try {
      sub.unsubscribe()
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// Connect the API from a refresh token. Returns as soon as the API object is
// built and authenticating — camera fetching happens in the background via
// loadCameras() so a slow/failed device call never blocks (or hangs) login.
// ---------------------------------------------------------------------------

async function connectRingApi(refreshToken: string): Promise<void> {
  const { RingApi: RingApiCtor } = await import('ring-client-api')

  clearSubs(cameraSubs)
  clearSubs(subscriptions)
  cameras = []
  lastError = null

  ringApi = new RingApiCtor({
    refreshToken,
    systemId: getSystemId(),
    cameraStatusPollingSeconds: 60,
    avoidSnapshotBatteryDrain: true
  })

  // Persist rotated refresh tokens — Ring rotates them periodically and the
  // old one stops working, so we must save the new one or auth silently dies.
  const tokenSub = ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
    if (newRefreshToken) saveRefreshToken(newRefreshToken)
  })
  subscriptions.push(tokenSub)

  broadcast(IPC.RING_STATUS, buildStatus())
  // Fetch cameras without blocking the caller (login handler / startup).
  void loadCameras()
}

/** Fetch cameras and (re)wire their event subscriptions. Surfaces errors via lastError. */
async function loadCameras(): Promise<void> {
  if (!ringApi) return
  clearSubs(cameraSubs)
  try {
    const found = await ringApi.getCameras()
    cameras = found
    lastError = found.length === 0 ? 'Connected, but no cameras were found on this Ring account.' : null
    console.log(`[ring] getCameras returned ${found.length} camera(s)`)

    for (const camera of found) {
      try {
        const dingSub = camera.onDoorbellPressed.subscribe(() =>
          broadcast(IPC.RING_EVENT, { kind: 'ding', cameraId: camera.id, cameraName: camera.name, at: Date.now() })
        )
        const motionSub = camera.onMotionDetected.subscribe((motion) => {
          if (motion) broadcast(IPC.RING_EVENT, { kind: 'motion', cameraId: camera.id, cameraName: camera.name, at: Date.now() })
        })
        cameraSubs.push(dingSub, motionSub)
      } catch (e) {
        console.warn(`[ring] event subscribe failed for ${camera.name}:`, (e as Error).message)
      }
    }
  } catch (err) {
    lastError = (err as Error).message
    console.warn('[ring] getCameras failed:', lastError)
  }
  broadcast(IPC.RING_STATUS, buildStatus())
}

function buildStatus() {
  return {
    configured: !!store.get('refreshToken'),
    connected: !!ringApi,
    error: lastError,
    cameras: cameras.map((c) => ({ id: c.id, name: c.name }))
  }
}

async function getCameraById(id: number): Promise<RingCamera | undefined> {
  if (!ringApi) return undefined
  if (cameras.length === 0) cameras = await ringApi.getCameras()
  return cameras.find((c) => c.id === id)
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

export function setupRingIPC(): void {
  ipcMain.handle(IPC.RING_STATUS, () => buildStatus())

  // Step 1 of login: email + password. Returns whether a 2FA code is needed.
  ipcMain.handle(IPC.RING_LOGIN_START, async (_e, email: string, password: string) => {
    try {
      const { RingRestClient: RestClientCtor } = await import('ring-client-api/rest-client')
      pendingLoginClient = new RestClientCtor({ email, password, systemId: getSystemId() })
      // getAuth() directly (not getCurrentAuth, which caches the rejected
      // promise) — on a 2FA account this throws after triggering the code and
      // sets using2fa/promptFor2fa.
      const auth = await pendingLoginClient.getAuth()
      // No 2FA on the account — we already have a refresh token.
      saveRefreshToken(auth.refresh_token)
      await connectRingApi(auth.refresh_token)
      pendingLoginClient = null
      return { ok: true as const, needs2fa: false as const }
    } catch (err) {
      if (pendingLoginClient?.using2fa) {
        return {
          ok: true as const,
          needs2fa: true as const,
          prompt: pendingLoginClient.promptFor2fa ?? 'Enter the code Ring just sent you'
        }
      }
      pendingLoginClient = null
      return { ok: false as const, message: (err as Error).message }
    }
  })

  // Step 2 of login: the 2FA code. Returns as soon as the token is saved and
  // the API is connecting — cameras load in the background and arrive via a
  // RING_STATUS broadcast, so the UI never hangs waiting on getCameras.
  ipcMain.handle(IPC.RING_LOGIN_2FA, async (_e, code: string) => {
    if (!pendingLoginClient) {
      return { ok: false as const, message: 'No login in progress — start again.' }
    }
    try {
      const auth = await pendingLoginClient.getAuth(code)
      saveRefreshToken(auth.refresh_token)
      await connectRingApi(auth.refresh_token)
      pendingLoginClient = null
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, message: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.RING_LOGOUT, () => {
    clearSubs(cameraSubs)
    clearSubs(subscriptions)
    ringApi = null
    cameras = []
    pendingLoginClient = null
    lastError = null
    saveRefreshToken(null)
    broadcast(IPC.RING_STATUS, buildStatus())
    return { ok: true as const }
  })

  // Manual re-fetch of cameras (used by the "Refresh cameras" button).
  ipcMain.handle(IPC.RING_LIST_CAMERAS, async () => {
    if (!ringApi) return { ok: false as const, message: 'Ring not connected', cameras: [] }
    await loadCameras()
    return lastError
      ? { ok: false as const, message: lastError, cameras: cameras.map((c) => ({ id: c.id, name: c.name })) }
      : { ok: true as const, cameras: cameras.map((c) => ({ id: c.id, name: c.name })) }
  })

  // Returns a JPEG snapshot as a data URL for the renderer to show.
  ipcMain.handle(IPC.RING_SNAPSHOT, async (_e, cameraId: number) => {
    try {
      const camera = await getCameraById(cameraId)
      if (!camera) return { ok: false as const, message: 'Camera not found' }
      const buf = await camera.getSnapshot()
      return { ok: true as const, dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` }
    } catch (err) {
      return { ok: false as const, message: (err as Error).message }
    }
  })

  // Auto-connect on startup if we have a stored refresh token.
  const existing = loadRefreshToken()
  if (existing) {
    connectRingApi(existing).catch((err) => {
      lastError = (err as Error).message
      console.warn('[ring] Auto-connect failed:', lastError)
      broadcast(IPC.RING_STATUS, buildStatus())
    })
  }
}
