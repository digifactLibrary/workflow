import { CirclePlay } from 'lucide-react'
import BaseNode from './BaseNode'
import { cn } from '../../lib/utils'

export default function StartNode(props: any) {
  const { data } = props
  return (
    <BaseNode
      {...props}
      className={cn('')}
      data={{ ...data, label: data?.label ?? 'Start' }}
      hideResizer
      frameless
      ports={{ top: 'source', right: 'source', bottom: 'source', left: 'source' }}
    >
      <div className="h-8 w-8 rounded-full border-2 border-emerald-400 bg-emerald-50 text-emerald-600 grid place-items-center">
        <CirclePlay className="h-4 w-4" />
      </div>
    </BaseNode>
  )
}

