import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  MarkerType,
  type Edge,
} from '@xyflow/react'
import type { AlgoNode, AlgoEdge, AlgoNodeType, AlgoNodeData } from '../flow/types'
// import { autoPositions } from '../flow/types'

type Diagram = { nodes: AlgoNode[]; edges: AlgoEdge[] }

type HistoryStack = {
  past: Diagram[]
  future: Diagram[]
  pending: Diagram | null
}

const HISTORY_LIMIT = 100

function cloneDiagram(diagram: Diagram): Diagram {
  const structured = (globalThis as any)?.structuredClone
  if (typeof structured === 'function') {
    return structured(diagram)
  }
  return JSON.parse(JSON.stringify(diagram)) as Diagram
}

function captureDiagram(source: { nodes: AlgoNode[]; edges: AlgoEdge[] }): Diagram {
  return cloneDiagram({ nodes: source.nodes, edges: source.edges })
}

function pushPast(
  history: HistoryStack,
  snapshot: Diagram,
  options: { clearFuture?: boolean; clone?: boolean } = {}
): void {
  const { clearFuture = true, clone: shouldClone = true } = options
  const entry = shouldClone ? cloneDiagram(snapshot) : snapshot
  history.past.push(entry)
  if (history.past.length > HISTORY_LIMIT) {
    history.past.splice(0, history.past.length - HISTORY_LIMIT)
  }
  if (clearFuture) {
    history.future.length = 0
  }
}

function pushFuture(history: HistoryStack, snapshot: Diagram, options: { clone?: boolean } = {}): void {
  const { clone: shouldClone = true } = options
  const entry = shouldClone ? cloneDiagram(snapshot) : snapshot
  history.future.push(entry)
  if (history.future.length > HISTORY_LIMIT) {
    history.future.splice(0, history.future.length - HISTORY_LIMIT)
  }
}

function flushPending(history: HistoryStack): void {
  if (history.pending) {
    pushPast(history, history.pending, { clone: false })
    history.pending = null
  }
}

type FlowState = Diagram & {
  rfInstanceReady: boolean
  autosave: boolean
  selection: { nodeIds: string[]; edgeIds: string[] }
  history: HistoryStack
  editingNodeId?: string
  setDiagram: (d: Diagram, push?: boolean) => void
  pushHistory: (d?: Diagram) => void
  undo: () => void
  redo: () => void
  clear: () => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNodeFromType: (t: AlgoNodeType, pos: { x: number; y: number }) => void
  addTemplate: (name: 'linear' | 'ifElse' | 'parallel', at: { x: number; y: number }) => void
  deleteSelection: () => void
  setSelection: (sel: FlowState['selection']) => void
  setEditingNode: (id?: string) => void
  setAutosave: (v: boolean) => void
  updateNodeData: (id: string, data: Partial<AlgoNodeData>) => void
  updateEdgeData: (id: string, data: Record<string, any>) => void
}

const initial: Diagram = { nodes: [], edges: [] }

