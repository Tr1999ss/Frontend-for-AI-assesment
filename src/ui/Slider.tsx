import type { CSSProperties, InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import { useFieldControl } from './Field'
import './slider.css'

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  /** shown right of the track; defaults to the value */
  format?: (value: number) => string
}

/** Native range input with a filled track and the current value beside it. */
export function Slider({ value, onChange, min, max, step = 1, format, className, ...rest }: SliderProps) {
  const field = useFieldControl()
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100
  return (
    <div className={cx('slider', className)}>
      <input
        type="range"
        id={field?.id}
        aria-describedby={field?.describedBy}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        {...rest}
      />
      <output className="slider-value">{format ? format(value) : value}</output>
    </div>
  )
}
