import { ipcMain, BrowserWindow } from 'electron'
import Store from 'electron-store'
import WebSocket from 'ws'
import { IPC } from '../shared/ipc-channels'
import { protect, unprotectAndUpgrade } from './secure-store'

// ---------------------------------------------------------------------------
// Home Assistant WebSocket client.
//
// HA is the integration hub — it owns every device and automation. This app is
// the glass on top: authenticate once with a long-lived access token, take a
// snapshot of entity states, then stream `state_changed` events and issue
// `call_service` commands for actuation.
//
// Protocol: https://developers.home-assistant.io/docs/api/websocket
// ---------------------------------------------------------------------------

interface HaStoreShape {
  url: string | null
  token: string | null // encrypted at rest via safeStorage
  entityIds: string[] // which entities surface on the wall panel
}

const store = new Store<HaStoreShape>({
  name: 'home-planner-home-assistant',
  defaults: { url: null, token: null, entityIds: [] }
})

export interface HaEntity {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed?: string
  last_updated?: string
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

let ws: WebSocket | null = null
let connState: ConnectionState = 'disconnected'
let lastError: string | null = null
let haVersion: string | null = null
/** Every entity HA knows about, keyed by entity_id. */
const entities = new Map<string, HaEntity>()

let msgId = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

let reconnectTimer: NodeJS.Timeout | null = null
let reconnectAttempts = 0
/** Set when the failure is unrecoverable (bad token) so we stop retrying. */
let fatalAuthError = false

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function loadToken(): string | null {
  const { value, upgraded } = unprotectAndUpgrade(store.get('token'))
  if (upgraded) {
    store.set('token', upgraded)
    console.log('[ha] Migrated stored token to encrypted storage')
  }
  return value
}

/** http://host:8123 -> ws://host:8123/api/websocket (and https -> wss). */
function toWebSocketUrl(baseUrl: string): string {
  const u = new URL(baseUrl)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = '/api/websocket'
  u.search = ''
  u.hash = ''
  return u.toString()
}

function buildStatus() {
  return {
    configured: !!store.get('url') && !!store.get('token'),
    state: connState,
    error: lastError,
    haVersion,
    entityCount: entities.size,
    selectedCount: store.get('entityIds').length
  }
}

function publishStatus(): void {
  broadcast(IPC.HA_STATUS, buildStatus())
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

function send(payload: Record<string, unknown>): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
}

/** Send a command and await its `result` message. */
function command<T = unknown>(payload: Record<string, unknown>, timeoutMs = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (ws?.readyState !== WebSocket.OPEN) {
      reject(new Error('Not connected to Home Assistant'))
      return
    }
    const id = msgId++
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('Home Assistant did not respond in time'))
    }, timeoutMs)

    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timer)
        resolve(v as T)
      },
      reject: (e) => {
        clearTimeout(timer)
        reject(e)
      }
    })
    send({ ...payload, id })
  })
}

function scheduleReconnect(): void {
  if (fatalAuthError) return
  if (reconnectTimer) return
  // Exponential backoff, capped — the wall panel may boot before the HA box.
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempts, 5))
  reconnectAttempts++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void connect()
  }, delay)
}

export async function connect(): Promise<void> {
  const url = store.get('url')
  const token = loadToken()
  if (!url || !token) {
    connState = 'disconnected'
    publishStatus()
    return
  }

  disconnectSocket()
  connState = 'connecting'
  fatalAuthError = false
  publishStatus()

  let socket: WebSocket
  try {
    socket = new WebSocket(toWebSocketUrl(url))
  } catch (err) {
    connState = 'error'
    lastError = `Invalid Home Assistant URL: ${(err as Error).message}`
    publishStatus()
    return
  }
  ws = socket

  socket.on('message', (raw) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    handleMessage(msg, socket, token)
  })

  socket.on('error', (err) => {
    lastError = err.message
    // 'close' fires after this and drives the reconnect
  })

  socket.on('close', () => {
    if (ws === socket) {
      ws = null
      if (connState === 'connected' || connState === 'connecting') {
        connState = 'disconnected'
        publishStatus()
      }
      scheduleReconnect()
    }
  })
}

