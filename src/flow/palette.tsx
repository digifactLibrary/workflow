import { Separator } from '../components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../components/ui/tooltip'
import { CirclePlay, Square, Diamond, Bolt, Send, StickyNote, SquaresIntersect, SplitSquareHorizontal, User, Download, Upload } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../state/flowStore'
import React from 'react'

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
            className="flex items-center gap-3 rounded-md border bg-white/80 p-2 hover:bg-white cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={onDragStart}
            onClick={onClick}
          >
            <div className="grid h-10 w-14 place-items-center">{preview}</div>
            <div className="text-sm font-medium">{label}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>Kéo hoặc bấm để thêm node</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function Palette() {
  return (
    <div className="w-64 shrink-0 border-r bg-card/50 p-3 app-grid-bg">
      <div className="mb-2 text-sm font-semibold opacity-70">Object Component</div>
      <Separator className="mb-3" />
      <div className="grid gap-2">
        <Item
          type="start"
          label="Start"
          preview={<div className="h-8 w-8 rounded-full border-2 border-emerald-400 bg-emerald-50 text-emerald-600 grid place-items-center"><CirclePlay className="h-4 w-4"/></div>}
        />
        <Item
          type="trigger"
          label="Trigger"
          preview={<div className="h-6 w-12 rounded-lg border-2 border-blue-400 bg-blue-50 grid place-items-center text-blue-700"><Bolt className="h-4 w-4"/></div>}
        />
        <Item
          type="send"
          label="Send Message"
          preview={<div className="h-6 w-12 rounded-lg border-2 border-violet-400 bg-violet-50 grid place-items-center text-violet-700"><Send className="h-4 w-4"/></div>}
        />
        <Item
          type="get"
          label="Get Value"
          preview={<div className="h-6 w-12 rounded-lg border-2 border-emerald-400 bg-emerald-50 grid place-items-center text-emerald-700"><Download className="h-4 w-4"/></div>}
        />
        <Item
          type="set"
          label="Set Value"
          preview={<div className="h-6 w-12 rounded-lg border-2 border-fuchsia-400 bg-fuchsia-50 grid place-items-center text-fuchsia-700"><Upload className="h-4 w-4"/></div>}
        />
        <Item
          type="human"
          label="Human"
          preview={<div className="h-6 w-12 rounded-lg border-2 border-sky-400 bg-sky-50 grid place-items-center text-sky-700"><User className="h-4 w-4"/></div>}
        />
        <Item
          type="decision"
          label="Decision (Yes/No)"
          preview={<div className="h-8 w-8 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] border-2 border-amber-400 bg-amber-50 grid place-items-center"><Diamond className="h-4 w-4 text-amber-600"/></div>}
        />
        <Item
          type="condition"
          label="Condition"
          preview={<div className="h-8 w-8 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] border-2 border-teal-400 bg-teal-50"/>}
        />
        <Item
          type="and"
          label="AND"
          preview={<div className="h-6 w-12 rounded-md border-2 border-emerald-400 bg-emerald-50 grid place-items-center text-emerald-700"><SquaresIntersect className="h-4 w-4"/></div>}
        />
        <Item
          type="or"
          label="OR"
          preview={<div className="h-6 w-12 rounded-md border-2 border-orange-400 bg-orange-50 grid place-items-center text-orange-700"><SplitSquareHorizontal className="h-4 w-4"/></div>}
        />
        <Item
          type="comment"
          label="Comment"
          preview={<div className="h-6 w-12 rounded-md border-2 border-yellow-300 bg-yellow-50 grid place-items-center text-yellow-700"><StickyNote className="h-4 w-4"/></div>}
        />
        <Item
          type="end"
          label="End"
          preview={<div className="h-8 w-8 rounded-full border-2 border-rose-400 bg-rose-50 text-rose-700 grid place-items-center"><Square className="h-4 w-4"/></div>}
        />
      </div>
      <Separator className="my-3" />
      <div className="text-xs text-muted-foreground space-y-2">
        <p>Hướng dẫn:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Có thể kéo thả nhanh</li>
          <li>Nhấn chuột để thêm vào giữa</li>
          <li>Decision: tối đa 2 nhánh (Có/Không)</li>
        </ul>
      </div>
    </div>
  )
}
