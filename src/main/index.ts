import { app, BrowserWindow, powerSaveBlocker } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { setupStoreIPC } from './store'
import { setupBinsIPC } from './bins'
import { setupWindowIPC } from './window'
import { setupAutostartIPC } from './autostart'
import { setupBackupIPC } from './backup'
import { setupUpdater } from './updater'
import { setupPhotosIPC } from './photos'
import { setupNewsIPC } from './news'
import { setupGoogleCalendarIPC } from './google-calendar'
import { setupRingIPC } from './ring'

let mainWindow: BrowserWindow | null = null

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow(): void {
  // Window/taskbar icon. In a packaged build the taskbar uses the .exe icon
  // (set by electron-builder from build/icon.ico); this mainly covers dev mode.
  // Falls back to the default icon if the file isn't present.
  const devIcon = join(__dirname, '../../build/icon.png')
  const icon = existsSync(devIcon) ? devIcon : undefined

  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    ...(icon ? { icon } : {}),
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
  setupGoogleCalendarIPC()
  setupRingIPC()
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
