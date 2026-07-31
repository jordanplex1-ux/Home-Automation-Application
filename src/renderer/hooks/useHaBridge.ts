import { useEffect } from 'react'
import { useHaStore } from '../stores/useHaStore'

/**
 * Wires the renderer's Home Assistant store to the main process. Mount once,
 * high in the tree — it pulls the initial status/state snapshot and then keeps
 * the store in sync from the main process's WebSocket connection.
 */
export function useHaBridge(): void {
  const setStatus = useHaStore((s) => s.setStatus)
  const setEntities = useHaStore((s) => s.setEntities)
  const upsertEntity = useHaStore((s) => s.upsertEntity)

  useEffect(() => {
    const api = window.electronAPI?.homeAssistant
    if (!api) return

    // Initial snapshot — covers the case where the connection was already
    // established before this component mounted.
    api.status().then(setStatus).catch(() => {})
    api.getStates().then(setEntities).catch(() => {})

    const offStatus = api.onStatus((status) => {
      setStatus(status)
      // On a fresh connection, re-pull the selected entities.
      if (status.state === 'connected') {
        api.getStates().then(setEntities).catch(() => {})
      }
    })
    const offStates = api.onStates(setEntities)
    const offChanged = api.onStateChanged(upsertEntity)

    return () => {
      offStatus?.()
      offStates?.()
      offChanged?.()
    }
  }, [setStatus, setEntities, upsertEntity])
}
