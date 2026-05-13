import { app, BrowserWindow, ipcMain } from 'electron'
import pkg from 'electron-updater'
import { IPC } from '../shared/ipc-channels'
import { writeBackupToFolder, getPreferredBackupFolder } from './backup'

const { autoUpdater } = pkg

// Tune autoUpdater for a kiosk context:
// - download automatically (no user decision needed on a wall-mounted device)
// - install on quit only (never interrupt foreground use)
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.logger = {
  info: (...a: unknown[]) => console.log('[updater]', ...a),
  warn: (...a: unknown[]) => console.warn('[updater]', ...a),
  error: (...a: unknown[]) => console.error('[updater]', ...a),
  debug: (...a: unknown[]) => console.debug('[updater]', ...a)
} as unknown as typeof autoUpdater.logger

export type UpdateStatus =
  | { kind: 'checking' }
  | { kind: 'available'; version: string }
  | { kind: 'not-available' }
  | { kind: 'downloading'; percent: number }
  | { kind: 'downloaded'; version: string }
  | { kind: 'error'; message: string }

function broadcast(status: UpdateStatus): void {
  for (const win of BrowserWindows()) {
    win.webContents.send(IPC.UPDATER_STATUS, status)
  }
}
function BrowserWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows()
}

export function setupUpdater(): void {
  autoUpdater.on('checking-for-update', () => broadcast({ kind: 'checking' }))
  autoUpdater.on('update-available', (info) => broadcast({ kind: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => broadcast({ kind: 'not-available' }))
  autoUpdater.on('download-progress', (p) => broadcast({ kind: 'downloading', percent: p.percent }))
  autoUpdater.on('update-downloaded', async (info) => {
    // Before announcing the update is ready, snapshot the current data to
    // the configured backup folder. If the new version mangles anything we
    // can roll back via the App Settings → Restore flow.
    try {
      const folder = getPreferredBackupFolder()
      const path = await writeBackupToFolder(folder)
      console.log(`[updater] Pre-update backup written to ${path}`)
    } catch (err) {
      console.warn('[updater] Pre-update backup failed:', (err as Error).message)
    }
    broadcast({ kind: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', (err) => broadcast({ kind: 'error', message: err?.message || String(err) }))

  ipcMain.handle(IPC.UPDATER_CHECK, async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, version: result?.updateInfo?.version ?? null }
    } catch (err) {
      return { ok: false, message: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.UPDATER_INSTALL_NOW, () => {
    // Quit & install immediately. Second arg = isSilent, third = isForceRunAfter.
    autoUpdater.quitAndInstall(false, true)
  })

  // Kick off a check shortly after startup. Skip when running from a
  // dev server — autoUpdater throws "dev app-update.yml not found" otherwise.
  if (!app.isPackaged) {
    console.log('[updater] Skipping update check in dev mode')
    return
  }
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[updater] Initial check failed:', err?.message || err)
    })
  }, 5000)

  // Re-check every 6 hours while the app is running (kiosks stay up for days).
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 6 * 60 * 60 * 1000)
}
