import { useState } from 'react'
import { ArrowRight, MessageSquare, SquarePen } from 'lucide-react'
import { api } from '../../api/client'
import { describeError } from '../../components/ApiErrorAlert'
import { ConversationLayout, Composer, Message, Suggestions, Thread, TypingIndicator } from '../../components/conversation/Conversation'
import { Markdown } from '../../components/Markdown'
import { usePersistentState } from '../../lib/hooks'
import { Alert, Badge, Button, CopyButton, EmptyState } from '../../ui'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  error?: boolean
}

const SUGGESTIONS = ['Explain retrieval-augmented generation in two sentences', 'Write a haiku about vector databases']

/** The demo /api/chat endpoint: one-shot prompts to the model, not grounded in documents. */
export function ChatPage() {
  const [messages, setMessages] = usePersistentState<ChatMessage[]>('chat.messages', [])
  const [busy, setBusy] = useState(false)

  const send = async (text: string) => {
    setMessages((all) => [...all, { id: crypto.randomUUID(), role: 'user', content: text }])
    setBusy(true)
    try {
      const reply = await api.chat(text)
      setMessages((all) => [...all, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
    } catch (e) {
      const { title, detail } = describeError(e)
      setMessages((all) => [...all, { id: crypto.randomUUID(), role: 'assistant', content: detail ? `${title}: ${detail}` : title, error: true }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConversationLayout
      header={
        <>
          <MessageSquare size={18} className="muted" />
          <div className="grow">
            <div className="conversation-title">Model chat</div>
            <div className="xsmall muted">Each message is sent on its own; the model has no memory of earlier turns.</div>
          </div>
          <Badge tone="warning">Not grounded</Badge>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" icon={<SquarePen />} onClick={() => setMessages([])}>
              New
            </Button>
          )}
        </>
      }
      composer={<Composer onSend={send} busy={busy} placeholder="Message the model…" />}
    >
      <Thread follow={messages.length + (busy ? 0.5 : 0)}>
        {messages.length === 0 ? (
          <div className="conversation-empty">
            <EmptyState
              icon={<MessageSquare />}
              title="Talk to the model"
              description="For answers from your documents, use Ask instead."
              action={
                <Button variant="soft" iconRight={<ArrowRight />} onClick={() => (window.location.hash = 'ask')}>
                  Go to Ask
                </Button>
              }
            />
            <Suggestions items={SUGGESTIONS} onPick={send} />
          </div>
        ) : (
          messages.map((m) => (
            <Message key={m.id} role={m.role} actions={m.role === 'assistant' && !m.error && <CopyButton text={m.content} title="Copy reply" />}>
              {m.role === 'user' ? m.content : m.error ? <Alert tone="danger">{m.content}</Alert> : <Markdown>{m.content}</Markdown>}
            </Message>
          ))
        )}
        {busy && (
          <Message role="assistant">
            <TypingIndicator />
          </Message>
        )}
      </Thread>
    </ConversationLayout>
  )
}