function handleMessage(
  msg: Record<string, unknown>,
  socket: WebSocket,
  token: string
): void {
  switch (msg.type) {
    case 'auth_required':
      haVersion = (msg.ha_version as string) ?? null
      socket.send(JSON.stringify({ type: 'auth', access_token: token }))
      return

    case 'auth_ok':
      haVersion = (msg.ha_version as string) ?? haVersion
      connState = 'connected'
      lastError = null
      reconnectAttempts = 0
      publishStatus()
      void bootstrap()
      return

    case 'auth_invalid':
      // A bad token will never fix itself — stop hammering the server.
      fatalAuthError = true
      connState = 'error'
      lastError = (msg.message as string) ?? 'Access token rejected by Home Assistant'
      publishStatus()
      socket.close()
      return

    case 'result': {
      const id = msg.id as number
      const waiter = pending.get(id)
      if (!waiter) return
      pending.delete(id)
      if (msg.success) waiter.resolve(msg.result)
      else {
        const error = msg.error as { message?: string } | undefined
        waiter.reject(new Error(error?.message ?? 'Home Assistant command failed'))
      }
      return
    }

    case 'event': {
      const event = msg.event as
        | { event_type?: string; data?: { entity_id?: string; new_state?: HaEntity | null } }
        | undefined
      if (event?.event_type !== 'state_changed') return
      const newState = event.data?.new_state
      const entityId = event.data?.entity_id
      if (!entityId) return

      if (newState) entities.set(entityId, newState)
      else entities.delete(entityId)

      // Only push entities the user has chosen to surface — HA can emit a lot
      // of traffic and the renderer doesn't need the rest.
      if (store.get('entityIds').includes(entityId) && newState) {
        broadcast(IPC.HA_STATE_CHANGED, newState)
      }
      return
    }
  }
}

/** After auth: snapshot all states, then subscribe to changes. */
async function bootstrap(): Promise<void> {
  try {
    const states = await command<HaEntity[]>({ type: 'get_states' })
    entities.clear()
    for (const e of states) entities.set(e.entity_id, e)
    await command({ type: 'subscribe_events', event_type: 'state_changed' })
    console.log(`[ha] Connected — ${entities.size} entities`)
    publishStatus()
    broadcast(IPC.HA_STATES, selectedStates())
  } catch (err) {
    lastError = (err as Error).message
    connState = 'error'
    publishStatus()
  }
}

function selectedStates(): HaEntity[] {
  const ids = store.get('entityIds')
  return ids.map((id) => entities.get(id)).filter((e): e is HaEntity => !!e)
}

function disconnectSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    const socket = ws
    ws = null
    try {
      socket.removeAllListeners()
      socket.close()
    } catch {
      /* ignore */
    }
  }
  for (const [, waiter] of pending) waiter.reject(new Error('Disconnected'))
  pending.clear()
}

// ---------------------------------------------------------------------------
// One-shot connection test — validates URL + token without touching the
// saved config, so the settings UI can verify before committing.
// ---------------------------------------------------------------------------

function testConnection(url: string, token: string): Promise<{ ok: boolean; message?: string; haVersion?: string }> {
  return new Promise((resolve) => {
    let socket: WebSocket
    try {
      socket = new WebSocket(toWebSocketUrl(url))
    } catch (err) {
      resolve({ ok: false, message: `Invalid URL: ${(err as Error).message}` })
      return
    }

    const finish = (result: { ok: boolean; message?: string; haVersion?: string }) => {
      clearTimeout(timer)
      try {
        socket.removeAllListeners()
        socket.close()
      } catch {
        /* ignore */
      }
      resolve(result)
    }

    const timer = setTimeout(
      () => finish({ ok: false, message: 'Timed out — check the URL and that HA is reachable.' }),
      10_000
    )

    socket.on('message', (raw) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }
      if (msg.type === 'auth_required') {
        socket.send(JSON.stringify({ type: 'auth', access_token: token }))
      } else if (msg.type === 'auth_ok') {
        finish({ ok: true, haVersion: msg.ha_version as string })
      } else if (msg.type === 'auth_invalid') {
        finish({ ok: false, message: (msg.message as string) ?? 'Token rejected' })
      }
    })

    socket.on('error', (err) => finish({ ok: false, message: err.message }))
    socket.on('close', () => finish({ ok: false, message: 'Connection closed before authenticating' }))
  })
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

