import { useEffect, useRef, useState } from 'react'
import { Input } from '../components/ui/input'
import { cn } from '../lib/utils'
import { useFlowStore } from '../state/flowStore'
import { useReactFlow } from '@xyflow/react'

export default function NodeLabel({ id, value, className, placeholder }: { id: string; value?: string; className?: string; placeholder?: string }) {
  const update = useFlowStore((s) => s.updateNodeData)
  const editingNodeId = useFlowStore((s) => s.editingNodeId)
  const setEditingNode = useFlowStore((s) => s.setEditingNode)
  const [text, setText] = useState(value ?? '')
  const ref = useRef<HTMLInputElement>(null)
  const { getNode } = useReactFlow()

  const editing = editingNodeId === id
  
  // Check if node is read-only
  const node = getNode(id)
  const isReadOnly = node?.data?.isReadOnly || false

  useEffect(() => setText(value ?? ''), [value])
  useEffect(() => {
    if (editing) {
      setText(value ?? '')
      ref.current?.focus()
    }
  }, [editing, value])

  const commit = () => {
    if (isReadOnly) return // Don't allow updates in read-only mode
    const label = text.trim() === '' ? (placeholder ?? '') : text
    update(id, { label })
    setEditingNode(undefined)
  }

  if (editing && !isReadOnly) {
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
      className={cn(isReadOnly ? 'cursor-default' : 'cursor-text', className)}
      onDoubleClick={() => {
        if (isReadOnly) return // Don't allow editing in read-only mode
        setText(value ?? '')
        setEditingNode(id)
      }}
    >
      {value ?? placeholder ?? 'Label'}
    </span>
  )
}
