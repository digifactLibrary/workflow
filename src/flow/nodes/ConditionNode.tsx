import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

// Free condition (no output constraints)
export default function ConditionNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="border-2 border-teal-400/80 bg-teal-50 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]"
      data={{ ...data, label: data?.label ?? 'Condition' }}
    >
      <div className="text-teal-700 font-semibold text-center px-8 py-4">
        <NodeLabel id={id} value={data?.label ?? 'Condition'} />
      </div>
    </BaseNode>
  )
}
