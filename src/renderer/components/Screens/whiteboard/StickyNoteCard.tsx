import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useWhiteboardStore, type StickyNote } from '../../../stores/useWhiteboardStore'

interface StickyNoteCardProps {
  note: StickyNote
  boardWidth: number
  boardHeight: number
}

/**
 * Draggable sticky note. Editable text on tap. Drag is initiated from the
 * title strip; once started, the drag-handle element captures pointer events
 * so the note keeps moving even if the pointer briefly outpaces it.
 */
export function StickyNoteCard({ note, boardWidth, boardHeight }: StickyNoteCardProps) {
  const updateNote = useWhiteboardStore((s) => s.updateNote)
  const removeNote = useWhiteboardStore((s) => s.removeNote)

  const [editing, setEditing] = useState(note.text === '')
  const elRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  /**
   * Pointer + offset captured at drag start. Storing in a ref (not state) so
   * pointer-move handlers don't trigger re-renders mid-drag and the closure
   * always sees the live value.
   */
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  // All drag pointer handlers live on the same element (the drag handle), so
  // pointer capture and pointermove/up stay in sync. setPointerCapture only
  // routes events to the element it's called on — splitting handlers across
  // elements is why dragging "froze" when moving fast.
  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!elRef.current || !handleRef.current) return
    e.preventDefault()
    e.stopPropagation()
    handleRef.current.setPointerCapture(e.pointerId)
    const rect = elRef.current.getBoundingClientRect()
    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    }
  }

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (!elRef.current?.parentElement) return
    const parentRect = elRef.current.parentElement.getBoundingClientRect()
    const newLeft = e.clientX - parentRect.left - drag.offsetX
    const newTop = e.clientY - parentRect.top - drag.offsetY
    const maxX = parentRect.width - note.width
    const maxY = parentRect.height - note.height
    const x = Math.max(0, Math.min(maxX, newLeft)) / parentRect.width
    const y = Math.max(0, Math.min(maxY, newTop)) / parentRect.height
    updateNote(note.id, { x, y })
  }

  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return
    try {
      handleRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // Capture may already have been lost — ignore
    }
    dragRef.current = null
  }

  const left = note.x * boardWidth
  const top = note.y * boardHeight

  return (
    <div
      ref={elRef}
      className="absolute select-text shadow-lg"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${note.width}px`,
        height: `${note.height}px`,
        backgroundColor: note.color,
        transform: `rotate(${note.rotation}deg)`,
        transformOrigin: 'center center',
        color: '#1a1a2e',
        borderRadius: '6px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
      }}
    >
      {/* Drag handle bar — title strip on the note. All three pointer
          handlers live here so capture and dispatch stay aligned. */}
      <div
        ref={handleRef}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onLostPointerCapture={onHandlePointerUp}
        className="h-6 cursor-move flex items-center justify-end px-1 touch-none"
        style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
      >
        <button
          onClick={() => removeNote(note.id)}
          aria-label="Delete sticky note"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/15 touch-manipulation"
        >
          <X size={12} />
        </button>
      </div>

      {/* Note body */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={note.text}
          onChange={(e) => updateNote(note.id, { text: e.target.value })}
          onBlur={() => setEditing(false)}
          className="w-full px-2 py-1.5 text-sm resize-none bg-transparent outline-none"
          style={{ height: `${note.height - 24}px`, color: '#1a1a2e' }}
          placeholder="Type something…"
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="px-2 py-1.5 text-sm whitespace-pre-wrap break-words cursor-text overflow-hidden"
          style={{ height: `${note.height - 24}px` }}
        >
          {note.text || <span className="opacity-50 italic">Tap to edit</span>}
        </div>
      )}
    </div>
  )
}
