import { Separator } from '../components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../components/ui/tooltip'
import { CirclePlay, Square, GitBranch, GitMerge, Diamond } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../state/flowStore'

//

function Item({ type, label, preview }: { type: string; label: string; preview: React.ReactNode }) {
  const { screenToFlowPosition } = useReactFlow()
  const addNode = useFlowStore((s) => s.addNodeFromType)
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify({ type }))
    e.dataTransfer.effectAllowed = 'move'
  }
  const onClick = () => {
    const pos = screenToFlowPosition({ x: 256 + (window.innerWidth - 256) / 2, y: window.innerHeight / 2 })
    // @ts-ignore
    addNode(type as any, pos)
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-3 rounded-md border bg-white/70 p-2 hover:bg-white cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={onDragStart}
            onClick={onClick}
          >
            <div className="grid h-10 w-14 place-items-center">{preview}</div>
            <div className="text-sm font-medium">{label}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>Nhấn để thêm ở giữa • Kéo để thả</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function Palette() {
  return (
    <div className="w-64 shrink-0 border-r bg-card/50 p-3 app-grid-bg">
      <div className="mb-2 text-sm font-semibold opacity-70">Thành phần thuật toán</div>
      <Separator className="mb-3" />
      <div className="grid gap-2">
        <Item
          type="start"
          label="Bắt đầu"
          preview={<div className="h-8 w-8 rounded-full border-2 border-emerald-300 bg-emerald-50 text-emerald-600 grid place-items-center"><CirclePlay className="h-4 w-4"/></div>}
        />
        <Item
          type="process"
          label="Xử lý"
          preview={<div className="h-6 w-12 rounded-lg border-2 border-purple-300 bg-purple-50"/>}
        />
        <Item
          type="decision"
          label="Điều kiện"
          preview={<div className="h-8 w-8 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] border-2 border-amber-300 bg-amber-50 grid place-items-center"><Diamond className="h-4 w-4 text-amber-500"/></div>}
        />
        <Item
          type="split"
          label="Split"
          preview={<div className="h-6 w-12 rounded-md border-2 border-cyan-300 bg-cyan-50 grid place-items-center"><GitBranch className="h-4 w-4 text-cyan-500"/></div>}
        />
        <Item
          type="join"
          label="Join"
          preview={<div className="h-6 w-12 rounded-md border-2 border-sky-300 bg-sky-50 grid place-items-center"><GitMerge className="h-4 w-4 text-sky-500"/></div>}
        />
        <Item
          type="end"
          label="Kết thúc"
          preview={<div className="h-8 w-8 rounded-full border-2 border-rose-300 bg-rose-50 text-rose-600 grid place-items-center"><Square className="h-4 w-4"/></div>}
        />
      </div>
      <Separator className="my-3" />
      <div className="text-xs text-muted-foreground space-y-2">
        <p>Hướng dẫn:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Kéo thả để thêm nhanh</li>
          <li>Nhấn chuột để thêm ở giữa</li>
          <li>Điều kiện: tối đa 2 nhánh (Có/Không)</li>
        </ul>
      </div>
    </div>
  )
}
