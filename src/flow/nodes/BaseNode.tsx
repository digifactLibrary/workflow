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
  ports?: { top?: 'source' | 'target' | 'both' | null; right?: 'source' | 'target' | 'both' | null; bottom?: 'source' | 'target' | 'both' | null; left?: 'source' | 'target' | 'both' | null }
}

export const BaseNode = memo(({ id, data, selected, className, children, hideHandles, hideResizer, frameless, ports }: BaseProps) => {
  const { deleteElements, addNodes, getNode } = useReactFlow()
  // Default: allow both start/end on all sides
  const p = ports ?? { top: 'both', right: 'both', bottom: 'both', left: 'both' }
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
          {/* Top side */}
          {p.top && (
            <>
              {(p.top === 'source' || p.top === 'both') && (
                <Handle
                  id="s-top"
                  type="source"
                  position={Position.Top}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart
                  isConnectableEnd={false}
                />
              )}
              {(p.top === 'target' || p.top === 'both') && (
                <Handle
                  id="t-top"
                  type="target"
                  position={Position.Top}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart={false}
                  isConnectableEnd
                />
              )}
            </>
          )}

          {/* Right side */}
          {p.right && (
            <>
              {(p.right === 'source' || p.right === 'both') && (
                <Handle
                  id="s-right"
                  type="source"
                  position={Position.Right}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart
                  isConnectableEnd={false}
                />
              )}
              {(p.right === 'target' || p.right === 'both') && (
                <Handle
                  id="t-right"
                  type="target"
                  position={Position.Right}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart={false}
                  isConnectableEnd
                />
              )}
            </>
          )}

          {/* Bottom side */}
          {p.bottom && (
            <>
              {(p.bottom === 'source' || p.bottom === 'both') && (
                <Handle
                  id="s-bottom"
                  type="source"
                  position={Position.Bottom}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart
                  isConnectableEnd={false}
                />
              )}
              {(p.bottom === 'target' || p.bottom === 'both') && (
                <Handle
                  id="t-bottom"
                  type="target"
                  position={Position.Bottom}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart={false}
                  isConnectableEnd
                />
              )}
            </>
          )}

          {/* Left side */}
          {p.left && (
            <>
              {(p.left === 'source' || p.left === 'both') && (
                <Handle
                  id="s-left"
                  type="source"
                  position={Position.Left}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart
                  isConnectableEnd={false}
                />
              )}
              {(p.left === 'target' || p.left === 'both') && (
                <Handle
                  id="t-left"
                  type="target"
                  position={Position.Left}
                  className="w-4 h-4 bg-slate-900 rounded-full border-2 border-white cursor-crosshair"
                  isConnectableStart={false}
                  isConnectableEnd
                />
              )}
            </>
          )}
        </>
      )}

      <div className={cn(frameless ? 'select-none grid place-items-center' : 'px-4 py-2 select-none', data.color)}>
        {children ?? data.label}
      </div>
    </div>
  )
})

export default BaseNode
