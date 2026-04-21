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
  }
})
