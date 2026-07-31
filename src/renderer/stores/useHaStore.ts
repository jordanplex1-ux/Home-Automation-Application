import { create } from 'zustand'

/**
 * Live Home Assistant state. Runtime-only — nothing is persisted here; the
 * main process owns the connection and the durable config, and pushes updates
 * over IPC.
 */

const DISCONNECTED: HaStatus = {
  configured: false,
  state: 'disconnected',
  error: null,
  haVersion: null,
  entityCount: 0,
  selectedCount: 0
}

interface HaState {
  status: HaStatus
  /** Selected entities, keyed by entity_id. */
  entities: Record<string, HaEntity>
  setStatus: (status: HaStatus) => void
  setEntities: (list: HaEntity[]) => void
  upsertEntity: (entity: HaEntity) => void
  reset: () => void
}

export const useHaStore = create<HaState>((set) => ({
  status: DISCONNECTED,
  entities: {},

  setStatus: (status) => set({ status }),

  setEntities: (list) =>
    set({
      entities: Object.fromEntries(list.map((e) => [e.entity_id, e]))
    }),

  upsertEntity: (entity) =>
    set((s) => ({ entities: { ...s.entities, [entity.entity_id]: entity } })),

  reset: () => set({ status: DISCONNECTED, entities: {} })
}))

/**
 * Sort an entity map into a display list.
 *
 * Deliberately NOT a zustand selector: it allocates a new array every call, and
 * zustand v5 uses useSyncExternalStore, which would see a new snapshot on every
 * render and re-render forever. Call it inside a `useMemo` keyed on the map.
 */
export function sortEntities(entities: Record<string, HaEntity>): HaEntity[] {
  return Object.values(entities).sort((a, b) => {
    const an = (a.attributes.friendly_name as string) ?? a.entity_id
    const bn = (b.attributes.friendly_name as string) ?? b.entity_id
    return an.localeCompare(bn)
  })
}

export function entityName(entity: HaEntity): string {
  return (entity.attributes.friendly_name as string) ?? entity.entity_id
}

export function entityDomain(entity: HaEntity): string {
  return entity.entity_id.split('.')[0]
}
