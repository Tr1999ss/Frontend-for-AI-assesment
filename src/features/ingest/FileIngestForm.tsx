import { useState } from 'react'
import { CircleAlert, CircleCheck, Copy, Play, RotateCcw, X } from 'lucide-react'
import { api } from '../../api/client'
import type { IngestionResult } from '../../api/types'
import { describeError } from '../../components/ApiErrorAlert'
import { UPLOAD } from '../../config'
import { cx } from '../../lib/cx'
import { formatBytes } from '../../lib/format'
import { Badge, Button, Dropzone, Field, ProgressBar, useToast } from '../../ui'
import { CategoryPicker } from '../categories/CategoryPicker'
import { FormatIcon, formatOf } from './formats'

type ItemStatus = 'queued' | 'uploading' | 'done' | 'duplicate' | 'failed'

interface QueueItem {
  id: string
  file: File
  status: ItemStatus
  error?: string
}

/** Queue of files ingested one request at a time (the endpoint takes one file per call). */
export function FileIngestForm({ onIngested }: { onIngested: (result: IngestionResult) => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const toast = useToast()

  const patch = (id: string, change: Partial<QueueItem>) =>
    setQueue((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)))

  const addFiles = (files: File[]) =>
    setQueue((items) => [
      ...items,
      ...files.map((file): QueueItem => {
        const tooBig = file.size > UPLOAD.maxBytes
        return {
          id: crypto.randomUUID(),
          file,
          status: tooBig ? 'failed' : 'queued',
          error: tooBig ? `Larger than ${formatBytes(UPLOAD.maxBytes)}` : undefined,
        }
      }),
    ])

  const pending = queue.filter((i) => i.status === 'queued')
  const retryable = queue.filter((i) => i.status === 'failed' && i.file.size <= UPLOAD.maxBytes)

  const run = async (items: QueueItem[]) => {
    setRunning(true)
    let ingested = 0
    let failed = 0
    for (const item of items) {
      patch(item.id, { status: 'uploading', error: undefined })
      try {
        const result = await api.ingestFile(item.file, categories)
        patch(item.id, { status: result.status === 'DUPLICATE' ? 'duplicate' : 'done' })
        onIngested(result)
        ingested++
      } catch (e) {
        const { title, detail } = describeError(e)
        patch(item.id, { status: 'failed', error: detail ?? title })
        failed++
      }
    }
    setRunning(false)
    if (failed === 0) toast.success(`${ingested} file${ingested === 1 ? '' : 's'} processed`)
    else toast.error(`${failed} of ${items.length} failed`, 'See the queue for details.')
  }

  const clearFinished = () => setQueue((items) => items.filter((i) => i.status === 'queued' || i.status === 'uploading'))

  return (
    <div className="stack">
      <Dropzone
        onFiles={addFiles}
        accept={UPLOAD.accept}
        disabled={running}
        compact={queue.length > 0}
        title={queue.length ? 'Add more files' : 'Drop files here or click to browse'}
        hint={`PDF, Markdown, JSON or plain text · up to ${formatBytes(UPLOAD.maxBytes)} each`}
      />

      {queue.length > 0 && (
        <ul className="file-queue stagger">
          {queue.map((item, i) => (
            <QueueRow
              key={item.id}
              item={item}
              index={i}
              onRemove={() => setQueue((items) => items.filter((x) => x.id !== item.id))}
              disabled={running}
            />
          ))}
        </ul>
      )}

      <Field label="Categories" hint="Applied to every file in this batch.">
        <CategoryPicker value={categories} onChange={setCategories} />
      </Field>

      <div className="form-actions">
        {queue.some((i) => i.status !== 'queued' && i.status !== 'uploading') && !running && (
          <Button variant="ghost" onClick={clearFinished}>
            Clear finished
          </Button>
        )}
        {retryable.length > 0 && !running && (
          <Button icon={<RotateCcw />} onClick={() => run(retryable)}>
            Retry failed
          </Button>
        )}
        <Button variant="primary" icon={<Play />} loading={running} disabled={pending.length === 0} onClick={() => run(pending)}>
          {running ? 'Ingesting…' : pending.length ? `Ingest ${pending.length} file${pending.length === 1 ? '' : 's'}` : 'Ingest files'}
        </Button>
      </div>
    </div>
  )
}

const STATUS: Record<ItemStatus, { label: string; tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  uploading: { label: 'Processing', tone: 'accent' },
  done: { label: 'Ingested', tone: 'success' },
  duplicate: { label: 'Duplicate', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
}

function QueueRow({ item, index, onRemove, disabled }: { item: QueueItem; index: number; onRemove: () => void; disabled: boolean }) {
  const { label, tone } = STATUS[item.status]
  const icon = item.status === 'done' ? <CircleCheck /> : item.status === 'duplicate' ? <Copy /> : item.status === 'failed' ? <CircleAlert /> : undefined
  return (
    <li className={cx('file-row', `is-${item.status}`)} style={{ ['--i' as string]: index }}>
      <FormatIcon format={formatOf(item.file.name)} />
      <div className="grow">
        <div className="file-row-name truncate" title={item.file.name}>
          {item.file.name}
        </div>
        <div className="file-row-meta">
          {formatBytes(item.file.size)}
          {item.error && <span className="file-row-error"> · {item.error}</span>}
        </div>
        {item.status === 'uploading' && <ProgressBar className="file-row-progress" />}
      </div>
      <Badge tone={tone} icon={icon}>
        {label}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        icon={<X />}
        aria-label={`Remove ${item.file.name}`}
        disabled={disabled || item.status === 'uploading'}
        onClick={onRemove}
      />
    </li>
  )
}
