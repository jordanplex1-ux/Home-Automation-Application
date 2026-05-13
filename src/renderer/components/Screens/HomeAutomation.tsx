import { Cpu, Construction } from 'lucide-react'

export function HomeAutomation() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
        <div className="relative">
          <Cpu size={64} className="text-accent-primary opacity-30" />
          <Construction
            size={28}
            className="absolute -bottom-1 -right-1 text-accent-warning"
          />
        </div>
        <h2 className="text-xl font-light text-text-primary">Home Automation</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Under development. This screen will host smart-home controls, sensor
          readings and quick-tap scenes once the integration lands.
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-disabled mt-2">
          Coming soon
        </p>
      </div>
    </div>
  )
}
