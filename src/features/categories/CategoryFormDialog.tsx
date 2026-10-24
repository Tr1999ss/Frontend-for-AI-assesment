import { useEffect, useState, type FormEvent } from 'react'
import { Tag as TagIcon } from 'lucide-react'
import type { Category } from '../../api/types'
import { useAction } from '../../lib/hooks'
import { Button, Dialog, Field, Input, Textarea } from '../../ui'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'

/** Mirrors CategoryNames.PATTERN and the request size limits on the backend. */
const NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/
const DESCRIPTION_MAX = 1000

interface CategoryFormDialogProps {
  open: boolean
  /** null = create */
  editing: Category | null
  onClose: () => void
  onSubmit: (values: { name: string; description: string }) => Promise<unknown>
}

export function CategoryFormDialog({ open, editing, onClose, onSubmit }: CategoryFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [touched, setTouched] = useState(false)
  const save = useAction(onSubmit)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setDescription(editing?.description ?? '')
    setTouched(false)
    save.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const nameError = touched && !editing && name && !NAME_PATTERN.test(name) ? "Lowercase letters, digits, '-' and '_' only" : undefined
  const valid = (editing || NAME_PATTERN.test(name)) && description.trim().length > 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    const result = await save.run({ name: name.trim(), description: description.trim() })
    if (result !== undefined) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon={<TagIcon />}
      title={editing ? `Edit “${editing.name}”` : 'New category'}
      description="The AI classifier reads the description when filing documents, so say what belongs here."
    >
      <form className="stack" onSubmit={submit} id="category-form">
        <Field label="Name" required error={nameError} hint={editing ? 'Names cannot be changed' : 'e.g. customer-support'}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            onBlur={() => setTouched(true)}
            disabled={Boolean(editing)}
            className="mono"
            autoFocus={!editing}
            placeholder="category-name"
          />
        </Field>
        <Field label="Description" required trailing={`${description.length} / ${DESCRIPTION_MAX}`}>
          <Textarea
            rows={5}
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus={Boolean(editing)}
            placeholder="Support tickets, troubleshooting guides, customer FAQs, escalation procedures…"
          />
        </Field>
        <ApiErrorAlert error={save.error} onDismiss={save.clearError} />
        <div className="cluster" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.busy} disabled={!valid}>
            {editing ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
