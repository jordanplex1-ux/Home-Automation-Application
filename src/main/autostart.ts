import { app, ipcMain } from 'electron'
import { IPC } from '../shared/ipc-channels'

export function setupAutostartIPC(): void {
  ipcMain.handle(IPC.AUTOSTART_GET, () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle(IPC.AUTOSTART_SET, (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      // Launch hidden so it boots into kiosk without flashing
      openAsHidden: false,
      args: ['--autostart']
    })
    return app.getLoginItemSettings().openAtLogin
  })
}