export function setupHomeAssistantIPC(): void {
  ipcMain.handle(IPC.HA_STATUS, () => buildStatus())

  // Never returns the token itself — just whether one is stored.
  ipcMain.handle(IPC.HA_GET_CONFIG, () => ({
    url: store.get('url'),
    hasToken: !!store.get('token'),
    entityIds: store.get('entityIds')
  }))

  ipcMain.handle(
    IPC.HA_SET_CONFIG,
    async (_e, patch: { url?: string; token?: string; entityIds?: string[] }) => {
      let reconnectNeeded = false
      if (typeof patch.url === 'string') {
        store.set('url', patch.url.trim().replace(/\/+$/, ''))
        reconnectNeeded = true
      }
      if (typeof patch.token === 'string' && patch.token.length > 0) {
        store.set('token', protect(patch.token))
        reconnectNeeded = true
      }
      if (Array.isArray(patch.entityIds)) {
        store.set('entityIds', patch.entityIds)
        // Selection changed — push a fresh snapshot for the new set.
        broadcast(IPC.HA_STATES, selectedStates())
        publishStatus()
      }
      if (reconnectNeeded) {
        fatalAuthError = false
        reconnectAttempts = 0
        await connect()
      }
      return { ok: true as const }
    }
  )

  ipcMain.handle(IPC.HA_TEST_CONNECTION, async (_e, url: string, token?: string) => {
    // Fall back to the stored token so "Test" works without re-typing it.
    const useToken = token && token.length > 0 ? token : loadToken()
    if (!url || !useToken) {
      return { ok: false as const, message: 'URL and access token are both required.' }
    }
    return testConnection(url.trim().replace(/\/+$/, ''), useToken)
  })

  ipcMain.handle(IPC.HA_DISCONNECT, () => {
    disconnectSocket()
    entities.clear()
    store.set('url', null)
    store.set('token', null)
    store.set('entityIds', [])
    connState = 'disconnected'
    lastError = null
    haVersion = null
    publishStatus()
    return { ok: true as const }
  })

  /** States for the entities the user has selected. */
  ipcMain.handle(IPC.HA_GET_STATES, () => selectedStates())

  /** Lightweight list of everything HA knows about — for the entity picker. */
  ipcMain.handle(IPC.HA_LIST_ENTITIES, () =>
    [...entities.values()]
      .map((e) => ({
        entity_id: e.entity_id,
        name: (e.attributes.friendly_name as string) ?? e.entity_id,
        domain: e.entity_id.split('.')[0],
        state: e.state,
        unit: (e.attributes.unit_of_measurement as string) ?? null,
        deviceClass: (e.attributes.device_class as string) ?? null
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  )

  ipcMain.handle(
    IPC.HA_CALL_SERVICE,
    async (
      _e,
      domain: string,
      service: string,
      entityId?: string,
      data?: Record<string, unknown>
    ) => {
      try {
        await command({
          type: 'call_service',
          domain,
          service,
          service_data: data ?? {},
          ...(entityId ? { target: { entity_id: entityId } } : {})
        })
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, message: (err as Error).message }
      }
    }
  )

  // Auto-connect on startup if configured.
  if (store.get('url') && store.get('token')) {
    connect().catch((err) => {
      lastError = (err as Error).message
      console.warn('[ha] Auto-connect failed:', lastError)
      publishStatus()
    })
  }
}
