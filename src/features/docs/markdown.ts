import DOMPurify from 'dompurify'
import GithubSlugger from 'github-slugger'
import type { Element, ElementContent, Root, RootContent, Text } from 'hast'
import bash from 'highlight.js/lib/languages/bash'
import diff from 'highlight.js/lib/languages/diff'
import http from 'highlight.js/lib/languages/http'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import properties from 'highlight.js/lib/languages/properties'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { docHref, resolveImage, resolveLink } from './paths'

// Markdown → sanitized HTML for the docs viewer.
//   parse (GFM) → hast → heading ids → links/images → mermaid → highlight → code/table chrome → HTML → DOMPurify
// Raw HTML in the markdown is never passed through (remark-rehype drops it), and the final HTML is sanitized
// again before it reaches the page.

/** Curated languages keep the bundle small; unknown fences render as plain text. */
const LANGUAGES = { bash, sh: bash, shell: bash, diff, http, ini, java, javascript, js: javascript, json, properties, sql, typescript, ts: typescript, xml, html: xml, yaml, yml: yaml }
const LANGUAGE_ALIASES = { bash: ['sh', 'shell', 'zsh', 'console'], javascript: ['js'], typescript: ['ts', 'tsx'], xml: ['html'], yaml: ['yml'] }

/** Prefix for heading element ids in the page, so doc headings never collide with app ids (or clobber DOM globals). */
export const HEADING_ID_PREFIX = 'doc-'

export interface DocHeading {
  /** GitHub-compatible anchor, as used in links and in ?section= */
  id: string
  text: string
  depth: number
}

/** A heading and the text under it (until the next heading), for search. */
export interface DocSection {
  headingId?: string
  heading?: string
  text: string
}

export interface BrokenLink {
  text: string
  target: string
  reason: string
}

export interface ParsedDoc {
  headings: DocHeading[]
  sections: DocSection[]
  mermaidBlocks: string[]
  /** relative links and images as written, for the content check */
  links: string[]
  images: string[]
  hast: Root
}

export interface RenderContext {
  slug: string
  path: string
  /** site path → slug for every page in the docs set */
  slugByPath: Map<string, string>
  /** slug → heading ids, to validate cross-page anchors */
  headingsBySlug: Map<string, Set<string>>
  /** heading id → widget name, rendered as a placeholder after that heading */
  widgets?: Record<string, string>
}

export interface RenderedDoc {
  html: string
  brokenLinks: BrokenLink[]
  hasMermaid: boolean
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)

/** First stage: structure only. Cheap enough to run for every page to build search and anchor indexes. */
export function parseDoc(markdown: string): ParsedDoc {
  const hast = parser.runSync(parser.parse(markdown)) as Root
  const slugger = new GithubSlugger()
  const headings: DocHeading[] = []
  const sections: DocSection[] = [{ text: '' }]
  const mermaidBlocks: string[] = []
  const links: string[] = []
  const images: string[] = []

  visit(hast, 'element', (node: Element) => {
    if (/^h[1-6]$/.test(node.tagName)) {
      const text = textOf(node).trim()
      const id = slugger.slug(text)
      node.properties = { ...node.properties, id: HEADING_ID_PREFIX + id, dataSection: id }
      headings.push({ id, text, depth: Number(node.tagName[1]) })
    } else if (node.tagName === 'a' && typeof node.properties?.href === 'string') {
      links.push(node.properties.href)
    } else if (node.tagName === 'img' && typeof node.properties?.src === 'string') {
      images.push(node.properties.src)
    } else if (node.tagName === 'code' && hasClass(node, 'language-mermaid')) {
      mermaidBlocks.push(textOf(node))
    }
  })

  // sections: top-level blocks grouped under the most recent heading
  for (const child of hast.children) {
    if (child.type === 'element' && /^h[1-6]$/.test(child.tagName)) {
      sections.push({ headingId: String(child.properties?.dataSection), heading: textOf(child).trim(), text: '' })
    } else {
      const current = sections[sections.length - 1]
      current.text += ` ${textOf(child)}`
    }
  }

  return {
    headings,
    sections: sections.map((s) => ({ ...s, text: s.text.replace(/\s+/g, ' ').trim() })).filter((s) => s.heading || s.text),
    mermaidBlocks,
    links,
    images,
    hast,
  }
}

