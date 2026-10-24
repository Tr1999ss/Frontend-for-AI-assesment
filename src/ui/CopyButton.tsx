import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, type ButtonProps } from './Button'

export function CopyButton({ text, label, size = 'sm', ...rest }: { text: string; label?: string } & ButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // clipboard blocked; nothing useful to do
    }
  }

  return (
    <Button
      variant="ghost"
      size={size}
      icon={copied ? <Check className="copy-done" /> : <Copy />}
      aria-label={label ?? 'Copy'}
      title={copied ? 'Copied' : (label ?? 'Copy')}
      onClick={copy}
      {...rest}
    >
      {label && (copied ? 'Copied' : label)}
    </Button>
  )
}
