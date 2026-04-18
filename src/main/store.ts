import Store from 'electron-store'
import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc-channels'

const store = new Store({
  name: 'home-planner-data',
  defaults: {
    widgets: { instances: [], layouts: {} },
    calendar: { events: [] },
    settings: { autoStart: false, accentColor: '#00d4ff' }
  }
})

export function setupStoreIPC(): void {
  ipcMain.handle(IPC.STORE_GET, (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle(IPC.STORE_SET, (_event, key: string, value: unknown) => {
    store.set(key, value)
  })

  ipcMain.handle(IPC.STORE_DELETE, (_event, key: string) => {
    store.delete(key as any)
  })
}
