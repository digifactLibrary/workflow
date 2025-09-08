import BaseNode from './BaseNode'
import NodeLabel from '../NodeLabel'

export default function ProcessNode(props: any) {
  const { data, id } = props
  return (
    <BaseNode
      {...props}
      className="rounded-xl border-2 border-purple-300/70 bg-purple-50"
      data={{ ...data, label: data?.label ?? 'Xử lý' }}
    >
      <div className="text-purple-700 font-semibold"><NodeLabel id={id} value={data?.label ?? 'Xử lý'} /></div>
    </BaseNode>
  )
}
