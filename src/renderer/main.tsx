import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

// Register widgets
import './widgets/placeholder'
import './widgets/day-planner'
import './widgets/weather'
import './widgets/bins'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
