interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'w-3 h-3 border',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-2'
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${SIZES[size]} border-accent-primary/30 border-t-accent-primary rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
