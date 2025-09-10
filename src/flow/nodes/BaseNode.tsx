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
  hideHandles?: boolean
  hideResizer?: boolean
  frameless?: boolean
}

export const BaseNode = memo(({ id, data, selected, className, children, hideHandles, hideResizer, frameless }: BaseProps) => {
  const { deleteElements, addNodes, getNode } = useReactFlow()
  return (
    <div className={cn(frameless ? 'relative' : 'relative rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
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
      {!hideResizer && (
        <NodeResizer isVisible={selected} minWidth={120} minHeight={48} color="#94a3b8" />
      )}
      {!hideHandles && (
        <>
          {/* One handle per side, aligned consistently */}
          <Handle id="t-top" type="target" position={Position.Top} className="w-3 h-3 bg-slate-900 rounded-full border-2 border-white" />
          <Handle id="s-right" type="source" position={Position.Right} className="w-3 h-3 bg-slate-900 rounded-full border-2 border-white" />
          <Handle id="s-bottom" type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-900 rounded-full border-2 border-white" />
          <Handle id="t-left" type="target" position={Position.Left} className="w-3 h-3 bg-slate-900 rounded-full border-2 border-white" />
        </>
      )}

      <div className={cn(frameless ? 'select-none grid place-items-center' : 'px-4 py-2 select-none', data.color)}>
        {children ?? data.label}
      </div>
    </div>
  )
})

export default BaseNode
