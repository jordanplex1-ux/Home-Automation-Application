import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'

export function setupWindowIPC(): void {
  ipcMain.handle(IPC.WINDOW_TOGGLE_FULLSCREEN, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.setFullScreen(!win.isFullScreen())
  })
}
