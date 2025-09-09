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
import { SelectionMode } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './index.css'

import StartNode from './flow/nodes/StartNode'
import EndNode from './flow/nodes/EndNode'
import DecisionNode from './flow/nodes/DecisionNode'
import ConditionNode from './flow/nodes/ConditionNode'
import TriggerNode from './flow/nodes/TriggerNode'
import SendMessageNode from './flow/nodes/SendMessageNode'
import HumanNode from './flow/nodes/HumanNode'
import AndNode from './flow/nodes/AndNode'
import OrNode from './flow/nodes/OrNode'
import CommentNode from './flow/nodes/CommentNode'
import DirectionEdge from './flow/edges/DirectionEdge'
import { Palette } from './flow/palette'
import { Topbar } from './components/Topbar'
import { DetailBar } from './components/DetailBar'
import { useFlowStore } from './state/flowStore'
import { useWorkspaceStore } from './state/workspaceStore'
import { Dashboard } from './components/Dashboard'

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
  condition: ConditionNode,
  trigger: TriggerNode,
  send: SendMessageNode,
  human: HumanNode,
  and: AndNode,
  or: OrNode,
  comment: CommentNode,
}

const edgeTypes: EdgeTypes = { dir: DirectionEdge }

export default function App() {
  const showDashboard = useWorkspaceStore((s) => s.ui.showDashboard)
  const showPalette = useWorkspaceStore((s) => s.ui.showPalette)
  const activeId = useWorkspaceStore((s) => s.activeId)
  const saveActiveFromFlow = useWorkspaceStore((s) => s.saveActiveFromFlow)
  const loadAll = useWorkspaceStore((s) => s.loadAll)
  const loaded = useWorkspaceStore((s) => s.loaded)
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

  // Removed: Add Node button from Topbar; inline rename is used instead

  // Initial load of diagrams from DB
  useEffect(() => {
    if (!loaded) {
      loadAll()
    }
  }, [loaded, loadAll])

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
      {showPalette && <Palette />}
      <div className="flex-1 flex flex-col">
        <Topbar />
        <div className="flex-1 flex">
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
            selectionOnDrag
            panOnDrag={[1, 2]}
            selectionMode={SelectionMode.Partial}
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
          <DetailBar />
        </div>
      </div>
    </div>
  )
}
