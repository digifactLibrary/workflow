import { useEffect, useRef, useState } from 'react'
import { Input } from '../components/ui/input'
import { cn } from '../lib/utils'
import { useFlowStore } from '../state/flowStore'

export default function NodeLabel({ id, value, className, placeholder }: { id: string; value?: string; className?: string; placeholder?: string }) {
  const update = useFlowStore((s) => s.updateNodeData)
  const editingNodeId = useFlowStore((s) => s.editingNodeId)
  const setEditingNode = useFlowStore((s) => s.setEditingNode)
  const [text, setText] = useState(value ?? '')
  const ref = useRef<HTMLInputElement>(null)

  const editing = editingNodeId === id

  useEffect(() => setText(value ?? ''), [value])
  useEffect(() => {
    if (editing) {
      setText(value ?? '')
      ref.current?.focus()
    }
  }, [editing, value])

  const commit = () => {
    const label = text.trim() === '' ? (placeholder ?? '') : text
    update(id, { label })
    setEditingNode(undefined)
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
            setText(value ?? '')
            setEditingNode(undefined)
          }
        }}
        className={cn('h-7 px-2 py-1', className)}
      />
    )
  }

  return (
    <span
      className={cn('cursor-text', className)}
      onDoubleClick={() => {
        setText(value ?? '')
        setEditingNode(id)
      }}
    >
      {value ?? placeholder ?? 'Label'}
    </span>
  )
}
