import { Square } from 'lucide-react'
import BaseNode from './BaseNode'

export default function EndNode(props: any) {
  const { data } = props
  return (
    <BaseNode
      {...props}
      className=""
      data={{ ...data, label: data?.label ?? 'End' }}
      hideResizer
      frameless
    >
      <div className="h-8 w-8 rounded-full border-2 border-rose-400 bg-rose-50 text-rose-700 grid place-items-center">
        <Square className="h-4 w-4" />
      </div>
    </BaseNode>
  )
}
