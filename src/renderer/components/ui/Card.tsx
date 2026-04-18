import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glow?: boolean
}

export function Card({ children, glow = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-bg-secondary/80 backdrop-blur-md border border-border-subtle rounded-2xl ${glow ? 'shadow-glow-sm' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
