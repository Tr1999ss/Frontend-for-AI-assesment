import { useMemo, useState, type CSSProperties } from 'react'
import { LogIn, Pencil, Plus, RefreshCw, Search, ShieldCheck, ShieldOff, Tags, Trash2 } from 'lucide-react'
import type { Category } from '../../api/types'
import { useAuth } from '../../auth/AuthProvider'
import { ApiErrorAlert, describeError } from '../../components/ApiErrorAlert'
import { cx } from '../../lib/cx'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  Segmented,
  Skeleton,
  Switch,
  useConfirm,
  useToast,
} from '../../ui'
import { CategoryFormDialog } from './CategoryFormDialog'
import { useCategoryAdmin } from './useCategoryAdmin'
import './categories.css'

type StatusFilter = 'all' | 'active' | 'inactive'

export function CategoriesPage() {
  const admin = useCategoryAdmin()
  const toast = useToast()
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [dialog, setDialog] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null })

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return admin.categories.filter(
      (c) =>
        (filter === 'all' || (filter === 'active') === c.active) &&
        (!q || c.name.includes(q) || c.description.toLowerCase().includes(q)),
    )
  }, [admin.categories, query, filter])

  const activeCount = admin.categories.filter((c) => c.active).length

  const toggleActive = async (category: Category) => {
    try {
      await admin.update(category.name, { active: !category.active })
      toast.success(`${category.name} ${category.active ? 'deactivated' : 'activated'}`)
    } catch (e) {
      toast.error('Update failed', describeError(e).detail)
    }
  }

  const remove = async (category: Category) => {
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      description: 'Documents already filed under it keep their tags. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await admin.remove(category.name)
      toast.success(`Deleted ${category.name}`)
    } catch (e) {
      toast.error('Delete failed', describeError(e).detail)
    }
  }

  const submitDialog = async ({ name, description }: { name: string; description: string }) => {
    if (dialog.editing) {
      await admin.update(dialog.editing.name, { description })
      toast.success(`Saved ${dialog.editing.name}`)
    } else {
      await admin.create({ name, description })
      toast.success(`Created ${name}`)
    }
    return true
  }

  return (
    <>
      <PageHeader
        icon={<Tags />}
        title="Categories"
        description="What documents get filed under. Descriptions guide the AI classifier."
        actions={
          <>
            <Button variant="ghost" icon={<RefreshCw />} onClick={admin.reload} loading={admin.loading} aria-label="Refresh" />
            <Button
              variant="primary"
              icon={<Plus />}
              disabled={!admin.admin}
              title={admin.admin ? undefined : 'Requires the kb-admin role'}
              onClick={() => setDialog({ open: true, editing: null })}
            >
              New category
            </Button>
          </>
        }
      />

      <div className="stats stagger">
        <Stat label="Total" value={admin.categories.length} loading={admin.loading && !admin.categories.length} index={0} />
        <Stat label="Active" value={activeCount} tone="success" loading={admin.loading && !admin.categories.length} index={1} />
        <Stat
          label="Inactive"
          value={admin.admin ? admin.categories.length - activeCount : '—'}
          loading={admin.loading && !admin.categories.length}
          index={2}
        />
        <Stat label="Access" value={admin.admin ? 'Admin' : 'Read-only'} tone={admin.admin ? 'accent' : undefined} index={3} />
      </div>

      <div className="categories-layout">
        <Card padded={false} className="categories-table-card">
          <div className="table-toolbar">
            <Input
              icon={<Search />}
              placeholder="Search name or description"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="grow"
              aria-label="Search categories"
            />
            {admin.admin && (
              <Segmented
                size="sm"
                value={filter}
                onChange={setFilter}
                aria-label="Status filter"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            )}
          </div>

          {admin.error != null && (
            <div className="card-section">
              <ApiErrorAlert error={admin.error} />
            </div>
          )}

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  {admin.admin && <th className="align-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="stagger">
                {admin.loading && !admin.categories.length &&
                  [0, 1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td><Skeleton width={110} /></td>
                      <td><Skeleton width="80%" /></td>
                      <td><Skeleton width={56} height={20} radius="999px" /></td>
                      {admin.admin && <td />}
                    </tr>
                  ))}
                {visible.map((c, i) => (
                  <tr key={c.name} className={cx(!c.active && 'is-inactive')} style={{ '--i': i } as CSSProperties}>
                    <td>
                      <span className="category-name">
                        <span className="category-avatar">{c.name[0]}</span>
                        <span className="mono">{c.name}</span>
                      </span>
                    </td>
                    <td className="category-description">
                      <span className="clamp-2" title={c.description}>
                        {c.description}
                      </span>
                    </td>
                    <td>
                      <Badge tone={c.active ? 'success' : 'neutral'} dot>
                        {c.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {admin.admin && (
                      <td>
                        <div className="row-actions">
                          <Switch size="sm" checked={c.active} onChange={() => toggleActive(c)} aria-label={`${c.active ? 'Deactivate' : 'Activate'} ${c.name}`} />
                          <Button variant="ghost" size="sm" icon={<Pencil />} aria-label={`Edit ${c.name}`} onClick={() => setDialog({ open: true, editing: c })} />
                          <Button variant="ghost" size="sm" icon={<Trash2 />} aria-label={`Delete ${c.name}`} className="danger-hover" onClick={() => remove(c)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!admin.loading && visible.length === 0 && !admin.error && (
              <EmptyState
                compact
                icon={<Search />}
                title={admin.categories.length ? 'No matches' : 'No categories yet'}
                description={admin.categories.length ? 'Try another search or filter.' : 'An admin can create the first one.'}
              />
            )}
          </div>
        </Card>

        <AccessCard admin={admin.admin} />
      </div>

      <CategoryFormDialog
        open={dialog.open}
        editing={dialog.editing}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSubmit={submitDialog}
      />
    </>
  )
}

function Stat(props: { label: string; value: number | string; tone?: 'success' | 'accent'; loading?: boolean; index: number }) {
  return (
    <div className={cx('stat', props.tone && `stat-${props.tone}`)} style={{ '--i': props.index } as CSSProperties}>
      <span className="stat-label">{props.label}</span>
      {props.loading ? <Skeleton width={48} height={26} /> : <span className={cx('stat-value', typeof props.value === 'string' && props.value.length > 2 && 'is-text')}>{props.value}</span>}
    </div>
  )
}

function AccessCard({ admin }: { admin: boolean }) {
  const { status, user, login } = useAuth()
  return (
    <Card className="admin-card">
      <CardHeader
        icon={admin ? <ShieldCheck /> : <ShieldOff />}
        title={admin ? 'You can manage categories' : 'Read-only view'}
        description={
          admin
            ? 'Create, edit, activate and delete. Changes reach the classifier within a minute.'
            : 'Only active categories are shown. Managing them needs the kb-admin role.'
        }
      />
      {status === 'anonymous' && (
        <Button variant="primary" icon={<LogIn />} onClick={login} block>
          Sign in
        </Button>
      )}
      {status === 'authenticated' && !admin && (
        <p className="small muted">
          Signed in as <strong>{user?.username}</strong>. Ask a Keycloak admin to grant <span className="mono">kb-admin</span>.
        </p>
      )}
    </Card>
  )
}
