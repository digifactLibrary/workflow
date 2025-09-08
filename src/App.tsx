import { useCallback, useEffect, useRef } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './index.css'

import StartNode from './flow/nodes/StartNode'
import EndNode from './flow/nodes/EndNode'
import ProcessNode from './flow/nodes/ProcessNode'
import DecisionNode from './flow/nodes/DecisionNode'
import SplitNode from './flow/nodes/SplitNode'
import JoinNode from './flow/nodes/JoinNode'
import DirectionEdge from './flow/edges/DirectionEdge'
import { Palette } from './flow/palette'
import { Topbar } from './components/Topbar'
import { useFlowStore } from './state/flowStore'
import { useWorkspaceStore } from './state/workspaceStore'
import { Dashboard } from './components/Dashboard'

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  process: ProcessNode,
  decision: DecisionNode,
  split: SplitNode,
  join: JoinNode,
}

const edgeTypes: EdgeTypes = { dir: DirectionEdge }

export default function App() {
  const showDashboard = useWorkspaceStore((s) => s.ui.showDashboard)
  const activeId = useWorkspaceStore((s) => s.activeId)
  const saveActiveFromFlow = useWorkspaceStore((s) => s.saveActiveFromFlow)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const onNodesChange = useFlowStore((s) => s.onNodesChange)
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange)
  const onConnect = useFlowStore((s) => s.onConnect)
  const addNode = useFlowStore((s) => s.addNodeFromType)
  const setSelection = useFlowStore((s) => s.setSelection)
  const autosave = useFlowStore((s) => s.autosave)

  const { screenToFlowPosition } = useReactFlow()
  const dropRef = useRef<HTMLDivElement>(null)

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const data = event.dataTransfer.getData('application/reactflow')
      if (!data) return
      const { type } = JSON.parse(data)
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode]
  )

  const onAddAtCenter = useCallback(() => {
    const bounds = dropRef.current?.getBoundingClientRect()
    const cx = (bounds?.left ?? 0) + (bounds?.width ?? 0) / 2
    const cy = (bounds?.top ?? 0) + (bounds?.height ?? 0) / 2
    const center = screenToFlowPosition({ x: cx, y: cy })
    addNode('process' as any, center)
  }, [screenToFlowPosition, addNode])

  // Sync to workspace when autosave is on and active diagram exists
  useEffect(() => {
    if (!autosave || !activeId) return
    saveActiveFromFlow()
  }, [nodes, edges, autosave, activeId, saveActiveFromFlow])

  if (showDashboard || !activeId) {
    return <Dashboard />
  }

  return (
    <div className="flex h-screen">
      <Palette />
      <div className="flex-1 flex flex-col">
        <Topbar onAddAtCenter={onAddAtCenter} />
        <div ref={dropRef} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            proOptions={{ hideAttribution: true }}
            onSelectionChange={(params) => {
              setSelection({ nodeIds: params.nodes?.map((n) => n.id) ?? [], edgeIds: params.edges?.map((e) => e.id) ?? [] })
            }}
          >
            <Background color="#e2e8f0" gap={24} />
            <MiniMap zoomable pannable className="!bg-white/70" />
            <Controls />
            <Panel position="top-left" className="m-2 rounded-md border bg-background/80 p-2 shadow">
              <div className="text-xs text-muted-foreground">Kéo thả để thêm node • Nối các điểm handle để tạo liên kết</div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
