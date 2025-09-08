import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function AndNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-md border-2 border-emerald-400/80 bg-emerald-50"
      data={{ ...data, label: data?.label ?? 'AND' }}
    >
      <div className="text-emerald-700 font-semibold text-center">
        <NodeLabel id={id} value={data?.label} placeholder="AND" />
      </div>
    </BaseNode>
  )
}
