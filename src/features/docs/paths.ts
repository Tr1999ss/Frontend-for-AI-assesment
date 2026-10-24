// Path and route helpers shared by the viewer and the docs content check (docs-content.test.ts).
// Path rules mirror DocsCatalog.normalize/resolveRelative on the backend.

const SAFE_PATH = /^[A-Za-z0-9_\-./]+$/

/** Joins and normalizes path segments; null if the result would leave the docs root. */
export function normalizePath(dir: string, path: string): string | null {
  if (!path || path.startsWith('/') || path.includes('\\') || !SAFE_PATH.test(path)) return null
  const stack: string[] = []
  for (const segment of (dir ? `${dir}/${path}` : path).split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (!stack.length) return null
      stack.pop()
    } else {
      stack.push(segment)
    }
  }
  return stack.length ? stack.join('/') : null
}

export type LinkTarget =
  | { kind: 'external'; href: string }
  | { kind: 'anchor'; section: string }
  | { kind: 'file'; path: string; section?: string }
  | { kind: 'invalid'; raw: string }

/** Classifies a link found in the markdown of the page at `fromPath`. */
export function resolveLink(fromPath: string, href: string): LinkTarget {
  const raw = href.trim()
  if (/^(https?:|mailto:)/i.test(raw)) return { kind: 'external', href: raw }
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//') || raw.startsWith('/')) return { kind: 'invalid', raw }
  if (raw.startsWith('#')) return { kind: 'anchor', section: decodeURIComponent(raw.slice(1)) }
  const [pathPart, hash] = raw.split('#', 2)
  const dir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : ''
  let decoded: string
  try {
    decoded = decodeURIComponent(pathPart.replace(/\?.*$/, ''))
  } catch {
    return { kind: 'invalid', raw }
  }
  const path = normalizePath(dir, decoded)
  if (!path) return { kind: 'invalid', raw }
  return { kind: 'file', path, section: hash ? decodeURIComponent(hash) : undefined }
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp)$/i

/** Site path of a relative image reference, or null for absolute/unsupported ones. */
export function resolveImage(fromPath: string, src: string): string | null {
  const target = resolveLink(fromPath, src)
  return target.kind === 'file' && IMAGE_EXTENSIONS.test(target.path) ? target.path : null
}

// ---------- in-app routes: #docs/<slug>?section=<heading-id> ----------

export const DOCS_ROUTE = 'docs'

export function docHref(slug: string, section?: string): string {
  return `#${DOCS_ROUTE}/${slug}${section ? `?section=${encodeURIComponent(section)}` : ''}`
}

export interface DocsLocation {
  slug?: string
  section?: string
}

export function parseDocsHash(hash: string): DocsLocation {
  const value = hash.replace(/^#/, '')
  if (value !== DOCS_ROUTE && !value.startsWith(`${DOCS_ROUTE}/`) && !value.startsWith(`${DOCS_ROUTE}?`)) return {}
  const [pathPart, queryPart = ''] = value.split('?', 2)
  const slug = pathPart.slice(DOCS_ROUTE.length + 1) || undefined
  const section = new URLSearchParams(queryPart).get('section') ?? undefined
  return { slug, section }
}
