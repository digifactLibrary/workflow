import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Node,
  type Edge,
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
import GetValueNode from './flow/nodes/GetValueNode'
import SetValueNode from './flow/nodes/SetValueNode'
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
import { useAuthStore } from './state/authStore'
import Login from './components/Login'

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
  condition: ConditionNode,
  trigger: TriggerNode,
  send: SendMessageNode,
  human: HumanNode,
  get: GetValueNode,
  set: SetValueNode,
  and: AndNode,
  or: OrNode,
  comment: CommentNode,
}

const edgeTypes: EdgeTypes = { dir: DirectionEdge }

export default function App() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const bootstrapAuth = useAuthStore((s) => s.bootstrap)
  const showDashboard = useWorkspaceStore((s) => s.ui.showDashboard)
  const showPalette = useWorkspaceStore((s) => s.ui.showPalette)
  const showDetailBar = useWorkspaceStore((s) => s.ui.showDetailBar)
  const activeId = useWorkspaceStore((s) => s.activeId)
  const saveActiveFromFlow = useWorkspaceStore((s) => s.saveActiveFromFlow)
  const loadAll = useWorkspaceStore((s) => s.loadAll)
  const loaded = useWorkspaceStore((s) => s.loaded)
  const toggleDetailBar = useWorkspaceStore((s) => s.toggleDetailBar)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const onNodesChange = useFlowStore((s) => s.onNodesChange)
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange)
  const onConnect = useFlowStore((s) => s.onConnect)
  const addNode = useFlowStore((s) => s.addNodeFromType)
  const setSelection = useFlowStore((s) => s.setSelection)
  const autosave = useFlowStore((s) => s.autosave)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    targetType: 'node' | 'edge'
    targetId: string
  } | null>(null)
  const suppressContextMenuCloseRef = useRef(0)
  const hideContextMenu = useCallback(() => {
    suppressContextMenuCloseRef.current = 0
    setContextMenu(null)
  }, [])
  const openContextMenu = useCallback(
    (event: ReactMouseEvent, target: { type: 'node' | 'edge'; id: string }) => {
      event.preventDefault()
      const menuWidth = 200
      const menuHeight = 80
      let x = event.clientX
      let y = event.clientY
      if (typeof window !== 'undefined') {
        const { innerWidth, innerHeight } = window
        if (x + menuWidth > innerWidth) x = Math.max(innerWidth - menuWidth - 8, 8)
        if (y + menuHeight > innerHeight) y = Math.max(innerHeight - menuHeight - 8, 8)
      }
      setContextMenu({ x, y, targetType: target.type, targetId: target.id })
    },
    []
  )
  const handleShowDetails = useCallback(() => {
    if (!contextMenu) return
    toggleDetailBar(true)
    hideContextMenu()
  }, [contextMenu, toggleDetailBar, hideContextMenu])
  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      suppressContextMenuCloseRef.current = Date.now()
      setSelection({ nodeIds: [node.id], edgeIds: [] })
      openContextMenu(event, { type: 'node', id: node.id })
    },
    [openContextMenu, setSelection]
  )
  const handleEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: Edge) => {
      suppressContextMenuCloseRef.current = Date.now()
      setSelection({ nodeIds: [], edgeIds: [edge.id] })
      openContextMenu(event, { type: 'edge', id: edge.id })
    },
    [openContextMenu, setSelection]
  )

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
    // Bootstrap auth session once
    bootstrapAuth()
  }, [bootstrapAuth])

  // Initial load of diagrams from DB once authed
  useEffect(() => {
    if (!isAuthed) return
    if (!loaded) {
      loadAll()
    }
  }, [isAuthed, loaded, loadAll])

  // Sync to workspace when autosave is on and active diagram exists
  useEffect(() => {
    if (!autosave || !activeId) return
    saveActiveFromFlow()
  }, [nodes, edges, autosave, activeId, saveActiveFromFlow])

  if (!isAuthed) {
    return <Login />
  }

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
            onNodeDoubleClick={(_, node) => {
              setSelection({ nodeIds: [node.id], edgeIds: [] })
              hideContextMenu()
            }}
            onEdgeDoubleClick={(_, edge) => {
              setSelection({ nodeIds: [], edgeIds: [edge.id] })
              hideContextMenu()
            }}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            onPaneClick={() => {
              toggleDetailBar(false)
              hideContextMenu()
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            connectionRadius={28}
            selectionOnDrag
            panOnDrag={[1, 2]}
            selectionMode={SelectionMode.Partial}
            fitView
            proOptions={{ hideAttribution: true }}
            onSelectionChange={(params) => {
              const timestamp = suppressContextMenuCloseRef.current
              suppressContextMenuCloseRef.current = 0
              const skipHide = timestamp !== 0 && Date.now() - timestamp < 100
              if (!skipHide) {
                hideContextMenu()
              }
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
          {showDetailBar ? <DetailBar /> : null}
        </div>
      </div>
      {contextMenu ? (
        <div
          className="fixed inset-0 z-50"
          onClick={hideContextMenu}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="absolute z-50 w-56 rounded-md border border-border bg-background text-sm shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center px-3 py-2 text-left hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation()
                handleShowDetails()
              }}
            >
              Chỉnh sửa chi tiết
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
