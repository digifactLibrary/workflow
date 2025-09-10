import { User } from 'lucide-react'
import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function HumanNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-xl border-2 border-sky-400/70 bg-sky-50/90"
      data={{ ...data, label: data?.label ?? 'Human' }}
      ports={{ top: 'both', right: 'both', bottom: 'both', left: 'both' }}
    >
      <div className="text-sky-700 font-semibold flex items-center gap-2">
        <User className="h-4 w-4" />
        <NodeLabel id={id} value={data?.label ?? 'Human'} />
      </div>
    </BaseNode>
  )
}

