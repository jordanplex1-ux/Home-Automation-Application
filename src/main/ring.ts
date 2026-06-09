import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import Store from 'electron-store'
import { IPC } from '../shared/ipc-channels'
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

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

let ringApi: RingApi | null = null
let cameras: RingCamera[] = []
let pendingLoginClient: RingRestClient | null = null // held between login-start and 2fa
let lastError: string | null = null
// rxjs subscriptions we need to tear down on re-init / logout
const subscriptions: { unsubscribe: () => void }[] = []

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

function clearSubscriptions(): void {
  for (const sub of subscriptions.splice(0)) {
    try {
      sub.unsubscribe()
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// Initialise the API from a stored refresh token and wire up camera events.
// ---------------------------------------------------------------------------

async function initFromRefreshToken(refreshToken: string): Promise<void> {
  const { RingApi: RingApiCtor } = await import('ring-client-api')

  clearSubscriptions()

  ringApi = new RingApiCtor({
    refreshToken,
    systemId: getSystemId(),
    // Poll camera status so battery/online state stays current. Snapshots are
    // pulled on demand by the renderer.
    cameraStatusPollingSeconds: 60,
    // Avoid forcing fresh snapshots that drain battery cams — use cached where
    // Ring allows.
    avoidSnapshotBatteryDrain: true
  })

  // Persist rotated refresh tokens — Ring rotates them periodically and the
  // old one stops working, so we must save the new one or auth silently dies.
  const tokenSub = ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
    store.set('refreshToken', newRefreshToken)
  })
  subscriptions.push(tokenSub)

  cameras = await ringApi.getCameras()
  lastError = null

  for (const camera of cameras) {
    // Doorbell button press → the "alert" that pops the live feed over
    // everything. Broadcast to all windows; the renderer owns the overlay.
    const dingSub = camera.onDoorbellPressed.subscribe(() => {
      broadcast(IPC.RING_EVENT, {
        kind: 'ding',
        cameraId: camera.id,
        cameraName: camera.name,
        at: Date.now()
      })
    })
    // Motion is broadcast too (renderer decides whether to surface it) but
    // doesn't force the takeover popup by default — motion is noisy.
    const motionSub = camera.onMotionDetected.subscribe((motion) => {
      if (!motion) return
      broadcast(IPC.RING_EVENT, {
        kind: 'motion',
        cameraId: camera.id,
        cameraName: camera.name,
        at: Date.now()
      })
    })
    subscriptions.push(dingSub, motionSub)
  }

  broadcast(IPC.RING_STATUS, buildStatus())
}

function buildStatus() {
  return {
    configured: !!store.get('refreshToken'),
    connected: !!ringApi && cameras.length >= 0 && lastError === null,
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
      const auth = await pendingLoginClient.getCurrentAuth()
      // No 2FA on the account — we already have a refresh token.
      store.set('refreshToken', auth.refresh_token)
      await initFromRefreshToken(auth.refresh_token)
      pendingLoginClient = null
      return { ok: true as const, needs2fa: false as const }
    } catch (err) {
      // When 2FA is enabled, getCurrentAuth throws after triggering the code.
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

  // Step 2 of login: the 2FA code.
  ipcMain.handle(IPC.RING_LOGIN_2FA, async (_e, code: string) => {
    if (!pendingLoginClient) {
      return { ok: false as const, message: 'No login in progress — start again.' }
    }
    try {
      const auth = await pendingLoginClient.getAuth(code)
      store.set('refreshToken', auth.refresh_token)
      await initFromRefreshToken(auth.refresh_token)
      pendingLoginClient = null
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, message: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.RING_LOGOUT, () => {
    clearSubscriptions()
    ringApi = null
    cameras = []
    pendingLoginClient = null
    lastError = null
    store.set('refreshToken', null)
    broadcast(IPC.RING_STATUS, buildStatus())
    return { ok: true as const }
  })

  ipcMain.handle(IPC.RING_LIST_CAMERAS, async () => {
    if (!ringApi) return { ok: false as const, message: 'Ring not connected', cameras: [] }
    try {
      cameras = await ringApi.getCameras()
      return { ok: true as const, cameras: cameras.map((c) => ({ id: c.id, name: c.name })) }
    } catch (err) {
      return { ok: false as const, message: (err as Error).message, cameras: [] }
    }
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
  const existing = store.get('refreshToken')
  if (existing) {
    initFromRefreshToken(existing).catch((err) => {
      lastError = (err as Error).message
      console.warn('[ring] Auto-connect failed:', lastError)
      broadcast(IPC.RING_STATUS, buildStatus())
    })
  }
}
