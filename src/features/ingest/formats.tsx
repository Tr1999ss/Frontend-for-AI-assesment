import { File, FileCode2, FileJson, FileText, type LucideIcon } from 'lucide-react'
import type { SourceFormat } from '../../api/types'
import { fileExtension } from '../../lib/format'

// Presentation for each SourceFormat; add a format here and everything that shows files picks it up.
export const FORMAT_META: Record<SourceFormat, { label: string; icon: LucideIcon; hue: number }> = {
  PDF: { label: 'PDF', icon: FileText, hue: 8 },
  MARKDOWN: { label: 'Markdown', icon: FileCode2, hue: 250 },
  JSON: { label: 'JSON', icon: FileJson, hue: 40 },
  TEXT: { label: 'Text', icon: FileText, hue: 200 },
  UNKNOWN: { label: 'Unknown', icon: File, hue: 220 },
}

const BY_EXTENSION: Record<string, SourceFormat> = {
  pdf: 'PDF',
  md: 'MARKDOWN',
  markdown: 'MARKDOWN',
  json: 'JSON',
  txt: 'TEXT',
  text: 'TEXT',
}

export function formatOf(filename: string): SourceFormat {
  return BY_EXTENSION[fileExtension(filename)] ?? 'UNKNOWN'
}

export function FormatIcon({ format, size = 36 }: { format: SourceFormat; size?: number }) {
  const { icon: Icon, hue } = FORMAT_META[format]
  return (
    <span className="format-icon" style={{ width: size, height: size, ['--hue' as string]: hue }}>
      <Icon size={Math.round(size * 0.5)} />
    </span>
  )
}
