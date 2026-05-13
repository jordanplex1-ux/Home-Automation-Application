import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'
import { useWidgetStore } from './useWidgetStore'
import type { WidgetInstance } from '../widgets/types'

export interface LayoutPreset {
  id: string
  name: string
  /** Snapshot of widget instances at save time — deep-cloned via JSON. */
  instances: WidgetInstance[]
  savedAt: string
}

interface LayoutPresetsState {
  presets: LayoutPreset[]

  /** Capture the current Family Hub layout under a new preset name. */
  saveCurrent: (name: string) => string
  /** Apply a preset back onto the live widget store. */
  apply: (id: string) => void
  /** Overwrite an existing preset's snapshot with the current layout. */
  overwrite: (id: string) => void
  rename: (id: string, name: string) => void
  remove: (id: string) => void
}

let counter = 0
function newId(): string {
  return `preset_${Date.now()}_${counter++}`
}

function cloneInstances(instances: WidgetInstance[]): WidgetInstance[] {
  // JSON round-trip is fine here — instance shape is plain data, no functions.
  return JSON.parse(JSON.stringify(instances)) as WidgetInstance[]
}

export const useLayoutPresetsStore = create<LayoutPresetsState>()(
  persist(
    (set) => ({
      presets: [],

      saveCurrent: (name) => {
        const id = newId()
        const snapshot = cloneInstances(useWidgetStore.getState().instances)
        set((state) => ({
          presets: [
            ...state.presets,
            { id, name: name.trim() || 'Untitled', instances: snapshot, savedAt: new Date().toISOString() }
          ]
        }))
        return id
      },

      apply: (id) => {
        const preset = useLayoutPresetsStore.getState().presets.find((p) => p.id === id)
        if (!preset) return
        // Reset edit mode and replace instances atomically
        useWidgetStore.setState({
          instances: cloneInstances(preset.instances),
          isEditing: false
        })
      },

      overwrite: (id) => {
        const snapshot = cloneInstances(useWidgetStore.getState().instances)
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id
              ? { ...p, instances: snapshot, savedAt: new Date().toISOString() }
              : p
          )
        }))
      },

      rename: (id, name) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p
          )
        })),

      remove: (id) =>
        set((state) => ({ presets: state.presets.filter((p) => p.id !== id) }))
    }),
    {
      name: 'layout-presets',
      storage: createJSONStorage(() => electronStorage)
    }
  )
)
