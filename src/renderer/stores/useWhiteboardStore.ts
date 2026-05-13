import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'

// All coordinates are normalized to 0..1 so the board survives resolution
// changes — the canvas multiplies them by its current display size at render
// time.
export interface StrokePoint {
  x: number
  y: number
}

export interface Stroke {
  id: string
  color: string
  width: number    // line width in CSS pixels (at standard 1920×1080 reference)
  points: StrokePoint[]
}

export interface StickyNote {
  id: string
  x: number        // 0..1, position of top-left
  y: number        // 0..1
  width: number    // CSS pixels
  height: number   // CSS pixels
  text: string
  color: string
  rotation: number // degrees, slight tilt for paper feel
}

interface WhiteboardState {
  strokes: Stroke[]
  notes: StickyNote[]

  addStroke: (stroke: Stroke) => void
  removeStroke: (id: string) => void
  undoLastStroke: () => void
  clearStrokes: () => void

  addNote: (note: Omit<StickyNote, 'id'>) => string
  updateNote: (id: string, patch: Partial<StickyNote>) => void
  removeNote: (id: string) => void

  clearEverything: () => void
}

let counter = 0
export function generateWbId(prefix: string): string {
  return `${prefix}_${Date.now()}_${counter++}`
}

export const STICKY_COLORS = [
  '#fde047', // yellow
  '#fca5a5', // red/pink
  '#86efac', // green
  '#93c5fd', // blue
  '#c4b5fd', // violet
  '#f9a8d4'  // pink
]

export const PEN_COLORS = [
  '#ffffff', // white (default on dark bg)
  '#00d4ff', // cyan
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899'  // pink
]

export const useWhiteboardStore = create<WhiteboardState>()(
  persist(
    (set) => ({
      strokes: [],
      notes: [],

      addStroke: (stroke) =>
        set((s) => ({ strokes: [...s.strokes, stroke] })),

      removeStroke: (id) =>
        set((s) => ({ strokes: s.strokes.filter((x) => x.id !== id) })),

      undoLastStroke: () =>
        set((s) => ({ strokes: s.strokes.slice(0, -1) })),

      clearStrokes: () => set({ strokes: [] }),

      addNote: (note) => {
        const id = generateWbId('note')
        set((s) => ({ notes: [...s.notes, { ...note, id }] }))
        return id
      },

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n))
        })),

      removeNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      clearEverything: () => set({ strokes: [], notes: [] })
    }),
    {
      name: 'whiteboard-store',
      storage: createJSONStorage(() => electronStorage)
    }
  )
)
