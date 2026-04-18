export const theme = {
  colors: {
    bg: {
      primary: '#0a0a0f',
      secondary: '#12121a',
      tertiary: '#1a1a2e',
      hover: '#22223a'
    },
    accent: {
      primary: '#00d4ff',
      secondary: '#7c3aed',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#8b8fa3',
      disabled: '#4a4a5a'
    },
    border: {
      subtle: '#1e1e2e',
      glow: 'rgba(0, 212, 255, 0.3)'
    }
  },
  glow: {
    sm: '0 0 8px rgba(0, 212, 255, 0.15)',
    md: '0 0 16px rgba(0, 212, 255, 0.25)',
    lg: '0 0 32px rgba(0, 212, 255, 0.35)'
  }
} as const
