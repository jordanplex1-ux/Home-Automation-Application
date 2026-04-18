import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { fetchBarnsleyBins } from '../../services/bins.service'
import { Spinner } from '../../components/ui/Spinner'
import { BinList } from './components/BinList'
import type { WidgetProps } from '../types'

const BINS_UPRN = '100050624141'
const BINS_POSTCODE = 'S71 2ED'

export function BinCollectionWidget({ instanceId: _instanceId, config: _config }: WidgetProps) {
  const query = useQuery({
    queryKey: ['bins-barnsley', BINS_UPRN, BINS_POSTCODE],
    queryFn: () => fetchBarnsleyBins(BINS_UPRN, BINS_POSTCODE),
    refetchInterval: 6 * 60 * 60 * 1000, // 6h
    staleTime: 60 * 60 * 1000 // 1h
  })

  if (query.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
        <AlertCircle size={28} className="text-accent-danger" />
        <p className="text-xs text-text-secondary">Failed to load bin data</p>
        <p className="text-[10px] text-text-disabled max-w-[220px] truncate">
          {(query.error as Error)?.message}
        </p>
        <button
          onClick={() => query.refetch()}
          className="px-3 py-1.5 rounded-lg text-xs text-accent-primary hover:bg-accent-primary/10 transition-colors touch-manipulation"
        >
          Retry
        </button>
      </div>
    )
  }

  const bins = query.data ?? []

  if (bins.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-text-secondary">No upcoming collections</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[10px] text-text-disabled uppercase tracking-wider">Next Collections</p>
        {query.isRefetching && <Spinner size="sm" />}
      </div>
      <BinList bins={bins} />
    </div>
  )
}
