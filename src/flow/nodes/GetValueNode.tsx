import { Download } from 'lucide-react'
import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function GetValueNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-xl border-2 border-emerald-400/70 bg-emerald-50/90"
      data={{ ...data, label: data?.label ?? 'Get Value' }}
      ports={{ top: 'both', right: 'both', bottom: 'both', left: 'both' }}
    >
      <div className="text-emerald-700 font-semibold flex items-center gap-2">
        <Download className="h-4 w-4" />
        <NodeLabel id={id} value={data?.label ?? 'Get Value'} />
      </div>
    </BaseNode>
  )
}

