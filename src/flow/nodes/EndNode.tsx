import { Square } from 'lucide-react'
import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function EndNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-full border-2 border-rose-300/70 bg-rose-50"
      data={{ ...data, label: data?.label ?? 'Kết thúc' }}
    >
      <div className="flex items-center gap-2 text-rose-700">
        <Square className="h-4 w-4" />
        <NodeLabel id={id} value={data?.label ?? 'Kết thúc'} className="font-semibold" />
      </div>
    </BaseNode>
  )
}
