import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'
import { getWidget } from '../widgets/registry'
import type { WidgetInstance } from '../widgets/types'
import type { Layout } from 'react-grid-layout'

interface WidgetState {
  instances: WidgetInstance[]
  isEditing: boolean
  settingsInstanceId: string | null
  addWidget: (widgetId: string) => void
  removeWidget: (instanceId: string) => void
  duplicateWidget: (instanceId: string) => void
  updateConfig: (instanceId: string, patch: Record<string, unknown>) => void
  updateLayouts: (layouts: Layout[]) => void
  setEditing: (editing: boolean) => void
  openSettings: (instanceId: string) => void
  closeSettings: () => void
}

let counter = 0
function generateId(): string {
  return `w_${Date.now()}_${counter++}`
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set) => ({
      instances: [],
      isEditing: false,
      settingsInstanceId: null,

      addWidget: (widgetId: string) => {
        const def = getWidget(widgetId)
        if (!def) return

        const instance: WidgetInstance = {
          instanceId: generateId(),
          widgetId,
          config: { ...def.defaultConfig },
          layout: {
            x: 0,
            y: Infinity,
            w: def.defaultLayout.w,
            h: def.defaultLayout.h
          }
        }

        set((state) => ({
          instances: [...state.instances, instance]
        }))
      },

      removeWidget: (instanceId: string) => {
        set((state) => ({
          instances: state.instances.filter((i) => i.instanceId !== instanceId)
        }))
      },

      duplicateWidget: (instanceId: string) => {
        set((state) => {
          const src = state.instances.find((i) => i.instanceId === instanceId)
          if (!src) return state
          const clone: WidgetInstance = {
            instanceId: generateId(),
            widgetId: src.widgetId,
            // Shallow-clone the config — settings are mostly primitives so
            // mutations don't bleed. Caller can edit independently.
            config: { ...src.config },
            // Drop the clone in at y=Infinity so react-grid-layout slots it
            // at the bottom rather than overlapping the original.
            layout: { x: src.layout.x, y: Infinity, w: src.layout.w, h: src.layout.h }
          }
          return { instances: [...state.instances, clone] }
        })
      },

      updateConfig: (instanceId: string, patch: Record<string, unknown>) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.instanceId === instanceId
              ? { ...i, config: { ...i.config, ...patch } }
              : i
          )
        }))
      },

      updateLayouts: (layouts: Layout[]) => {
        set((state) => ({
          instances: state.instances.map((instance) => {
            const layout = layouts.find((l) => l.i === instance.instanceId)
            if (!layout) return instance
            return {
              ...instance,
              layout: { x: layout.x, y: layout.y, w: layout.w, h: layout.h }
            }
          })
        }))
      },

      setEditing: (editing: boolean) => {
        set({ isEditing: editing })
      },

      openSettings: (instanceId: string) => {
        set({ settingsInstanceId: instanceId })
      },

      closeSettings: () => {
        set({ settingsInstanceId: null })
      }
    }),
    {
      name: 'widget-store',
      storage: createJSONStorage(() => electronStorage),
      partialize: (state) => ({
        instances: state.instances
      }),
      // Drop any persisted instance whose widgetId is no longer registered
      // (e.g. the removed Placeholder widget). Leaves valid widgets untouched.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const valid = state.instances.filter((i) => getWidget(i.widgetId) !== undefined)
        if (valid.length !== state.instances.length) {
          state.instances = valid
        }
      }
    }
  )
)
