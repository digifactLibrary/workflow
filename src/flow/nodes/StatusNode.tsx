import NodeLabel from '../NodeLabel'

type StatusNodeProps = {
  id: string
  data?: {
    label?: string
    statusColor?: string
  }
}

export default function StatusNode({ id, data }: StatusNodeProps) {
  const color = data?.statusColor ?? '#22c55e'

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-[13px] leading-snug text-zinc-700 select-none">
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span
          className="absolute h-3 w-3 rounded-full opacity-60 animate-ping"
          style={{ backgroundColor: color }}
        />
        <span className="relative h-3 w-3 rounded-full shadow" style={{ backgroundColor: color }} />
      </span>
      <NodeLabel id={id} value={data?.label} placeholder="Status" />
    </div>
  )
}
