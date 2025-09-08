import { create } from 'zustand'
import type { AlgoEdge, AlgoNode } from '../flow/types'
import { useFlowStore } from './flowStore'

export type DiagramData = { nodes: AlgoNode[]; edges: AlgoEdge[] }

export type DiagramMeta = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  data: DiagramData
}

type WorkspaceState = {
  diagrams: Record<string, DiagramMeta>
  order: string[]
  activeId?: string
  ui: { showDashboard: boolean }
  loaded: boolean
  loadAll: () => Promise<void>
  create: (name?: string, initial?: DiagramData) => Promise<string>
  open: (id: string) => Promise<void>
  rename: (id: string, name: string) => Promise<void>
  remove: (id: string) => Promise<void>
  duplicate: (id: string) => Promise<string>
  saveActiveFromFlow: () => Promise<void>
  toggleDashboard: (v?: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  diagrams: {},
  order: [],
  activeId: undefined,
  ui: { showDashboard: true },
  loaded: false,

  loadAll: async () => {
    const res = await fetch('/api/diagrams')
    const list = (await res.json()) as Array<{ id: string; name: string; createdAt: string | number; updatedAt: string | number }>
    const diagrams: Record<string, DiagramMeta> = {}
    const order: string[] = []
    list.forEach((d) => {
      const created = typeof d.createdAt === 'string' ? Date.parse(d.createdAt) : (d.createdAt as number)
      const updated = typeof d.updatedAt === 'string' ? Date.parse(d.updatedAt) : (d.updatedAt as number)
      diagrams[d.id] = { id: d.id, name: d.name, createdAt: created, updatedAt: updated, data: { nodes: [], edges: [] } }
      order.push(d.id)
    })
    set({ diagrams, order, loaded: true })
  },

  create: async (name = 'Sơ đồ mới', initial = { nodes: [], edges: [] }) => {
    const res = await fetch('/api/diagrams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: initial }),
    })
    if (!res.ok) throw new Error('Create failed')
    const d = (await res.json()) as { id: string; name: string; createdAt: string | number; updatedAt: string | number }
    const createdAt = typeof d.createdAt === 'string' ? Date.parse(d.createdAt) : (d.createdAt as number)
    const updatedAt = typeof d.updatedAt === 'string' ? Date.parse(d.updatedAt) : (d.updatedAt as number)
    set((s) => ({
      diagrams: { ...s.diagrams, [d.id]: { id: d.id, name: d.name, createdAt, updatedAt, data: initial } },
      order: [d.id, ...s.order],
      activeId: d.id,
      ui: { ...s.ui, showDashboard: false },
    }))
    useFlowStore.getState().setDiagram(initial, false)
    return d.id
  },

  open: async (id) => {
    const res = await fetch(`/api/diagrams/${id}`)
    if (!res.ok) return
    const d = (await res.json()) as { id: string; name: string; createdAt: string | number; updatedAt: string | number; data: DiagramData }
    const createdAt = typeof d.createdAt === 'string' ? Date.parse(d.createdAt) : (d.createdAt as number)
    const updatedAt = typeof d.updatedAt === 'string' ? Date.parse(d.updatedAt) : (d.updatedAt as number)
    set((s) => ({
      diagrams: { ...s.diagrams, [id]: { id, name: d.name, createdAt, updatedAt, data: d.data } },
      activeId: id,
      ui: { ...s.ui, showDashboard: false },
    }))
    useFlowStore.getState().setDiagram(d.data, false)
  },

  rename: async (id, name) => {
    const res = await fetch(`/api/diagrams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return
    const r = (await res.json()) as { updatedAt: string | number; name: string }
    const updatedAt = typeof r.updatedAt === 'string' ? Date.parse(r.updatedAt) : (r.updatedAt as number)
    set((s) => {
      const d = s.diagrams[id]
      if (!d) return {}
      return { diagrams: { ...s.diagrams, [id]: { ...d, name: r.name, updatedAt } } }
    })
  },

  remove: async (id) => {
    const res = await fetch(`/api/diagrams/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    set((s) => {
      if (!s.diagrams[id]) return {}
      const { [id]: _drop, ...rest } = s.diagrams
      const order = s.order.filter((x) => x !== id)
      const nextActive = s.activeId === id ? order[0] : s.activeId
      const showDashboard = order.length === 0 ? true : s.ui.showDashboard
      if (nextActive && rest[nextActive]) {
        useFlowStore.getState().clear()
      } else if (s.activeId === id) {
        useFlowStore.getState().clear()
      }
      return { diagrams: rest, order, activeId: nextActive, ui: { ...s.ui, showDashboard } }
    })
  },

  duplicate: async (id) => {
    const srcRes = await fetch(`/api/diagrams/${id}`)
    if (!srcRes.ok) return ''
    const src = (await srcRes.json()) as { name: string; data: DiagramData }
    const newName = `${src.name} - bản sao`
    return await get().create(newName, src.data)
  },

  saveActiveFromFlow: async () => {
    const { activeId, diagrams } = get()
    if (!activeId || !diagrams[activeId]) return
    const { nodes, edges } = useFlowStore.getState()
    const res = await fetch(`/api/diagrams/${activeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { nodes, edges } }),
    })
    if (!res.ok) return
    const r = (await res.json()) as { updatedAt: string | number }
    const updatedAt = typeof r.updatedAt === 'string' ? Date.parse(r.updatedAt) : (r.updatedAt as number)
    set((s) => ({
      diagrams: {
        ...s.diagrams,
        [activeId]: { ...s.diagrams[activeId]!, updatedAt, data: { nodes, edges } },
      },
    }))
  },

  toggleDashboard: (v) => set((s) => ({ ui: { ...s.ui, showDashboard: typeof v === 'boolean' ? v : !s.ui.showDashboard } })),
}))