/** Second stage: links, diagrams, highlighting and chrome, then HTML and sanitization. */
export function renderDoc(parsed: ParsedDoc, ctx: RenderContext): RenderedDoc {
  const tree = structuredClone(parsed.hast)
  const brokenLinks: BrokenLink[] = []
  rewriteLinks(tree, ctx, brokenLinks)
  const hasMermaid = replaceMermaid(tree)
  insertWidgets(tree, ctx.widgets)

  const processed = unified()
    .use(rehypeHighlight, { languages: LANGUAGES, aliases: LANGUAGE_ALIASES, detect: false, plainText: ['text', 'txt', 'plain', 'markdown', 'md', 'mermaid'] })
    .use(() => (root: Root) => addChrome(root, ctx.slug))
    .runSync(tree) as Root

  const html = unified().use(rehypeStringify).stringify(processed)
  return { html: sanitize(html), brokenLinks, hasMermaid }
}

// ---------- sanitization ----------

const HTML_POLICY = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target', 'rel', 'tabindex', 'role', 'aria-label', 'aria-describedby', 'title'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'link', 'meta', 'base'],
  FORBID_ATTR: ['style', 'srcset'],
  ALLOW_DATA_ATTR: true,
}

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, HTML_POLICY) as string
}

/** Mermaid SVG (rendered with htmlLabels off, so there is no foreignObject HTML to keep). */
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['style'], FORBID_TAGS: ['foreignObject', 'script'] }) as string
}

// ---------- transforms ----------

function rewriteLinks(tree: Root, ctx: RenderContext, broken: BrokenLink[]) {
  const ownHeadings = ctx.headingsBySlug.get(ctx.slug) ?? new Set<string>()

  visit(tree, 'element', (node: Element) => {
    if (node.tagName === 'img' && typeof node.properties?.src === 'string') {
      const src = node.properties.src
      const assetPath = resolveImage(ctx.path, src)
      if (assetPath) {
        // fetched with the bearer token by the viewer; never loaded by URL
        node.properties = { ...node.properties, src: undefined, dataDocSrc: assetPath, loading: 'lazy', className: ['doc-image'] }
      } else if (!/^https:\/\//i.test(src)) {
        node.properties = { ...node.properties, src: undefined, dataBroken: src, className: ['doc-image', 'is-broken'] }
        broken.push({ text: String(node.properties.alt ?? src), target: src, reason: 'Image is not part of the docs' })
      }
      return
    }
    if (node.tagName !== 'a' || typeof node.properties?.href !== 'string') return

    const href = node.properties.href
    const text = textOf(node).trim() || href
    const markBroken = (reason: string) => {
      broken.push({ text, target: href, reason })
      node.properties = { ...node.properties, href: '#', className: ['doc-broken'], dataBroken: `${reason}: ${href}`, title: `Broken link: ${reason}` }
    }
    const target = resolveLink(ctx.path, href)

    switch (target.kind) {
      case 'external':
        node.properties = { ...node.properties, target: '_blank', rel: 'noopener noreferrer', className: ['doc-external'] }
        break
      case 'anchor':
        if (!ownHeadings.has(target.section)) markBroken('No such section on this page')
        else node.properties = { ...node.properties, href: docHref(ctx.slug, target.section) }
        break
      case 'file': {
        const slug = ctx.slugByPath.get(target.path)
        if (!slug) markBroken(target.path.endsWith('.md') ? 'Page is not in the docs' : 'File is not part of the docs')
        else if (target.section && !ctx.headingsBySlug.get(slug)?.has(target.section)) markBroken('No such section on that page')
        else node.properties = { ...node.properties, href: docHref(slug, target.section) }
        break
      }
      case 'invalid':
        markBroken('Unsupported link')
        break
    }
  })
}

