import { dialog, ipcMain, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { extname, join } from 'path'
import { IPC } from '../shared/ipc-channels'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
}

function getWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

async function listImages(folder: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(folder, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && IMAGE_EXTS.has(extname(e.name).toLowerCase()))
      .map((e) => join(folder, e.name))
      .sort()
  } catch {
    return []
  }
}

async function readAsDataUrl(path: string): Promise<string | null> {
  try {
    const ext = extname(path).toLowerCase()
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream'
    const buf = await fs.readFile(path)
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export function setupPhotosIPC(): void {
  ipcMain.handle(IPC.PHOTOS_PICK_FOLDER, async () => {
    const win = getWindow()
    const opts = {
      title: 'Choose photo folder',
      properties: ['openDirectory'] as ('openDirectory')[]
    }
    const result = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.PHOTOS_LIST, async (_e, folder: string) => {
    if (!folder) return []
    return listImages(folder)
  })

  ipcMain.handle(IPC.PHOTOS_READ, async (_e, path: string) => {
    if (!path) return null
    return readAsDataUrl(path)
  })
}