export const useFlowStore = create<FlowState>()(
  (set) => ({
      ...initial,
      rfInstanceReady: false,
      autosave: true,
      selection: { nodeIds: [], edgeIds: [] },
      history: { past: [], future: [], pending: null },
      editingNodeId: undefined,

      setDiagram: (d, push = true) => set((s) => {
        // migrate any legacy 'b-*' handle ids (temporary from a previous build)
        const migrateHandle = (h?: string | null, kind: 'source' | 'target' = 'source') => {
          if (!h) return h as any
          if (h.startsWith('b-')) {
            return (kind === 'source' ? 's-' : 't-') + h.slice(2)
          }
          return h
        }
        const next = {
          nodes: d.nodes,
          edges: (d.edges || []).map((edgeRaw: any) => {
            const e = { ...edgeRaw }
            e.sourceHandle = migrateHandle(e.sourceHandle, 'source')
            e.targetHandle = migrateHandle(e.targetHandle, 'target')
            const sh = String(e.sourceHandle || '')
            const th = String(e.targetHandle || '')
            if (sh.startsWith('t-') || th.startsWith('s-')) {
              const s = e.source
              const sh2 = e.sourceHandle
              e.source = e.target
              e.sourceHandle = e.targetHandle
              e.target = s
              e.targetHandle = sh2
            }
            if (!e.markerEnd) { e.markerEnd = { type: MarkerType.ArrowClosed } }
            return e
          }),
        }
        if (push) {
          flushPending(s.history)
          pushPast(s.history, captureDiagram(s), { clone: false })
        } else {
          s.history = { past: [], future: [], pending: null }
        }
        return { ...next, editingNodeId: undefined }
      }),

      pushHistory: (d) => set((s) => {
        flushPending(s.history)
        const snapshot = d ? cloneDiagram(d) : captureDiagram(s)
        pushPast(s.history, snapshot, { clone: false })
        return {}
      }),

      undo: () => set((s) => {
        flushPending(s.history)
        const prev = s.history.past.pop()
        if (!prev) return {}
        const current = captureDiagram(s)
        pushFuture(s.history, current, { clone: false })
        const snapshot = cloneDiagram(prev)
        return { nodes: snapshot.nodes, edges: snapshot.edges, selection: { nodeIds: [], edgeIds: [] }, editingNodeId: undefined }
      }),

      redo: () => set((s) => {
        const next = s.history.future.pop()
        if (!next) return {}
        const current = captureDiagram(s)
        pushPast(s.history, current, { clearFuture: false, clone: false })
        const snapshot = cloneDiagram(next)
        return { nodes: snapshot.nodes, edges: snapshot.edges, selection: { nodeIds: [], edgeIds: [] }, editingNodeId: undefined }
      }),

      clear: () => set({ ...initial, history: { past: [], future: [], pending: null }, editingNodeId: undefined }),

      onNodesChange: (changes) => set((s) => {
        const nodes = applyNodeChanges(changes as any, s.nodes as any) as unknown as AlgoNode[]
        if (!changes.length) {
          return { nodes }
        }
        const meaningful = changes.filter((change: any) => change.type !== 'select')
        if (!meaningful.length) {
          return { nodes }
        }
        const prev = captureDiagram(s)
        const isContinuous = meaningful.some((change: any) => (
          (change.type === 'position' && change.dragging === true) ||
          (change.type === 'dimensions' && change.resizing === true)
        ))
        if (isContinuous) {
          if (!s.history.pending) {
            s.history.pending = prev
          }
          return { nodes }
        }
        const snapshot = s.history.pending ?? prev
        s.history.pending = null
        pushPast(s.history, snapshot, { clone: false })
        return { nodes }
      }),

      onEdgesChange: (changes) => set((s) => {
        const edges = applyEdgeChanges(changes as any, s.edges as any) as unknown as AlgoEdge[]
        if (!changes.length) {
          return { edges }
        }
        const meaningful = changes.filter((change: any) => change.type !== 'select')
        if (!meaningful.length) {
          return { edges }
        }
        flushPending(s.history)
        const prev = captureDiagram(s)
        pushPast(s.history, prev, { clone: false })
        return { edges }
      }),

      onConnect: (connection) => set((s) => {
        // Normalize: if user starts from a target handle or drops on a source handle,
        // swap so edges always go source(s-*) -> target(t-*)
        const normalize = (c: any) => {
          const sh = String(c?.sourceHandle || '')
          const th = String(c?.targetHandle || '')
          if (sh.startsWith('t-') || th.startsWith('s-')) {
            return { ...c, source: c.target, target: c.source, sourceHandle: c.targetHandle, targetHandle: c.sourceHandle }
          }
          return c
        }
        const conn = normalize(connection)
        const src = s.nodes.find((n) => n.id === conn.source)
        let edgeData: any = {}
        let style: any = {}
        if (src?.type === 'decision') {
          // Limit to max 2 outgoing edges: first = Yes, second = No
          const outgoing = s.edges.filter((e) => e.source === src.id)
          if (outgoing.length >= 2) {
            // refuse adding more than 2
            return {}
          }
          if (outgoing.length === 0) {
            edgeData = { label: 'Có', kind: 'yes' }
            style = { stroke: '#10b981' }
          } else {
            const firstKind = (outgoing[0].data as any)?.kind === 'no' ? 'no' : 'yes'
            const nextKind = firstKind === 'yes' ? 'no' : 'yes'
            if (nextKind === 'yes') {
              edgeData = { label: 'Có', kind: 'yes' }
              style = { stroke: '#10b981' }
            } else {
              edgeData = { label: 'Không', kind: 'no' }
              style = { stroke: '#ef4444' }
            }
          }
        }
        const edge: Edge = {
          ...conn,
          id: `${conn.source}-${conn.target}-${Date.now()}`,
          type: 'dir',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          data: edgeData,
          style,
        } as Edge
        flushPending(s.history)
        const prev = captureDiagram(s)
        const edges = addEdge(edge as any, s.edges as any) as unknown as AlgoEdge[]
        pushPast(s.history, prev, { clone: false })
        return { edges }
      }),

      addNodeFromType: (t, pos) => set((s) => {
        const id = `${t}-${Math.round(Math.random() * 1e6)}`
        const defaults: any = {
          start: { data: { label: 'Bắt đầu' }, width: 140, height: 48 },
          end: { data: { label: 'Kết thúc' }, width: 140, height: 48 },
          process: { data: { label: 'Xử lý' }, width: 180, height: 56 },
          decision: { data: { label: 'Kiểm tra' }, width: 180, height: 120 },
          split: { data: { label: 'and' }, width: 120, height: 48 },
          join: { data: { label: 'or' }, width: 120, height: 48 },
        }
        const node: AlgoNode = {
          id,
          type: t,
          position: pos,
          ...(((defaults as any)[t]) ?? (
            t === 'trigger' ? { data: { label: 'Trigger' }, width: 180, height: 56 } :
            t === 'send' ? { data: { label: 'Send Message' }, width: 200, height: 56 } :
            t === 'human' ? { data: { label: 'Human' }, width: 180, height: 56 } :
            t === 'condition' ? { data: { label: 'Condition' }, width: 180, height: 120 } :
            t === 'get' ? { data: { label: 'Get Value' }, width: 200, height: 56 } :
            t === 'set' ? { data: { label: 'Set Value' }, width: 200, height: 56 } :
            t === 'and' ? { data: { label: 'AND' }, width: 48, height: 24 } :
            t === 'or' ? { data: { label: 'OR' }, width: 48, height: 24 } :
            t === 'comment' ? { data: { label: 'Comment' } } :
            t === 'status'
              ? {
                  data: {
                    label: 'Status',
                    statusColor: '#22c55e',
                    statusInputSource: 'api',
                    statusApiMethod: 'GET',
                    statusApiUrl: '',
                    statusApiHeaders: '',
                    statusApiBody: '',
                    statusDbConnection: '',
                    statusDbQuery: '',
                    statusDbParams: '',
                  },
                }
              :
            { data: { label: String(t).toUpperCase() } }
          )),
        } as AlgoNode
        if (t === 'start' || t === 'end') {
          ;(node as any).width = 32
          ;(node as any).height = 32
        }
        if (t === 'and' || t === 'or') {
          ;(node as any).width = 48
          ;(node as any).height = 24
        }
        flushPending(s.history)
        const prev = captureDiagram(s)
        pushPast(s.history, prev, { clone: false })
        return { nodes: [...s.nodes, node] }
      }),

      addTemplate: (name, at) => set((s) => {
        const id = (p: string) => `${p}-${Math.round(Math.random() * 1e9)}`
        const nodes: AlgoNode[] = []
        const edges: AlgoEdge[] = []

        const add = (type: AlgoNodeType, dx: number, dy: number, data?: any, size?: { w?: number; h?: number }) => {
          const n: AlgoNode = {
            id: id(type),
            type,
            position: { x: at.x + dx, y: at.y + dy },
            data: { label: data?.label ?? '' },
            width: size?.w,
            height: size?.h,
          } as any
          nodes.push(n)
          return n
        }
        const link = (src: AlgoNode, tgt: AlgoNode, opts?: any) => {
          const e: any = {
            id: id('e'),
            source: src.id,
            target: tgt.id,
            type: 'dir',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            ...opts,
          }
          edges.push(e)
          return e
        }

        if (name === 'linear') {
          const s0 = add('start', 0, 0, { label: 'Bắt đầu' })
          const p1 = add('send', 200, 0, { label: 'Xử lý' })
          const e1 = add('end', 400, 0, { label: 'Kết thúc' })
          link(s0, p1)
          link(p1, e1)
        }
        if (name === 'ifElse') {
          const s0 = add('start', 0, 0, { label: 'Bắt đầu' })
          const p1 = add('trigger', 200, 0, { label: 'Nhập dữ liệu' })
          const d2 = add('decision', 420, -40, { label: 'Điều kiện?' }, { h: 100 })
          const pY = add('send', 640, -120, { label: 'Nhánh Có' })
          const pN = add('send', 640, 40, { label: 'Nhánh Không' })
          const e3 = add('end', 860, -40, { label: 'Kết thúc' })
          link(s0, p1)
          link(p1, d2)
          link(d2, pY, { data: { label: 'Có', kind: 'yes' }, style: { stroke: '#10b981' } })
          link(d2, pN, { data: { label: 'Không', kind: 'no' }, style: { stroke: '#ef4444' } })
          link(pY, e3)
          link(pN, e3)
        }
        if (name === 'parallel') {
          const s0 = add('start', 0, 0, { label: 'Bắt đầu' })
          const sp = add('and', 220, 0, { label: 'and' })
          const pa = add('send', 440, -80, { label: 'Nhánh A' })
          const pb = add('send', 440, 80, { label: 'Nhánh B' })
          const jn = add('or', 660, 0, { label: 'or' })
          const e3 = add('end', 880, 0, { label: 'Kết thúc' })
          link(s0, sp)
          link(sp, pa)
          link(sp, pb)
          link(pa, jn)
          link(pb, jn)
          link(jn, e3)
        }

        flushPending(s.history)
        const prev = captureDiagram(s)
        pushPast(s.history, prev, { clone: false })
        return { nodes: [...s.nodes, ...nodes], edges: [...s.edges, ...edges] }
      }),

      updateNodeData: (id, data) => set((s) => {
        flushPending(s.history)
        const prev = captureDiagram(s)
        const nodes = s.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...(n.data as any), ...data } } as AlgoNode) : n))
        pushPast(s.history, prev, { clone: false })
        return { nodes }
      }),

      updateEdgeData: (id, data) => set((s) => {
        flushPending(s.history)
        const prev = captureDiagram(s)
        const edges = s.edges.map((e) => (e.id === id ? ({ ...e, data: { ...((e.data as any) || {}), ...data } } as AlgoEdge) : e))
        pushPast(s.history, prev, { clone: false })
        return { edges }
      }),

      deleteSelection: () => set((s) => {
        const { nodeIds, edgeIds } = s.selection
        if (nodeIds.length === 0 && edgeIds.length === 0) return {}
        flushPending(s.history)
        const prev = captureDiagram(s)
        const nodes = s.nodes.filter((n) => !nodeIds.includes(n.id))
        const edges = s.edges.filter((e) => !edgeIds.includes(e.id) && !nodeIds.includes(e.source) && !nodeIds.includes(e.target))
        pushPast(s.history, prev, { clone: false })
        const editingNodeId = s.editingNodeId && nodeIds.includes(s.editingNodeId) ? undefined : s.editingNodeId
        return { nodes, edges, selection: { nodeIds: [], edgeIds: [] }, editingNodeId }
      }),

      setSelection: (sel) => set((s) => {
        const editingNodeId = s.editingNodeId
        const keepEditing = editingNodeId ? sel.nodeIds.includes(editingNodeId) : false
        return { selection: sel, editingNodeId: keepEditing ? editingNodeId : undefined }
      }),
      setEditingNode: (id) => set({ editingNodeId: id }),

      setAutosave: (v) => set({ autosave: v }),
    })
)