/** ```mermaid fences become placeholders holding their source as text; the viewer renders them lazily. */
function replaceMermaid(tree: Root): boolean {
  let found = false
  visit(tree, 'element', (node: Element, index, parent) => {
    if (node.tagName !== 'pre' || !parent || index === undefined) return
    const code = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code')
    if (!code || !hasClass(code, 'language-mermaid')) return
    found = true
    const block: Element = {
      type: 'element',
      tagName: 'figure',
      properties: { className: ['doc-mermaid'], dataMermaid: '' },
      children: [
        { type: 'element', tagName: 'div', properties: { className: ['doc-mermaid-diagram'], role: 'img', ariaLabel: 'Diagram' }, children: [] },
        { type: 'element', tagName: 'pre', properties: { className: ['doc-mermaid-source'] }, children: [{ type: 'text', value: textOf(code) }] },
      ],
    }
    parent.children[index] = block
  })
  return found
}

function insertWidgets(tree: Root, widgets?: Record<string, string>) {
  if (!widgets) return
  tree.children = tree.children.flatMap((child): RootContent[] => {
    const id = child.type === 'element' ? child.properties?.dataSection : undefined
    const widget = typeof id === 'string' ? widgets[id] : undefined
    if (!widget) return [child]
    return [child, { type: 'element', tagName: 'div', properties: { className: ['doc-widget'], dataWidget: widget }, children: [] }]
  })
}

/** Heading anchors, code block header (language + copy), scrollable table wrapper. */
function addChrome(tree: Root, slug: string) {
  visit(tree, 'element', (node: Element, index, parent) => {
    if (!parent || index === undefined) return
    if (/^h[1-6]$/.test(node.tagName) && typeof node.properties?.dataSection === 'string') {
      node.children.push({
        type: 'element',
        tagName: 'a',
        properties: { href: docHref(slug, node.properties.dataSection), className: ['doc-heading-anchor'], ariaLabel: 'Link to this section' },
        children: [{ type: 'text', value: '#' }],
      })
      return
    }
    if (node.tagName === 'pre' && !hasClass(node, 'doc-mermaid-source')) {
      const code = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code')
      const language = code ? languageOf(code) : undefined
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['doc-code'] },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['doc-code-head'] },
            children: [
              { type: 'element', tagName: 'span', properties: { className: ['doc-code-lang'] }, children: [{ type: 'text', value: language ?? 'text' }] },
              { type: 'element', tagName: 'button', properties: { type: 'button', className: ['doc-code-copy'], ariaLabel: 'Copy code' }, children: [{ type: 'text', value: 'Copy' }] },
            ],
          },
          { ...node, properties: { ...node.properties, tabIndex: 0 } },
        ],
      }
      return 'skip'
    }
    if (node.tagName === 'table') {
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['doc-table'], tabIndex: 0, role: 'region', ariaLabel: 'Table' },
        children: [node],
      }
      return 'skip'
    }
  })
}

// ---------- hast helpers ----------

function hasClass(node: Element, name: string): boolean {
  const cls = node.properties?.className
  return Array.isArray(cls) && cls.includes(name)
}

function languageOf(code: Element): string | undefined {
  const cls = code.properties?.className
  const match = Array.isArray(cls) ? cls.map(String).find((c) => c.startsWith('language-')) : undefined
  return match?.slice('language-'.length)
}

export function textOf(node: Root | RootContent | ElementContent): string {
  if (node.type === 'text') return (node as Text).value
  if ('children' in node) return (node.children as ElementContent[]).map(textOf).join('')
  return ''
}
