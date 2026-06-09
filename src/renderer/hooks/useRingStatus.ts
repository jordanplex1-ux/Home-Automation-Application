import { useEffect, useState } from 'react'

const EMPTY_STATUS: RingStatus = {
  configured: false,
  connected: false,
  error: null,
  cameras: []
}

/**
 * Subscribes to Ring connection status. Fetches once on mount and then stays
 * live via the main-process RING_STATUS broadcasts (login, logout, reconnect).
 */
export function useRingStatus(): { status: RingStatus; available: boolean; refresh: () => void } {
  const available = !!window.electronAPI?.ring
  const [status, setStatus] = useState<RingStatus>(EMPTY_STATUS)

  const refresh = () => {
    window.electronAPI?.ring?.status().then(setStatus).catch(() => setStatus(EMPTY_STATUS))
  }

  useEffect(() => {
    if (!available) return
    refresh()
    const off = window.electronAPI.ring.onStatus((s) => setStatus(s))
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available])

  return { status, available, refresh }
}
