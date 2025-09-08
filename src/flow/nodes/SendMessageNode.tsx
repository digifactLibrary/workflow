import { Send } from 'lucide-react'
import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function SendMessageNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-xl border-2 border-violet-400/70 bg-violet-50/90"
      data={{ ...data, label: data?.label ?? 'Send Message' }}
    >
      <div className="text-violet-700 font-semibold flex items-center gap-2">
        <Send className="h-4 w-4" />
        <NodeLabel id={id} value={data?.label ?? 'Send Message'} />
      </div>
    </BaseNode>
  )
}
