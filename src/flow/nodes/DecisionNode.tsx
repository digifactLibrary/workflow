import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function DecisionNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="border-2 border-amber-400/80 bg-amber-50 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]"
      data={{ ...data, label: data?.label ?? 'Decision' }}
    >
      <div className="text-amber-700 font-semibold text-center px-8 py-4">
        <NodeLabel id={id} value={data?.label ?? 'Decision'} />
      </div>
    </BaseNode>
  )
}

