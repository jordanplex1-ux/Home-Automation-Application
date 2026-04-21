import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: number   // epoch ms
  completedAt?: number // epoch ms — set when checked, cleared when unchecked
}

interface TodoState {
  // Todos are per-widget-instance so multiple todo widgets can coexist
  itemsByInstance: Record<string, TodoItem[]>
  addItem: (instanceId: string, text: string) => void
  toggleItem: (instanceId: string, id: string) => void
  removeItem: (instanceId: string, id: string) => void
  clearCompleted: (instanceId: string) => void
  /** Remove completed items whose completedAt is older than `ttlMs`. No-op if ttlMs <= 0. */
  pruneExpired: (instanceId: string, ttlMs: number) => void
}

let counter = 0
function generateId(): string {
  return `todo_${Date.now()}_${counter++}`
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      itemsByInstance: {},

      addItem: (instanceId, text) => {
        const trimmed = text.trim()
        if (!trimmed) return
        set((state) => {
          const existing = state.itemsByInstance[instanceId] ?? []
          const item: TodoItem = {
            id: generateId(),
            text: trimmed,
            completed: false,
            createdAt: Date.now()
          }
          return {
            itemsByInstance: {
              ...state.itemsByInstance,
              [instanceId]: [...existing, item]
            }
          }
        })
      },

      toggleItem: (instanceId, id) => {
        set((state) => {
          const existing = state.itemsByInstance[instanceId]
          if (!existing) return state
          const updated = existing.map((i) =>
            i.id === id
              ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : undefined }
              : i
          )
          return {
            itemsByInstance: { ...state.itemsByInstance, [instanceId]: updated }
          }
        })
      },

      removeItem: (instanceId, id) => {
        set((state) => {
          const existing = state.itemsByInstance[instanceId]
          if (!existing) return state
          return {
            itemsByInstance: {
              ...state.itemsByInstance,
              [instanceId]: existing.filter((i) => i.id !== id)
            }
          }
        })
      },

      clearCompleted: (instanceId) => {
        set((state) => {
          const existing = state.itemsByInstance[instanceId]
          if (!existing) return state
          return {
            itemsByInstance: {
              ...state.itemsByInstance,
              [instanceId]: existing.filter((i) => !i.completed)
            }
          }
        })
      },

      pruneExpired: (instanceId, ttlMs) => {
        if (!ttlMs || ttlMs <= 0) return
        const cutoff = Date.now() - ttlMs
        set((state) => {
          const existing = state.itemsByInstance[instanceId]
          if (!existing) return state
          const kept = existing.filter(
            (i) => !i.completed || !i.completedAt || i.completedAt > cutoff
          )
          if (kept.length === existing.length) return state
          return {
            itemsByInstance: { ...state.itemsByInstance, [instanceId]: kept }
          }
        })
      }
    }),
    {
      name: 'home-planner-todos',
      storage: createJSONStorage(() => electronStorage)
    }
  )
)
