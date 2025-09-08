import { Play } from 'lucide-react'
import BaseNode from './BaseNode'
import { cn } from '../../lib/utils'
import NodeLabel from '../NodeLabel'

export default function StartNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className={cn('rounded-full border-2 border-emerald-400/70 bg-emerald-50')}
      data={{ ...data, label: data?.label ?? 'Start' }}
    >
      <div className="flex items-center gap-2 text-emerald-700">
        <Play className="h-4 w-4" />
        <NodeLabel id={id} value={data?.label ?? 'Start'} className="font-semibold bg-transparent" />
      </div>
    </BaseNode>
  )
}

