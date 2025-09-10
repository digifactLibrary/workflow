import { Upload } from 'lucide-react'
import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function SetValueNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-xl border-2 border-fuchsia-400/70 bg-fuchsia-50/90"
      data={{ ...data, label: data?.label ?? 'Set Value' }}
    >
      <div className="text-fuchsia-700 font-semibold flex items-center gap-2">
        <Upload className="h-4 w-4" />
        <NodeLabel id={id} value={data?.label ?? 'Set Value'} />
      </div>
    </BaseNode>
  )
}

