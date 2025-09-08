import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export default function DirectionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, data }: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 8 })
  const color = (data as any)?.kind === 'yes' ? '#10b981' : (data as any)?.kind === 'no' ? '#ef4444' : (style as any)?.stroke
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ strokeWidth: 2, stroke: color, ...style }} className="animated" />
      {(data as any)?.label ? (
        <EdgeLabelRenderer>
          <div
            style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'none' }}
            className={`rounded border bg-background/90 px-1.5 py-0.5 text-xs shadow ${ (data as any)?.kind === 'yes' ? 'text-emerald-700 border-emerald-200' : (data as any)?.kind === 'no' ? 'text-rose-700 border-rose-200' : 'text-slate-700' }`}
          >
            {(data as any)?.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
