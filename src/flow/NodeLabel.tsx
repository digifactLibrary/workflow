import { useEffect, useRef, useState } from 'react'
import { Input } from '../components/ui/input'
import { cn } from '../lib/utils'
import { useFlowStore } from '../state/flowStore'

export default function NodeLabel({ id, value, className, placeholder }: { id: string; value?: string; className?: string; placeholder?: string }) {
  const update = useFlowStore((s) => s.updateNodeData)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value ?? '')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => setText(value ?? ''), [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => {
    const label = text.trim() === '' ? (placeholder ?? '') : text
    update(id, { label })
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setEditing(false)
            setText(value ?? '')
          }
        }}
        className={cn('h-7 px-2 py-1', className)}
      />
    )
  }

  return (
    <span className={cn('cursor-text', className)} onDoubleClick={() => setEditing(true)}>
      {value ?? placeholder ?? 'Label'}
    </span>
  )
}

