import NodeLabel from '../NodeLabel'

// Pure text comment node (no border, no icon, no handles)
export default function CommentNode(props: any) {
  const { data, id } = props
  return (
    <div className="min-w-[24px] min-h-[18px] px-1 py-0.5 text-[13px] leading-snug text-zinc-700">
      <NodeLabel id={id} value={data?.label} placeholder="Comment" />
    </div>
  )
}
