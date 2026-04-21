import { app, BrowserWindow, powerSaveBlocker } from 'electron'
import { join } from 'path'
import { setupStoreIPC } from './store'
import { setupBinsIPC } from './bins'
import { setupWindowIPC } from './window'
import { setupAutostartIPC } from './autostart'
import { setupBackupIPC } from './backup'
import { setupUpdater } from './updater'
import { setupPhotosIPC } from './photos'
import { setupNewsIPC } from './news'

let mainWindow: BrowserWindow | null = null

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Prevent display sleep for always-on kiosk use
  powerSaveBlocker.start('prevent-display-sleep')

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  setupStoreIPC()
  setupBinsIPC()
  setupWindowIPC()
  setupAutostartIPC()
  setupBackupIPC()
  setupUpdater()
  setupPhotosIPC()
  setupNewsIPC()
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
