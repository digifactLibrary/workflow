import BaseNode from './BaseNode'
import { SplitSquareHorizontal } from 'lucide-react'

export default function OrNode(props: any) {
  const { data } = props
  return (
    <BaseNode
      {...props}
      className=""
      data={{ ...data, label: data?.label ?? 'OR' }}
      hideResizer
      frameless
      ports={{ top: 'both', right: 'both', bottom: 'both', left: 'both' }}
    >
      <div className="h-6 w-12 rounded-md border-2 border-orange-400 bg-orange-50 grid place-items-center text-orange-700">
        <SplitSquareHorizontal className="h-4 w-4" />
      </div>
    </BaseNode>
  )
}

