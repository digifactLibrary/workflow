import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function JoinNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-md border-2 border-sky-300/80 bg-sky-50"
      data={{ ...data, label: data?.label ?? 'Join' }}
    >
      <div className="text-sky-700 font-semibold text-center"><NodeLabel id={id} value={data?.label ?? 'Join'} /></div>
    </BaseNode>
  )
}
