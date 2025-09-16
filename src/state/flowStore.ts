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

type FlowState = Diagram & {
  rfInstanceReady: boolean
  autosave: boolean
  selection: { nodeIds: string[]; edgeIds: string[] }
  history: { past: Diagram[]; future: Diagram[] }
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
      history: { past: [], future: [] },

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
        if (push) s.history.past.push({ nodes: s.nodes, edges: s.edges })
        s.history.future = []
        return next
      }),

      pushHistory: (d) => set((s) => {
        const snapshot = d ?? { nodes: s.nodes, edges: s.edges }
        s.history.past.push(JSON.parse(JSON.stringify(snapshot)))
        s.history.future = []
        return {}
      }),

      undo: () => set((s) => {
        if (s.history.past.length === 0) return {}
        const prev = s.history.past.pop()!
        s.history.future.push({ nodes: s.nodes, edges: s.edges })
        return { nodes: prev.nodes, edges: prev.edges }
      }),

      redo: () => set((s) => {
        const next = s.history.future.pop()
        if (!next) return {}
        s.history.past.push({ nodes: s.nodes, edges: s.edges })
        return { nodes: next.nodes, edges: next.edges }
      }),

      clear: () => set({ ...initial, history: { past: [], future: [] } }),

      onNodesChange: (changes) => set((s) => {
        const prev = { nodes: s.nodes, edges: s.edges }
        const nodes = applyNodeChanges(changes as any, s.nodes as any) as unknown as AlgoNode[]
        s.history.past.push(prev)
        s.history.future = []
        return { nodes }
      }),

      onEdgesChange: (changes) => set((s) => {
        const prev = { nodes: s.nodes, edges: s.edges }
        const edges = applyEdgeChanges(changes as any, s.edges as any) as unknown as AlgoEdge[]
        s.history.past.push(prev)
        s.history.future = []
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
        const prev = { nodes: s.nodes, edges: s.edges }
        const edges = addEdge(edge as any, s.edges as any) as unknown as AlgoEdge[]
        s.history.past.push(prev)
        s.history.future = []
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
        const prev = { nodes: s.nodes, edges: s.edges }
        s.history.past.push(prev)
        s.history.future = []
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

        const prev = { nodes: s.nodes, edges: s.edges }
        s.history.past.push(prev)
        s.history.future = []
        return { nodes: [...s.nodes, ...nodes], edges: [...s.edges, ...edges] }
      }),

      updateNodeData: (id, data) => set((s) => {
        const prev = { nodes: s.nodes, edges: s.edges }
        const nodes = s.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...(n.data as any), ...data } } as AlgoNode) : n))
        s.history.past.push(prev)
        s.history.future = []
        return { nodes }
      }),

      updateEdgeData: (id, data) => set((s) => {
        const prev = { nodes: s.nodes, edges: s.edges }
        const edges = s.edges.map((e) => (e.id === id ? ({ ...e, data: { ...((e.data as any) || {}), ...data } } as AlgoEdge) : e))
        s.history.past.push(prev)
        s.history.future = []
        return { edges }
      }),

      deleteSelection: () => set((s) => {
        const { nodeIds, edgeIds } = s.selection
        if (nodeIds.length === 0 && edgeIds.length === 0) return {}
        const prev = { nodes: s.nodes, edges: s.edges }
        const nodes = s.nodes.filter((n) => !nodeIds.includes(n.id))
        const edges = s.edges.filter((e) => !edgeIds.includes(e.id) && !nodeIds.includes(e.source) && !nodeIds.includes(e.target))
        s.history.past.push(prev)
        s.history.future = []
        return { nodes, edges, selection: { nodeIds: [], edgeIds: [] } }
      }),

      setSelection: (sel) => set({ selection: sel }),

      setAutosave: (v) => set({ autosave: v }),
    })
)

