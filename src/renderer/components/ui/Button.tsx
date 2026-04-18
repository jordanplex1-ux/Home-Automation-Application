import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  children: ReactNode
}

const variants = {
  primary:
    'bg-accent-primary/20 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/30 shadow-glow-sm',
  ghost:
    'bg-transparent text-text-secondary border-transparent hover:bg-bg-hover hover:text-text-primary',
  danger:
    'bg-accent-danger/20 text-accent-danger border-accent-danger/30 hover:bg-accent-danger/30'
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2.5 rounded-xl border font-medium text-sm transition-all duration-200 active:scale-95 touch-manipulation ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
