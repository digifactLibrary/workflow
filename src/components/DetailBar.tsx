import { useEffect, useMemo, useRef, useState } from 'react'
import { useFlowStore } from '../state/flowStore'
import { Input } from './ui/input'
import { Separator } from './ui/separator'

export function DetailBar() {
  const selection = useFlowStore((s) => s.selection)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData)

  const selectedNode = useMemo(() => (selection.nodeIds.length === 1 ? nodes.find((n) => n.id === selection.nodeIds[0]) : undefined), [selection, nodes])
  const selectedEdge = useMemo(() => (selection.edgeIds.length === 1 && selection.nodeIds.length === 0 ? edges.find((e) => e.id === selection.edgeIds[0]) : undefined), [selection, edges])

  const [labelDraft, setLabelDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedNode) setLabelDraft((selectedNode.data as any)?.label ?? '')
    else if (selectedEdge) setLabelDraft((selectedEdge.data as any)?.label ?? '')
    else setLabelDraft('')
  }, [selectedNode, selectedEdge])

  useEffect(() => {
    // autofocus when appearing
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [selectedNode?.id, selectedEdge?.id])

  const commit = () => {
    const v = labelDraft.trim()
    if (selectedNode) updateNodeData(selectedNode.id, { label: v })
    if (selectedEdge) updateEdgeData(selectedEdge.id, { label: v })
  }

  if (!selectedNode && !selectedEdge) return null

  const title = selectedNode ? `Node: ${selectedNode.type}` : 'Edge'

  return (
    <div className="w-80 shrink-0 border-l bg-card/60 backdrop-blur p-3 h-full overflow-y-auto">
      <div className="text-sm font-semibold opacity-80">Chi tiết</div>
      <div className="text-xs text-muted-foreground">{title}</div>
      <Separator className="my-3" />

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Nhãn (Label)</label>
        <Input
          ref={inputRef}
          value={labelDraft}
          placeholder={selectedNode ? 'Tên node' : 'Tên nhãn cho liên kết'}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              if (selectedNode) setLabelDraft((selectedNode.data as any)?.label ?? '')
              if (selectedEdge) setLabelDraft((selectedEdge.data as any)?.label ?? '')
            }
          }}
        />
      </div>

      {selectedEdge ? (
        <div className="mt-4 text-xs text-muted-foreground">
          Gợi ý: Với nhánh Yes/No bạn có thể đặt nhãn như "Có" hoặc "Không".
        </div>
      ) : null}
    </div>
  )
}

export default DetailBar

