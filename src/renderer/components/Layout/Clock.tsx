import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export function Clock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center gap-1">
      <time className="text-6xl font-extralight tracking-widest text-text-primary tabular-nums">
        {format(now, 'HH:mm')}
      </time>
      <span className="text-lg font-light text-text-secondary tracking-wide">
        {format(now, 'EEEE, d MMMM yyyy')}
      </span>
    </div>
  )
}
