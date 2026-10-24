import { useState } from 'react'
import { MessagesSquare, RotateCcw, SlidersHorizontal, SquarePen } from 'lucide-react'
import { api } from '../../api/client'
import type { Answer } from '../../api/types'
import { describeError } from '../../components/ApiErrorAlert'
import { ComposerTools } from './ComposerTools'
import { ConversationLayout, Composer, Message, Suggestions, Thread, TypingIndicator } from '../../components/conversation/Conversation'
import { usePersistentState } from '../../lib/hooks'
import { Alert, Button, CopyButton, EmptyState, useConfirm } from '../../ui'
import { AnswerView } from '../retrieval/AnswerView'
import { DEFAULT_FILTERS, toRequest, withDefaults, type RetrievalFilterValues } from '../retrieval/RetrievalFilters'
import './ask.css'

interface Turn {
  id: string
  question: string
  filters: RetrievalFilterValues
  status: 'pending' | 'done' | 'error'
  answer?: Answer
  error?: { title: string; detail?: string }
}

const SUGGESTIONS = [
  'What is the leave policy?',
  'Summarize the expense reimbursement rules',
  'How do I deploy the service to production?',
  'Which documents mention data retention?',
]

export function AskPage() {
  const [turns, setTurns] = usePersistentState<Turn[]>('ask.turns', [])
  const [storedFilters, setFilters] = usePersistentState<RetrievalFilterValues>('ask.filters', DEFAULT_FILTERS)
  const filters = withDefaults(storedFilters)
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()

  const patch = (id: string, change: Partial<Turn>) => setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...change } : t)))

  const ask = async (question: string, using = filters) => {
    const id = crypto.randomUUID()
    setTurns((all) => [...all, { id, question, filters: using, status: 'pending' }])
    setBusy(true)
    try {
      const answer = await api.ask({ question, ...toRequest(using) })
      patch(id, { status: 'done', answer })
    } catch (e) {
      patch(id, { status: 'error', error: describeError(e) })
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (await confirm({ title: 'Start a new conversation?', description: 'The current questions and answers will be cleared from this browser.', confirmLabel: 'Clear' }))
      setTurns([])
  }

  // Turns left 'pending' by a reload never finish; show them as interrupted.
  const visible = turns.map((t) => (t.status === 'pending' && !busy ? { ...t, status: 'error' as const, error: { title: 'Interrupted' } } : t))

  return (
    <ConversationLayout
      header={
        <>
          <MessagesSquare size={18} className="muted" />
          <div className="grow">
            <div className="conversation-title">Ask the knowledge base</div>
            <div className="xsmall muted">Answers cite the passages they come from.</div>
          </div>
          {turns.length > 0 && (
            <Button variant="ghost" size="sm" icon={<SquarePen />} onClick={reset}>
              New
            </Button>
          )}
        </>
      }
      composer={
        <Composer
          onSend={(q) => ask(q)}
          busy={busy}
          placeholder="Ask a question about your documents…"
          tools={<ComposerTools value={filters} onChange={setFilters} icon={<SlidersHorizontal />} />}
          footnote="Answers come only from ingested documents. Check the cited sources."
        />
      }
    >
      <Thread follow={visible.length + (busy ? 0.5 : 0)}>
        {visible.length === 0 ? (
          <div className="conversation-empty">
            <EmptyState
              icon={<MessagesSquare />}
              title="What would you like to know?"
              description="Questions are answered from the ingested documents, with numbered citations."
            />
            <Suggestions items={SUGGESTIONS} onPick={(q) => ask(q)} />
          </div>
        ) : (
          visible.map((turn) => (
            <div key={turn.id} className="ask-turn">
              <Message role="user">
                {turn.question}
                {turn.filters.categories.length > 0 && (
                  <div className="xsmall muted ask-turn-filters">in {turn.filters.categories.join(', ')}</div>
                )}
              </Message>
              <Message
                role="assistant"
                actions={
                  turn.status !== 'pending' && (
                    <>
                      {turn.answer && <CopyButton text={turn.answer.answer} title="Copy answer" />}
                      <Button variant="ghost" size="sm" icon={<RotateCcw />} title="Ask again" aria-label="Ask again" disabled={busy} onClick={() => ask(turn.question, withDefaults(turn.filters))} />
                    </>
                  )
                }
              >
                {turn.status === 'pending' && <TypingIndicator label="Searching sources and writing an answer…" />}
                {turn.status === 'done' && turn.answer && <AnswerView answer={turn.answer} />}
                {turn.status === 'error' && (
                  <Alert tone="danger" title={turn.error?.title}>
                    {turn.error?.detail}
                  </Alert>
                )}
              </Message>
            </div>
          ))
        )}
      </Thread>
    </ConversationLayout>
  )
}
