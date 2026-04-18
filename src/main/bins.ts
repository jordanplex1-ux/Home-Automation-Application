import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { fetchBarnsleyBins } from './scrapers/barnsley'

export function setupBinsIPC(): void {
  ipcMain.handle(
    IPC.BINS_FETCH_BARNSLEY,
    async (_event, uprn: string, postcode: string) => {
      try {
        console.log(`[bins] Fetching for UPRN=${uprn} postcode=${postcode}`)
        const result = await fetchBarnsleyBins(uprn, postcode)
        console.log(`[bins] Got ${result.length} collections`)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const stack = err instanceof Error ? err.stack : undefined
        console.error('[bins] Scraper failed:', message)
        if (stack) console.error(stack)
        throw new Error(`Bins scraper: ${message}`)
      }
    }
  )
}
