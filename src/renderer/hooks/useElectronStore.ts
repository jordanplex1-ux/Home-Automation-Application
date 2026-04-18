import type { StateStorage } from 'zustand/middleware'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export const electronStorage: StateStorage = isElectron
  ? {
      getItem: async (name: string) => {
        const val = await window.electronAPI.store.get(name)
        return val != null ? JSON.stringify(val) : null
      },
      setItem: async (name: string, value: string) => {
        await window.electronAPI.store.set(name, JSON.parse(value))
      },
      removeItem: async (name: string) => {
        await window.electronAPI.store.delete(name)
      }
    }
  : {
      // Synchronous localStorage for browser preview — avoids
      // React 19 useSyncExternalStore hydration race
      getItem: (name: string) => {
        return localStorage.getItem(name)
      },
      setItem: (name: string, value: string) => {
        localStorage.setItem(name, value)
      },
      removeItem: (name: string) => {
        localStorage.removeItem(name)
      }
    }
