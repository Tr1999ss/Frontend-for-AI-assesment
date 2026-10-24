import { Skeleton } from '../ui'

/** Shown while a page chunk loads: the rough shape of a page header and two cards. */
export function PageFallback() {
  return (
    <div className="page" aria-busy>
      <div className="cluster" style={{ marginBottom: 32, gap: 16 }}>
        <Skeleton width={44} height={44} radius="12px" />
        <div className="stack" style={{ gap: 8, flex: 1 }}>
          <Skeleton width={220} height={20} />
          <Skeleton width={340} height={12} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <Skeleton height={320} radius="14px" />
        <Skeleton height={320} radius="14px" />
      </div>
    </div>
  )
}
