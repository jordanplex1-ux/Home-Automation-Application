import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  label: string
}

export function IconButton({ children, label, className = '', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`w-11 h-11 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all duration-200 active:scale-90 touch-manipulation ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
