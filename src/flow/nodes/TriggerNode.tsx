import { Bolt } from 'lucide-react'
import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function TriggerNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-xl border-2 border-blue-400/70 bg-blue-50/90"
      data={{ ...data, label: data?.label ?? 'Trigger' }}
    >
      <div className="text-blue-700 font-semibold flex items-center gap-2">
        <Bolt className="h-4 w-4" />
        <NodeLabel id={id} value={data?.label ?? 'Trigger'} />
      </div>
    </BaseNode>
  )
}
