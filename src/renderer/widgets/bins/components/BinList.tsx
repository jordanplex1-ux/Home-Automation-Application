import type { BinCollection } from '../../../services/bins.service'

interface BinListProps {
  bins: BinCollection[]
}

const BIN_COLOURS: Record<string, string> = {
  grey: 'bg-zinc-500',
  black: 'bg-zinc-800',
  green: 'bg-emerald-600',
  brown: 'bg-amber-800',
  blue: 'bg-blue-600',
  recycling: 'bg-emerald-600',
  garden: 'bg-amber-800',
  general: 'bg-zinc-500'
}

function colourFor(type: string): string {
  const lc = type.toLowerCase()
  for (const key in BIN_COLOURS) {
    if (lc.includes(key)) return BIN_COLOURS[key]
  }
  return 'bg-zinc-500'
}

function formatDate(iso: string): { label: string; relative: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(iso + 'T00:00:00')
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000)

  let relative = ''
  if (diffDays === 0) relative = 'Today'
  else if (diffDays === 1) relative = 'Tomorrow'
  else if (diffDays > 0 && diffDays < 7) relative = `In ${diffDays} days`
  else relative = ''

  const label = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })

  return { label, relative }
}

export function BinList({ bins }: BinListProps) {
  return (
    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {bins.map((bin, i) => {
        const { label, relative } = formatDate(bin.collectionDate)
        const isUrgent = relative === 'Today' || relative === 'Tomorrow'
        return (
          <div
            key={`${bin.type}-${bin.collectionDate}-${i}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-bg-tertiary/40 ${
              isUrgent ? 'ring-1 ring-accent-primary/40' : ''
            }`}
          >
            <div className={`w-2.5 h-8 rounded-full shrink-0 ${colourFor(bin.type)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate capitalize">
                {bin.type}
              </p>
              <p className="text-[10px] text-text-secondary">{label}</p>
            </div>
            {relative && (
              <span
                className={`text-xs font-medium tabular-nums shrink-0 ${
                  isUrgent ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                {relative}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
