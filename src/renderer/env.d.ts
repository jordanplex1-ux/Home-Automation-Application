/// <reference types="vite/client" />

declare const __APP_VERSION__: string

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
  photos: {
    pickFolder: () => Promise<string | null>
    list: (folder: string) => Promise<string[]>
    read: (path: string) => Promise<string | null>
  }
  news: {
    fetch: (sourceIds: string[]) => Promise<NewsHeadline[]>
    sources: () => Promise<NewsSource[]>
  }
  google: {
    isConfigured: () => Promise<boolean>
    listAccounts: () => Promise<GoogleAccount[]>
    beginAuth: () => Promise<{ ok: true; account: GoogleAccount } | { ok: false; message: string }>
    disconnect: (email: string) => Promise<{ ok: true }>
    listCalendars: (
      email: string
    ) => Promise<{ ok: true; calendars: GoogleCalendarSummary[] } | { ok: false; message: string }>
    fetchEvents: (
      requests: { email: string; calendarId: string }[],
      timeMinISO: string,
      timeMaxISO: string
    ) => Promise<GoogleCalendarEvent[]>
  }
  ring: {
    status: () => Promise<RingStatus>
    loginStart: (
      email: string,
      password: string
    ) => Promise<
      | { ok: true; needs2fa: false }
      | { ok: true; needs2fa: true; prompt: string }
      | { ok: false; message: string }
    >
    login2fa: (code: string) => Promise<{ ok: true } | { ok: false; message: string }>
    logout: () => Promise<{ ok: true }>
    listCameras: () => Promise<
      { ok: true; cameras: RingCameraInfo[] } | { ok: false; message: string; cameras: [] }
    >
    snapshot: (
      cameraId: number
    ) => Promise<{ ok: true; dataUrl: string } | { ok: false; message: string }>
    onEvent: (cb: (event: RingEvent) => void) => () => void
    onStatus: (cb: (status: RingStatus) => void) => () => void
  }
  homeAssistant: {
    status: () => Promise<HaStatus>
    getConfig: () => Promise<HaConfig>
    setConfig: (patch: {
      url?: string
      token?: string
      entityIds?: string[]
    }) => Promise<{ ok: true }>
    testConnection: (
      url: string,
      token?: string
    ) => Promise<{ ok: boolean; message?: string; haVersion?: string }>
    disconnect: () => Promise<{ ok: true }>
    getStates: () => Promise<HaEntity[]>
    listEntities: () => Promise<HaEntitySummary[]>
    callService: (
      domain: string,
      service: string,
      entityId?: string,
      data?: Record<string, unknown>
    ) => Promise<{ ok: true } | { ok: false; message: string }>
    onStatus: (cb: (status: HaStatus) => void) => () => void
    onStates: (cb: (states: HaEntity[]) => void) => () => void
    onStateChanged: (cb: (state: HaEntity) => void) => () => void
  }
}

interface HaStatus {
  configured: boolean
  state: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
  haVersion: string | null
  entityCount: number
  selectedCount: number
}

interface HaConfig {
  url: string | null
  hasToken: boolean
  entityIds: string[]
}

interface HaEntity {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed?: string
  last_updated?: string
}

interface HaEntitySummary {
  entity_id: string
  name: string
  domain: string
  state: string
  unit: string | null
  deviceClass: string | null
}

interface RingCameraInfo {
  id: number
  name: string
}

interface RingStatus {
  configured: boolean
  connected: boolean
  error: string | null
  cameras: RingCameraInfo[]
}

interface RingEvent {
  kind: 'ding' | 'motion'
  cameraId: number
  cameraName: string
  at: number
}

interface GoogleAccount {
  email: string
  name: string
  addedAt: string
}
interface GoogleCalendarSummary {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
}
interface GoogleCalendarEvent {
  id: string
  calendarId: string
  accountEmail: string
  title: string
  date: string
  endDate?: string
  startTime: string
  endTime: string
  allDay: boolean
  location?: string
  notes?: string
  color?: string
}

interface NewsHeadline {
  title: string
  source: string
  link: string
  pubDate: number
}

interface NewsSource {
  id: string
  label: string
  url: string
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
