import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import Store from 'electron-store'
import { IPC } from '../shared/ipc-channels'

// Same store as store.ts — electron-store is keyed by `name` so this
// instance opens the same underlying file.
const store = new Store({ name: 'home-planner-data' })

// Separate tiny store for backup schedule metadata
const metaStore = new Store<{
  schedule: {
    enabled: boolean
    frequency: 'daily' | 'weekly'
    folder: string | null
    lastBackupISO: string | null
  }
}>({
  name: 'home-planner-backup-meta',
  defaults: {
    schedule: {
      enabled: false,
      frequency: 'weekly',
      folder: null,
      lastBackupISO: null
    }
  }
})

export interface BackupPayload {
  version: string
  createdAt: string
  data: Record<string, unknown>
}

function buildBackup(): BackupPayload {
  return {
    version: app.getVersion(),
    createdAt: new Date().toISOString(),
    // electron-store exposes .store as the full JSON object
    data: (store as unknown as { store: Record<string, unknown> }).store
  }
}

async function writeBackupToFolder(folder: string): Promise<string> {
  await fs.mkdir(folder, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = join(folder, `home-planner-backup-${stamp}.json`)
  const payload = buildBackup()
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return filePath
}

function applyBackup(payload: BackupPayload): void {
  if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
    throw new Error('Invalid backup file')
  }
  // Clear current keys then apply
  const current = (store as unknown as { store: Record<string, unknown> }).store
  for (const key of Object.keys(current)) {
    ;(store as unknown as { delete: (k: string) => void }).delete(key)
  }
  for (const [key, value] of Object.entries(payload.data)) {
    ;(store as unknown as { set: (k: string, v: unknown) => void }).set(key, value)
  }
}

function getWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

async function runScheduledCheck(): Promise<void> {
  const schedule = metaStore.get('schedule')
  if (!schedule.enabled || !schedule.folder) return

  const intervalMs = schedule.frequency === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  const last = schedule.lastBackupISO ? Date.parse(schedule.lastBackupISO) : 0
  if (Date.now() - last < intervalMs) return

  try {
    const filePath = await writeBackupToFolder(schedule.folder)
    metaStore.set('schedule', { ...schedule, lastBackupISO: new Date().toISOString() })
    console.log(`[backup] Scheduled backup written to ${filePath}`)
  } catch (err) {
    console.error('[backup] Scheduled backup failed:', err)
  }
}

let scheduleTimer: NodeJS.Timeout | null = null

export function setupBackupIPC(): void {
  // Manual export — prompts with save dialog
  ipcMain.handle(IPC.BACKUP_EXPORT, async () => {
    const win = getWindow()
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const result = win
      ? await dialog.showSaveDialog(win, {
          title: 'Export backup',
          defaultPath: `home-planner-backup-${stamp}.json`,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
      : await dialog.showSaveDialog({
          title: 'Export backup',
          defaultPath: `home-planner-backup-${stamp}.json`,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
    if (result.canceled || !result.filePath) return { ok: false, cancelled: true }
    const payload = buildBackup()
    await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return { ok: true, path: result.filePath }
  })

  // Restore — prompts to pick a file
  ipcMain.handle(IPC.BACKUP_RESTORE, async () => {
    const win = getWindow()
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: 'Restore backup',
          properties: ['openFile'],
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
      : await dialog.showOpenDialog({
          title: 'Restore backup',
          properties: ['openFile'],
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
    if (result.canceled || result.filePaths.length === 0) return { ok: false, cancelled: true }
    const raw = await fs.readFile(result.filePaths[0], 'utf-8')
    const payload = JSON.parse(raw) as BackupPayload
    applyBackup(payload)
    return { ok: true, path: result.filePaths[0] }
  })

  // Get schedule settings
  ipcMain.handle(IPC.BACKUP_SCHEDULE_GET, () => metaStore.get('schedule'))

  // Set schedule settings
  ipcMain.handle(IPC.BACKUP_SCHEDULE_SET, (_e, patch: Partial<ReturnType<typeof metaStore.get>>) => {
    const current = metaStore.get('schedule')
    const next = { ...current, ...patch }
    metaStore.set('schedule', next)
    return next
  })

  // Pick a folder for scheduled backups
  ipcMain.handle(IPC.BACKUP_PICK_FOLDER, async () => {
    const win = getWindow()
    const result = win
      ? await dialog.showOpenDialog(win, { title: 'Choose backup folder', properties: ['openDirectory', 'createDirectory'] })
      : await dialog.showOpenDialog({ title: 'Choose backup folder', properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Run a due-scheduled check immediately, then every hour while the app is open.
  runScheduledCheck().catch(() => {})
  if (scheduleTimer) clearInterval(scheduleTimer)
  scheduleTimer = setInterval(() => runScheduledCheck().catch(() => {}), 60 * 60 * 1000)
}
