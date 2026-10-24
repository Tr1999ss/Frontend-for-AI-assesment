import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { FlaskConical, MessageSquare, MessagesSquare, Search, Tags, UploadCloud, Wrench, type LucideIcon } from 'lucide-react'
import type { Access } from '../auth/RequireRole'

export interface RouteDefinition {
  /** URL hash, e.g. #ingest */
  id: string
  label: string
  description: string
  icon: LucideIcon
  /** sidebar group */
  section: string
  /** who may open the page; enforced by the shell, mirrors SecurityConfiguration */
  access: Access
  component: LazyExoticComponent<ComponentType>
  /** 'full' pages get the whole viewport below the top bar (no max width, no page padding) */
  layout?: 'default' | 'full'
}

/** Lazy-loads a named export so each page (and its dependencies) is its own chunk. */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }))
}

/** Adding a page = one entry here. Sidebar order is the order sections first appear. */
export const ROUTES: RouteDefinition[] = [
  {
    id: 'ask',
    label: 'Ask',
    description: 'Answers from your documents, with citations',
    icon: MessagesSquare,
    section: 'Knowledge',
    access: 'kb-reader',
    layout: 'full',
    component: page(() => import('../features/ask/AskPage'), 'AskPage'),
  },
  {
    id: 'search',
    label: 'Search',
    description: 'Find the passages that match a query',
    icon: Search,
    section: 'Knowledge',
    access: 'kb-reader',
    component: page(() => import('../features/search/SearchPage'), 'SearchPage'),
  },
  {
    id: 'ingest',
    label: 'Ingest',
    description: 'Add documents to the knowledge base',
    icon: UploadCloud,
    section: 'Knowledge',
    access: 'kb-editor',
    component: page(() => import('../features/ingest/IngestPage'), 'IngestPage'),
  },
  {
    id: 'tools',
    label: 'MCP Tools',
    description: 'Run the MCP server tools by hand',
    icon: Wrench,
    section: 'Developer',
    access: 'kb-reader',
    component: page(() => import('../features/tools/ToolsPage'), 'ToolsPage'),
  },
  {
    id: 'chat',
    label: 'Model chat',
    description: 'Talk to the model directly, without documents',
    icon: MessageSquare,
    section: 'Developer',
    access: 'authenticated',
    layout: 'full',
    component: page(() => import('../features/chat/ChatPage'), 'ChatPage'),
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Manage the categories documents are filed under',
    icon: Tags,
    section: 'Administration',
    access: 'public',
    component: page(() => import('../features/categories/CategoriesPage'), 'CategoriesPage'),
  },
  {
    id: 'evaluation',
    label: 'Evaluation',
    description: 'Compare retrieval strategies on the golden question set',
    icon: FlaskConical,
    section: 'Administration',
    access: 'kb-admin',
    component: page(() => import('../features/evaluation/EvaluationPage'), 'EvaluationPage'),
  },
]

export const DEFAULT_ROUTE = ROUTES[0]

export function groupBySection(routes: RouteDefinition[]): [string, RouteDefinition[]][] {
  const groups = new Map<string, RouteDefinition[]>()
  for (const route of routes) groups.set(route.section, [...(groups.get(route.section) ?? []), route])
  return [...groups]
}
