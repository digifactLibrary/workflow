import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  create: (name?: string, initial?: DiagramData) => string
  open: (id: string) => void
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  duplicate: (id: string) => string
  saveActiveFromFlow: () => void
  toggleDashboard: (v?: boolean) => void
}

const now = () => Date.now()
const genId = () => `d_${now()}_${Math.round(Math.random() * 1e6)}`

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      diagrams: {},
      order: [],
      activeId: undefined,
      ui: { showDashboard: true },

      create: (name = 'Sơ đồ mới', initial = { nodes: [], edges: [] }) => {
        const id = genId()
        const t = now()
        const d: DiagramMeta = { id, name, createdAt: t, updatedAt: t, data: initial }
        set((s) => ({
          diagrams: { ...s.diagrams, [id]: d },
          order: [id, ...s.order],
          activeId: id,
          ui: { ...s.ui, showDashboard: false },
        }))
        // Load into editor
        useFlowStore.getState().setDiagram(initial, false)
        return id
      },

      open: (id) => {
        const d = get().diagrams[id]
        if (!d) return
        set((s) => ({ activeId: id, ui: { ...s.ui, showDashboard: false } }))
        useFlowStore.getState().setDiagram(d.data, false)
      },

      rename: (id, name) =>
        set((s) => {
          const d = s.diagrams[id]
          if (!d) return {}
          return { diagrams: { ...s.diagrams, [id]: { ...d, name, updatedAt: now() } } }
        }),

      remove: (id) =>
        set((s) => {
          if (!s.diagrams[id]) return {}
          const { [id]: _, ...rest } = s.diagrams
          const order = s.order.filter((x) => x !== id)
          const nextActive = s.activeId === id ? order[0] : s.activeId
          // If no more diagrams, return to dashboard
          const showDashboard = order.length === 0 ? true : s.ui.showDashboard
          if (nextActive && rest[nextActive]) {
            // Load next active into editor
            useFlowStore.getState().setDiagram(rest[nextActive].data, false)
          } else if (s.activeId === id) {
            // Clearing editor when nothing active
            useFlowStore.getState().clear()
          }
          return { diagrams: rest, order, activeId: nextActive, ui: { ...s.ui, showDashboard } }
        }),

      duplicate: (id) => {
        const src = get().diagrams[id]
        if (!src) return ''
        const clone = JSON.parse(JSON.stringify(src.data)) as DiagramData
        const newName = `${src.name} - bản sao`
        return get().create(newName, clone)
      },

      saveActiveFromFlow: () => {
        const { activeId, diagrams } = get()
        if (!activeId || !diagrams[activeId]) return
        const { nodes, edges } = useFlowStore.getState()
        const updated: DiagramMeta = {
          ...diagrams[activeId],
          updatedAt: now(),
          data: { nodes, edges },
        }
        set((s) => ({ diagrams: { ...s.diagrams, [activeId]: updated } }))
      },

      toggleDashboard: (v) => set((s) => ({ ui: { ...s.ui, showDashboard: typeof v === 'boolean' ? v : !s.ui.showDashboard } })),
    }),
    { name: 'xyflow-workspace-v1' }
  )
)
