import BaseNode from './BaseNode'
import { SquaresIntersect } from 'lucide-react'

export default function AndNode(props: any) {
  const { data } = props
  return (
    <BaseNode
      {...props}
      className=""
      data={{ ...data, label: data?.label ?? 'AND' }}
      hideResizer
      frameless
      ports={{ top: 'both', right: 'both', bottom: 'both', left: 'both' }}
    >
      <div className="h-6 w-12 rounded-md border-2 border-emerald-400 bg-emerald-50 grid place-items-center text-emerald-700">
        <SquaresIntersect className="h-4 w-4" />
      </div>
    </BaseNode>
  )
}

