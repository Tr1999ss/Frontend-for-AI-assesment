import { useState, type CSSProperties } from 'react'
import { ChevronDown, History, Layers, Star, Trash2 } from 'lucide-react'
import { cx } from '../../lib/cx'
import { timeAgo } from '../../lib/format'
import { Badge, Button, Card, CardHeader, CodeBlock, CopyButton, EmptyState, Tag, useConfirm } from '../../ui'
import { FORMAT_META, FormatIcon } from './formats'
import type { IngestHistoryEntry } from './useIngestHistory'

export function IngestionActivity({ entries, onClear }: { entries: IngestHistoryEntry[]; onClear: () => void }) {
  const confirm = useConfirm()
  const ingested = entries.filter((e) => e.result.status === 'INGESTED').length
  const chunks = entries.reduce((sum, e) => sum + e.result.chunkCount, 0)

  const clear = async () => {
    if (await confirm({ title: 'Clear activity?', description: 'This only clears the list in this browser; documents stay ingested.', confirmLabel: 'Clear' }))
      onClear()
  }

  return (
    <Card padded={false} className="activity">
      <CardHeader
        icon={<History />}
        title="Recent activity"
        description={entries.length ? `${ingested} ingested · ${chunks.toLocaleString()} chunks stored` : 'Results appear here as you ingest'}
        actions={entries.length > 0 && <Button variant="ghost" size="sm" icon={<Trash2 />} aria-label="Clear activity" onClick={clear} />}
      />
      {entries.length === 0 ? (
        <EmptyState icon={<Layers />} title="Nothing ingested yet" description="Upload a file or paste some text to see the pipeline's result." />
      ) : (
        <ul className="activity-list stagger">
          {entries.map((entry, i) => (
            <ActivityItem key={entry.result.requestId} entry={entry} index={i} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function ActivityItem({ entry, index }: { entry: IngestHistoryEntry; index: number }) {
  const [open, setOpen] = useState(false)
  const { result } = entry
  const duplicate = result.status === 'DUPLICATE'

  return (
    <li className={cx('activity-item', open && 'is-open')} style={{ '--i': Math.min(index, 10) } as CSSProperties}>
      <button type="button" className="activity-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FormatIcon format={result.format} size={34} />
        <div className="grow">
          <div className="activity-title">
            <span className="truncate">{result.filename}</span>
            <Badge tone={duplicate ? 'warning' : 'success'}>{duplicate ? 'Duplicate' : 'Ingested'}</Badge>
          </div>
          <div className="activity-meta">
            {FORMAT_META[result.format].label} · {result.chunkCount} chunk{result.chunkCount === 1 ? '' : 's'} · {entry.via} ·{' '}
            {timeAgo(entry.at)}
          </div>
          {result.categories.length > 0 && (
            <div className="activity-tags">
              {result.categories.map((c) => (
                <Tag key={c} emphasis={c === result.primaryCategory}>
                  {c === result.primaryCategory && <Star size={10} fill="currentColor" />}
                  {c}
                </Tag>
              ))}
            </div>
          )}
        </div>
        <ChevronDown className="activity-chevron" size={16} />
      </button>
      <div className="activity-details" inert={!open}>
        <div className="activity-details-inner">
          {duplicate && <p className="small subtle">Same content was already registered; the existing document was left unchanged.</p>}
          <dl className="facts">
            <dt>Document</dt>
            <dd>
              <span className="mono truncate">{result.documentId ?? '—'}</span>
              {result.documentId && <CopyButton text={result.documentId} />}
            </dd>
            <dt>Request</dt>
            <dd>
              <span className="mono truncate">{result.requestId}</span>
            </dd>
          </dl>
          <CodeBlock value={result} label="Response" maxHeight={260} />
        </div>
      </div>
    </li>
  )
}
