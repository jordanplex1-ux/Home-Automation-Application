import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Eraser, StickyNote as StickyIcon, Undo2, Trash2 } from 'lucide-react'
import {
  useWhiteboardStore,
  generateWbId,
  PEN_COLORS,
  STICKY_COLORS,
  type Stroke,
  type StrokePoint
} from '../../stores/useWhiteboardStore'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { StickyNoteCard } from './whiteboard/StickyNoteCard'

type Tool = 'pen' | 'eraser' | 'sticky'

// CSS pixel sizing references used to scale line widths consistently regardless
// of where the user resizes the window.
const REFERENCE_WIDTH = 1920

/**
 * Full-screen drawing surface with draggable sticky notes. Persisted in
 * useWhiteboardStore so anything the family draws or notes stays put across
 * restarts.
 */
export function Whiteboard() {
  const strokes = useWhiteboardStore((s) => s.strokes)
  const notes = useWhiteboardStore((s) => s.notes)
  const addStroke = useWhiteboardStore((s) => s.addStroke)
  const removeStroke = useWhiteboardStore((s) => s.removeStroke)
  const undoLastStroke = useWhiteboardStore((s) => s.undoLastStroke)
  const addNote = useWhiteboardStore((s) => s.addNote)
  const clearEverything = useWhiteboardStore((s) => s.clearEverything)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [tool, setTool] = useState<Tool>('pen')
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penWidth, setPenWidth] = useState(4)
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0])
  const [confirmClear, setConfirmClear] = useState(false)

  // In-progress stroke before commit
  const liveStrokeRef = useRef<Stroke | null>(null)
  const drawingRef = useRef(false)

  // ---------- Canvas sizing ----------
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setDims({ w: rect.width, h: rect.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---------- Draw committed strokes + live stroke ----------
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || dims.w === 0 || dims.h === 0) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== dims.w * dpr || canvas.height !== dims.h * dpr) {
      canvas.width = dims.w * dpr
      canvas.height = dims.h * dpr
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, dims.w, dims.h)

    const widthScale = dims.w / REFERENCE_WIDTH
    const drawStroke = (s: Stroke) => {
      if (s.points.length === 0) return
      ctx.strokeStyle = s.color
      ctx.lineWidth = Math.max(1, s.width * Math.max(widthScale, 0.5))
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      const first = s.points[0]
      ctx.moveTo(first.x * dims.w, first.y * dims.h)
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i]
        ctx.lineTo(p.x * dims.w, p.y * dims.h)
      }
      ctx.stroke()
    }

    for (const s of strokes) drawStroke(s)
    if (liveStrokeRef.current) drawStroke(liveStrokeRef.current)
  }, [strokes, dims])

  useEffect(() => {
    redraw()
  }, [redraw])

  // ---------- Pointer handling ----------
  const pointToNormalized = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
      const rect = canvasRef.current!.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      }
    },
    []
  )

  // Test if a normalized point is "close enough" to a stroke (for eraser).
  const findStrokeAt = useCallback(
    (p: StrokePoint): string | null => {
      const tolerance = 14 / dims.w // ~14px in normalized x-space
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i]
        for (const sp of s.points) {
          const dx = sp.x - p.x
          const dy = sp.y - p.y
          if (Math.hypot(dx, dy) < tolerance) return s.id
        }
      }
      return null
    },
    [strokes, dims.w]
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    const p = pointToNormalized(e)

    if (tool === 'eraser') {
      const hitId = findStrokeAt(p)
      if (hitId) removeStroke(hitId)
      return
    }

    if (tool === 'sticky') {
      addNote({
        x: Math.max(0, Math.min(0.92, p.x - 0.04)),
        y: Math.max(0, Math.min(0.92, p.y - 0.04)),
        width: 160,
        height: 160,
        text: '',
        color: stickyColor,
        rotation: (Math.random() - 0.5) * 6
      })
      setTool('pen')
      return
    }

    // Pen
    drawingRef.current = true
    liveStrokeRef.current = {
      id: generateWbId('stroke'),
      color: penColor,
      width: penWidth,
      points: [p]
    }
    redraw()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool !== 'pen') {
      if (tool === 'eraser' && e.buttons !== 0) {
        // Allow drag-erase: while button held, hit-test each frame
        const hitId = findStrokeAt(pointToNormalized(e))
        if (hitId) removeStroke(hitId)
      }
      return
    }
    const live = liveStrokeRef.current
    if (!live) return
    const p = pointToNormalized(e)
    // Skip near-duplicates to keep point arrays light
    const last = live.points[live.points.length - 1]
    if (last) {
      const dx = p.x - last.x
      const dy = p.y - last.y
      if (Math.hypot(dx, dy) < 0.002) return
    }
    live.points.push(p)
    redraw()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.releasePointerCapture(e.pointerId)
    if (drawingRef.current && liveStrokeRef.current) {
      const live = liveStrokeRef.current
      if (live.points.length > 1) addStroke(live)
    }
    liveStrokeRef.current = null
    drawingRef.current = false
  }

  // ---------- Render ----------
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Canvas + sticky notes layer */}
      <div
        ref={containerRef}
        className="relative flex-1 rounded-2xl bg-bg-secondary/40 border border-border-subtle overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ cursor: tool === 'eraser' ? 'crosshair' : tool === 'sticky' ? 'copy' : 'crosshair' }}
        />
        {notes.map((n) => (
          <StickyNoteCard key={n.id} note={n} boardWidth={dims.w} boardHeight={dims.h} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl bg-bg-secondary/80 border border-border-subtle backdrop-blur-md">
        <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} label="Pen">
          <Pencil size={16} />
        </ToolButton>
        <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser">
          <Eraser size={16} />
        </ToolButton>
        <ToolButton active={tool === 'sticky'} onClick={() => setTool('sticky')} label="Sticky note">
          <StickyIcon size={16} />
        </ToolButton>

        <span className="w-px h-6 bg-border-subtle mx-1" />

        {/* Pen colour swatches (also tints new sticky notes when in sticky mode) */}
        {tool === 'sticky' ? (
          <div className="flex items-center gap-1.5">
            {STICKY_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                active={c === stickyColor}
                onClick={() => setStickyColor(c)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {PEN_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                active={c === penColor}
                onClick={() => setPenColor(c)}
              />
            ))}
          </div>
        )}

        {tool === 'pen' && (
          <>
            <span className="w-px h-6 bg-border-subtle mx-1" />
            <div className="flex items-center gap-2 text-xs text-text-disabled">
              <span>Size</span>
              <input
                type="range"
                min={1}
                max={16}
                value={penWidth}
                onChange={(e) => setPenWidth(parseInt(e.target.value))}
                className="w-24 accent-accent-primary"
              />
              <span className="tabular-nums w-5 text-right">{penWidth}</span>
            </div>
          </>
        )}

        <span className="flex-1" />

        <ToolButton onClick={undoLastStroke} label="Undo" disabled={strokes.length === 0}>
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton onClick={() => setConfirmClear(true)} label="Clear all" danger>
          <Trash2 size={16} />
        </ToolButton>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear the whiteboard?"
        message="This removes every drawing and sticky note. This cannot be undone."
        confirmLabel="Clear all"
        onConfirm={() => {
          clearEverything()
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small inline UI bits
// ---------------------------------------------------------------------------

function ToolButton({
  children,
  onClick,
  label,
  active,
  disabled,
  danger
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
}) {
  const palette = danger
    ? 'text-text-secondary hover:text-accent-danger hover:bg-accent-danger/10'
    : active
    ? 'bg-accent-primary/20 text-accent-primary shadow-glow-sm'
    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all touch-manipulation active:scale-95 disabled:opacity-30 disabled:active:scale-100 ${palette}`}
    >
      {children}
    </button>
  )
}

function ColorSwatch({
  color,
  active,
  onClick
}: {
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-6 h-6 rounded-full transition-all touch-manipulation ${
        active ? 'ring-2 ring-offset-2 ring-offset-bg-secondary ring-white/40 scale-110' : ''
      }`}
      style={{ backgroundColor: color }}
      aria-label={`Colour ${color}`}
    />
  )
}
