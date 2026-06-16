import { useMemo, useCallback } from 'react'
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { getWidget } from '../../widgets/registry'
import { WidgetContainer } from './WidgetContainer'
import 'react-grid-layout/css/styles.css'

const ResponsiveGrid = WidthProvider(Responsive)

// Doubled column count and halved row height vs. the original 12/80 grid so
// widgets snap in finer increments (more tile-size customisation). Persisted
// layouts from the old grid are scaled ×2 by the store's migrate() so they
// keep their visual size.
const COLS = { lg: 24, md: 16, sm: 8, xs: 4 }
const ROW_HEIGHT = 40
// Gap between widgets, and (since containerPadding defaults to this) the gap
// from the widgets to the screen edge.
const MARGIN: [number, number] = [6, 6]

export function WidgetGrid() {
  const instances = useWidgetStore((s) => s.instances)
  const isEditing = useWidgetStore((s) => s.isEditing)
  const updateLayouts = useWidgetStore((s) => s.updateLayouts)

  const layouts = useMemo<Layouts>(() => {
    const lg: Layout[] = instances.map((inst) => {
      const def = getWidget(inst.widgetId)
      return {
        i: inst.instanceId,
        x: inst.layout.x,
        y: inst.layout.y,
        w: inst.layout.w,
        h: inst.layout.h,
        minW: def?.defaultLayout.minW ?? 2,
        minH: def?.defaultLayout.minH ?? 2
      }
    })
    return { lg, md: lg, sm: lg, xs: lg }
  }, [instances])

  const onLayoutChange = useCallback(
    (current: Layout[]) => {
      // Only persist deliberate edits. When not editing, width changes from
      // minimising/maximising the window make react-grid-layout reflow
      // transiently; persisting that would permanently shift the layout and it
      // wouldn't return to its original arrangement on restore.
      if (!useWidgetStore.getState().isEditing) return
      updateLayouts(current)
    },
    [updateLayouts]
  )

  if (instances.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 anim-fade">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl border-2 border-dashed border-border-subtle flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center shadow-glow-sm">
              <span className="text-2xl text-accent-primary">+</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-text-primary text-base font-medium">Your dashboard is empty</p>
          <p className="text-text-secondary text-sm mt-1">
            {isEditing ? 'Tap the + button below to add a widget' : 'Tap the edit button below to get started'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveGrid
      className="h-full"
      layouts={layouts}
      cols={COLS}
      rowHeight={ROW_HEIGHT}
      margin={MARGIN}
      isDraggable={isEditing}
      isResizable={isEditing}
      draggableHandle=".drag-handle"
      onLayoutChange={onLayoutChange}
      breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
      compactType="vertical"
      useCSSTransforms={true}
    >
      {instances.map((instance) => (
        <div key={instance.instanceId}>
          <WidgetContainer instance={instance} />
        </div>
      ))}
    </ResponsiveGrid>
  )
}
