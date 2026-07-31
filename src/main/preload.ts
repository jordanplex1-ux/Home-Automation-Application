import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key: string) => ipcRenderer.invoke(IPC.STORE_GET, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC.STORE_SET, key, value),
    delete: (key: string) => ipcRenderer.invoke(IPC.STORE_DELETE, key)
  },
  bins: {
    fetchBarnsley: (uprn: string, postcode: string) =>
      ipcRenderer.invoke(IPC.BINS_FETCH_BARNSLEY, uprn, postcode)
  },
  window: {
    toggleFullscreen: () => ipcRenderer.invoke(IPC.WINDOW_TOGGLE_FULLSCREEN)
  },
  autostart: {
    get: () => ipcRenderer.invoke(IPC.AUTOSTART_GET),
    set: (enabled: boolean) => ipcRenderer.invoke(IPC.AUTOSTART_SET, enabled)
  },
  backup: {
    export: () => ipcRenderer.invoke(IPC.BACKUP_EXPORT),
    restore: () => ipcRenderer.invoke(IPC.BACKUP_RESTORE),
    getSchedule: () => ipcRenderer.invoke(IPC.BACKUP_SCHEDULE_GET),
    setSchedule: (patch: unknown) => ipcRenderer.invoke(IPC.BACKUP_SCHEDULE_SET, patch),
    pickFolder: () => ipcRenderer.invoke(IPC.BACKUP_PICK_FOLDER)
  },
  updater: {
    check: () => ipcRenderer.invoke(IPC.UPDATER_CHECK),
    installNow: () => ipcRenderer.invoke(IPC.UPDATER_INSTALL_NOW),
    onStatus: (cb: (status: unknown) => void) => {
      const handler = (_e: unknown, status: unknown) => cb(status)
      ipcRenderer.on(IPC.UPDATER_STATUS, handler)
      return () => ipcRenderer.removeListener(IPC.UPDATER_STATUS, handler)
    }
  },
  photos: {
    pickFolder: () => ipcRenderer.invoke(IPC.PHOTOS_PICK_FOLDER),
    list: (folder: string) => ipcRenderer.invoke(IPC.PHOTOS_LIST, folder),
    read: (path: string) => ipcRenderer.invoke(IPC.PHOTOS_READ, path)
  },
  news: {
    fetch: (sourceIds: string[]) => ipcRenderer.invoke(IPC.NEWS_FETCH, sourceIds),
    sources: () => ipcRenderer.invoke(IPC.NEWS_SOURCES)
  },
  google: {
    isConfigured: () => ipcRenderer.invoke(IPC.GOOGLE_AUTH_IS_CONFIGURED),
    listAccounts: () => ipcRenderer.invoke(IPC.GOOGLE_AUTH_LIST_ACCOUNTS),
    beginAuth: () => ipcRenderer.invoke(IPC.GOOGLE_AUTH_BEGIN),
    disconnect: (email: string) => ipcRenderer.invoke(IPC.GOOGLE_AUTH_DISCONNECT, email),
    listCalendars: (email: string) => ipcRenderer.invoke(IPC.GOOGLE_CALENDAR_LIST, email),
    fetchEvents: (
      requests: { email: string; calendarId: string }[],
      timeMinISO: string,
      timeMaxISO: string
    ) => ipcRenderer.invoke(IPC.GOOGLE_EVENTS_FETCH, requests, timeMinISO, timeMaxISO)
  },
  ring: {
    status: () => ipcRenderer.invoke(IPC.RING_STATUS),
    loginStart: (email: string, password: string) =>
      ipcRenderer.invoke(IPC.RING_LOGIN_START, email, password),
    login2fa: (code: string) => ipcRenderer.invoke(IPC.RING_LOGIN_2FA, code),
    logout: () => ipcRenderer.invoke(IPC.RING_LOGOUT),
    listCameras: () => ipcRenderer.invoke(IPC.RING_LIST_CAMERAS),
    snapshot: (cameraId: number) => ipcRenderer.invoke(IPC.RING_SNAPSHOT, cameraId),
    onEvent: (cb: (event: unknown) => void) => {
      const handler = (_e: unknown, event: unknown) => cb(event)
      ipcRenderer.on(IPC.RING_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC.RING_EVENT, handler)
    },
    onStatus: (cb: (status: unknown) => void) => {
      const handler = (_e: unknown, status: unknown) => cb(status)
      ipcRenderer.on(IPC.RING_STATUS, handler)
      return () => ipcRenderer.removeListener(IPC.RING_STATUS, handler)
    }
  },
  homeAssistant: {
    status: () => ipcRenderer.invoke(IPC.HA_STATUS),
    getConfig: () => ipcRenderer.invoke(IPC.HA_GET_CONFIG),
    setConfig: (patch: unknown) => ipcRenderer.invoke(IPC.HA_SET_CONFIG, patch),
    testConnection: (url: string, token?: string) =>
      ipcRenderer.invoke(IPC.HA_TEST_CONNECTION, url, token),
    disconnect: () => ipcRenderer.invoke(IPC.HA_DISCONNECT),
    getStates: () => ipcRenderer.invoke(IPC.HA_GET_STATES),
    listEntities: () => ipcRenderer.invoke(IPC.HA_LIST_ENTITIES),
    callService: (
      domain: string,
      service: string,
      entityId?: string,
      data?: Record<string, unknown>
    ) => ipcRenderer.invoke(IPC.HA_CALL_SERVICE, domain, service, entityId, data),
    onStatus: (cb: (status: unknown) => void) => {
      const handler = (_e: unknown, status: unknown) => cb(status)
      ipcRenderer.on(IPC.HA_STATUS, handler)
      return () => ipcRenderer.removeListener(IPC.HA_STATUS, handler)
    },
    onStates: (cb: (states: unknown) => void) => {
      const handler = (_e: unknown, states: unknown) => cb(states)
      ipcRenderer.on(IPC.HA_STATES, handler)
      return () => ipcRenderer.removeListener(IPC.HA_STATES, handler)
    },
    onStateChanged: (cb: (state: unknown) => void) => {
      const handler = (_e: unknown, state: unknown) => cb(state)
      ipcRenderer.on(IPC.HA_STATE_CHANGED, handler)
      return () => ipcRenderer.removeListener(IPC.HA_STATE_CHANGED, handler)
    }
  }
})
