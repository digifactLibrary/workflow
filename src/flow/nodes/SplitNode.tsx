import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function SplitNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-md border-2 border-cyan-300/80 bg-cyan-50"
      data={{ ...data, label: data?.label ?? 'Split' }}
    >
      <div className="text-cyan-700 font-semibold text-center"><NodeLabel id={id} value={data?.label ?? 'Split'} /></div>
    </BaseNode>
  )
}
