import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function OrNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-md border-2 border-orange-400/80 bg-orange-50"
      data={{ ...data, label: data?.label ?? 'OR' }}
    >
      <div className="text-orange-700 font-semibold text-center">
        <NodeLabel id={id} value={data?.label} placeholder="OR" />
      </div>
    </BaseNode>
  )
}
