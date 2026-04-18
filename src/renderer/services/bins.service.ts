export interface BinCollection {
  type: string
  collectionDate: string // ISO yyyy-mm-dd
}

// Mock data for browser preview (no IPC available)
function mockBins(): BinCollection[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const addDays = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  return [
    { type: 'Grey bin (MOCK)', collectionDate: addDays(1) },
    { type: 'Green bin (MOCK)', collectionDate: addDays(8) },
    { type: 'Brown bin (MOCK)', collectionDate: addDays(15) }
  ]
}

export async function fetchBarnsleyBins(
  uprn: string,
  postcode: string
): Promise<BinCollection[]> {
  // Check at call time, not module load time, so HMR/late injection still works
  const api = typeof window !== 'undefined' ? window.electronAPI?.bins : undefined
  if (!api?.fetchBarnsley) {
    // Browser preview fallback so the UI is testable without Electron
    await new Promise((r) => setTimeout(r, 300))
    if (!uprn || !postcode) throw new Error('Missing UPRN or postcode')
    return mockBins()
  }
  return await api.fetchBarnsley(uprn, postcode)
}
