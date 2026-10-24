import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cx } from '../lib/cx'
import './markdown.css'

/** GitHub-flavored markdown for model output. Pass `components` to override elements (e.g. links). */
export function Markdown({ children, components, className }: { children: string; components?: Components; className?: string }) {
  return (
    <div className={cx('markdown', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
