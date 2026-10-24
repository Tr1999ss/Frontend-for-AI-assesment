import type { CSSProperties } from 'react'
import { cx } from '../lib/cx'
import './loading.css'

export function Spinner({ size = 16, className }: { size?: number | string; className?: string }) {
  return <span className={cx('spinner', className)} style={{ width: size, height: size }} role="status" aria-label="Loading" />
}

export interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: string
  className?: string
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = 14, radius, className, style }: SkeletonProps) {
  return <span className={cx('skeleton', className)} style={{ width, height, borderRadius: radius, ...style }} aria-hidden />
}

/** Thin animated bar for work without measurable progress. */
export function ProgressBar({ className }: { className?: string }) {
  return (
    <span className={cx('progress', className)} role="progressbar" aria-label="Working">
      <span className="progress-bar" />
    </span>
  )
}
