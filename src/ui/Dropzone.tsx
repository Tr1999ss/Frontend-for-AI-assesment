import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { UploadCloud } from 'lucide-react'
import { cx } from '../lib/cx'
import './dropzone.css'

export interface DropzoneProps {
  onFiles: (files: File[]) => void
  accept?: string[]
  multiple?: boolean
  title?: ReactNode
  hint?: ReactNode
  compact?: boolean
  disabled?: boolean
}

/** Drag-and-drop target that also opens the file picker on click or Enter. */
export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  title = 'Drop files here or click to browse',
  hint,
  compact = false,
  disabled = false,
}: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0) // dragenter/leave fire for children too

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    if (!disabled) take(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={cx('dropzone', compact && 'dropzone-compact', dragging && 'is-dragging', disabled && 'is-disabled')}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          input.current?.click()
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current++
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <span className="dropzone-icon">
        <UploadCloud />
      </span>
      <span className="dropzone-text">
        <span className="dropzone-title">{title}</span>
        {hint && <span className="dropzone-hint">{hint}</span>}
      </span>
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={accept?.join(',')}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
