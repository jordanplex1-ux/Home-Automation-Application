import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'

export interface AccentPreset {
  name: string
  primary: string
  secondary: string
  glowSm: string
  glowMd: string
  glowLg: string
  borderGlow: string
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    name: 'Cyan',
    primary: '#00d4ff',
    secondary: '#7c3aed',
    glowSm: '0 0 8px rgba(0, 212, 255, 0.15)',
    glowMd: '0 0 16px rgba(0, 212, 255, 0.25)',
    glowLg: '0 0 32px rgba(0, 212, 255, 0.35)',
    borderGlow: 'rgba(0, 212, 255, 0.3)'
  },
  {
    name: 'Violet',
    primary: '#a855f7',
    secondary: '#06b6d4',
    glowSm: '0 0 8px rgba(168, 85, 247, 0.18)',
    glowMd: '0 0 16px rgba(168, 85, 247, 0.28)',
    glowLg: '0 0 32px rgba(168, 85, 247, 0.4)',
    borderGlow: 'rgba(168, 85, 247, 0.35)'
  },
  {
    name: 'Emerald',
    primary: '#10b981',
    secondary: '#06b6d4',
    glowSm: '0 0 8px rgba(16, 185, 129, 0.18)',
    glowMd: '0 0 16px rgba(16, 185, 129, 0.28)',
    glowLg: '0 0 32px rgba(16, 185, 129, 0.4)',
    borderGlow: 'rgba(16, 185, 129, 0.35)'
  },
  {
    name: 'Amber',
    primary: '#f59e0b',
    secondary: '#ef4444',
    glowSm: '0 0 8px rgba(245, 158, 11, 0.18)',
    glowMd: '0 0 16px rgba(245, 158, 11, 0.28)',
    glowLg: '0 0 32px rgba(245, 158, 11, 0.4)',
    borderGlow: 'rgba(245, 158, 11, 0.35)'
  },
  {
    name: 'Rose',
    primary: '#f43f5e',
    secondary: '#a855f7',
    glowSm: '0 0 8px rgba(244, 63, 94, 0.18)',
    glowMd: '0 0 16px rgba(244, 63, 94, 0.28)',
    glowLg: '0 0 32px rgba(244, 63, 94, 0.4)',
    borderGlow: 'rgba(244, 63, 94, 0.35)'
  }
]

interface AppSettingsState {
  accentName: string
  setAccent: (name: string) => void
}

function applyAccent(name: string) {
  const preset = ACCENT_PRESETS.find((p) => p.name === name) || ACCENT_PRESETS[0]
  const root = document.documentElement
  root.style.setProperty('--color-accent-primary', preset.primary)
  root.style.setProperty('--color-accent-secondary', preset.secondary)
  root.style.setProperty('--shadow-glow-sm', preset.glowSm)
  root.style.setProperty('--shadow-glow-md', preset.glowMd)
  root.style.setProperty('--shadow-glow-lg', preset.glowLg)
  root.style.setProperty('--color-border-glow', preset.borderGlow)
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      accentName: 'Cyan',
      setAccent: (name) => {
        applyAccent(name)
        set({ accentName: name })
      }
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => electronStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyAccent(state.accentName)
      }
    }
  )
)
