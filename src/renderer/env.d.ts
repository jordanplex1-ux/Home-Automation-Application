/// <reference types="vite/client" />

interface BinCollection {
  type: string
  collectionDate: string
}

interface ElectronAPI {
  store: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  bins: {
    fetchBarnsley: (uprn: string, postcode: string) => Promise<BinCollection[]>
  }
  window: {
    toggleFullscreen: () => Promise<void>
  }
  autostart: {
    get: () => Promise<boolean>
    set: (enabled: boolean) => Promise<boolean>
  }
  backup: {
    export: () => Promise<{ ok: boolean; path?: string; cancelled?: boolean }>
    restore: () => Promise<{ ok: boolean; path?: string; cancelled?: boolean }>
    getSchedule: () => Promise<BackupSchedule>
    setSchedule: (patch: Partial<BackupSchedule>) => Promise<BackupSchedule>
    pickFolder: () => Promise<string | null>
  }
  updater: {
    check: () => Promise<{ ok: boolean; version?: string | null; message?: string }>
    installNow: () => Promise<void>
    onStatus: (cb: (status: UpdateStatus) => void) => () => void
  }
}

type UpdateStatus =
  | { kind: 'checking' }
  | { kind: 'available'; version: string }
  | { kind: 'not-available' }
  | { kind: 'downloading'; percent: number }
  | { kind: 'downloaded'; version: string }
  | { kind: 'error'; message: string }

interface BackupSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly'
  folder: string | null
  lastBackupISO: string | null
}

interface Window {
  electronAPI: ElectronAPI
}
