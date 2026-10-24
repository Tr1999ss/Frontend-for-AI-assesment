import { FileUp, Type, UploadCloud } from 'lucide-react'
import { usePersistentState } from '../../lib/hooks'
import { Card, PageHeader, Segmented } from '../../ui'
import { FileIngestForm } from './FileIngestForm'
import { IngestionActivity } from './IngestionActivity'
import { TextIngestForm } from './TextIngestForm'
import { useIngestHistory } from './useIngestHistory'
import './ingest.css'

type Mode = 'file' | 'text'

const PIPELINE = ['Intake', 'Extract', 'Dedup', 'Categorize', 'Chunk', 'Embed & store']

export function IngestPage() {
  const [mode, setMode] = usePersistentState<Mode>('ingest.mode', 'file')
  const history = useIngestHistory()

  return (
    <>
      <PageHeader
        icon={<UploadCloud />}
        title="Ingest documents"
        description="Every submission runs the full pipeline and becomes searchable."
      >
        <ol className="pipeline" aria-label="Pipeline stages">
          {PIPELINE.map((stage, i) => (
            <li key={stage} style={{ ['--i' as string]: i }}>
              <span className="pipeline-step">{i + 1}</span>
              {stage}
            </li>
          ))}
        </ol>
      </PageHeader>

      <div className="ingest-layout">
        <Card className="ingest-form-card">
          <div className="ingest-form-head">
            <Segmented
              value={mode}
              onChange={setMode}
              aria-label="Input type"
              options={[
                { value: 'file', label: 'Upload files', icon: <FileUp /> },
                { value: 'text', label: 'Paste text', icon: <Type /> },
              ]}
            />
          </div>
          <div key={mode} className="ingest-form-body">
            {mode === 'file' ? (
              <FileIngestForm onIngested={(r) => history.add(r, 'file')} />
            ) : (
              <TextIngestForm onIngested={(r) => history.add(r, 'text')} />
            )}
          </div>
        </Card>

        <IngestionActivity entries={history.entries} onClear={history.clear} />
      </div>
    </>
  )
}
