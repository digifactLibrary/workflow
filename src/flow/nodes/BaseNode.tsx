import { memo } from 'react'
import { Handle, NodeToolbar, NodeResizer, Position, useReactFlow } from '@xyflow/react'
import { Button } from '../../components/ui/button'
import { Trash2, Copy } from 'lucide-react'
import { cn } from '../../lib/utils'

type BaseProps = {
  id: string
  data: { label: string; color?: string }
  selected?: boolean
  className?: string
  children?: React.ReactNode
}

export const BaseNode = memo(({ id, data, selected, className, children }: BaseProps) => {
  const { deleteElements, addNodes, getNode } = useReactFlow()
  return (
    <div className={cn('relative rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      <NodeToolbar isVisible={selected} position={Position.Top} className="gap-1 p-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const n = getNode(id)
            if (!n) return
            const offset = 40
            addNodes({ ...n, id: `${id}-copy-${Math.round(Math.random()*1000)}`, position: { x: n.position.x + offset, y: n.position.y + offset } })
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="destructive" onClick={() => deleteElements({ nodes: [{ id }] })}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </NodeToolbar>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={48} color="#94a3b8" />
      {/* Source handles (start here) */}
      <Handle id="s-top" type="source" position={Position.Top} isConnectableStart isConnectableEnd={false} className="w-3 h-3 bg-brand-teal rounded-full border-2 border-white" />
      <Handle id="s-right" type="source" position={Position.Right} isConnectableStart isConnectableEnd={false} className="w-3 h-3 bg-brand-purple rounded-full border-2 border-white" />
      <Handle id="s-bottom" type="source" position={Position.Bottom} isConnectableStart isConnectableEnd={false} className="w-3 h-3 bg-brand-amber rounded-full border-2 border-white" />
      <Handle id="s-left" type="source" position={Position.Left} isConnectableStart isConnectableEnd={false} className="w-3 h-3 bg-brand-rose rounded-full border-2 border-white" />

      {/* Target handles (end here) */}
      <Handle id="t-top" type="target" position={Position.Top} isConnectableStart={false} isConnectableEnd className="w-3 h-3 bg-brand-teal rounded-full border-2 border-white" />
      <Handle id="t-right" type="target" position={Position.Right} isConnectableStart={false} isConnectableEnd className="w-3 h-3 bg-brand-purple rounded-full border-2 border-white" />
      <Handle id="t-bottom" type="target" position={Position.Bottom} isConnectableStart={false} isConnectableEnd className="w-3 h-3 bg-brand-amber rounded-full border-2 border-white" />
      <Handle id="t-left" type="target" position={Position.Left} isConnectableStart={false} isConnectableEnd className="w-3 h-3 bg-brand-rose rounded-full border-2 border-white" />

      <div className={cn('px-4 py-2 select-none', data.color)}>{children ?? data.label}</div>
    </div>
  )
})

export default BaseNode
