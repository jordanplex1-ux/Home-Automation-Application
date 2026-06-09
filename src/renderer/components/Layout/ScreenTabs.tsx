import { Home, Pencil, Cpu } from 'lucide-react'
import { useAppSettingsStore, type ActiveScreen } from '../../stores/useAppSettingsStore'

interface TabDef {
  id: ActiveScreen
  label: string
  icon: typeof Home
}

const TABS: TabDef[] = [
  { id: 'family',          label: 'Family Hub',     icon: Home },
  { id: 'whiteboard',      label: 'Whiteboard',     icon: Pencil },
  { id: 'home-automation', label: 'Home Automation', icon: Cpu }
]

/**
 * Top-level navigation between major screens. Lives in the top-left of the
 * header. Selection is persisted via useAppSettingsStore so a reboot returns
 * to the last-used view.
 */
export function ScreenTabs() {
  const active = useAppSettingsStore((s) => s.activeScreen)
  const setActive = useAppSettingsStore((s) => s.setActiveScreen)

  return (
    <div className="flex items-center gap-2 p-1 rounded-2xl bg-bg-secondary/60 border border-border-subtle">
      {TABS.map((t, i) => {
        const Icon = t.icon
        const isActive = t.id === active
        return (
          <div key={t.id} className="flex items-center gap-2">
            {i > 0 && <span className="w-px h-5 bg-border-subtle/80" aria-hidden />}
            <button
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all touch-manipulation ${
                isActive
                  ? 'bg-accent-primary/20 text-accent-primary shadow-glow-sm'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
