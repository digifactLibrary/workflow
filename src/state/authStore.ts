import { create } from 'zustand'
import { useWorkspaceStore } from './workspaceStore'
import { useFlowStore } from './flowStore'

type User = {
  id: number
  email: string
  name?: string | null
  code?: string | null // manhanvien field
}

type AuthState = {
  user?: User
  isAuthenticated: boolean
  loading: boolean
  error?: string
  bootstrap: () => Promise<void>
  login: (username: string, password: string) => Promise<void> // Changed from email to username
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: undefined,
  isAuthenticated: false,
  loading: false,
  error: undefined,

  bootstrap: async () => {
    try {
      set({ loading: true, error: undefined })
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const u = (await res.json()) as User
        set({ user: u, isAuthenticated: true, loading: false })
      } else {
        set({ user: undefined, isAuthenticated: false, loading: false })
      }
    } catch (e) {
      set({ user: undefined, isAuthenticated: false, loading: false })
    }
  },

  login: async (username: string, password: string) => {
    set({ loading: true, error: undefined })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }), // Changed from email to username
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        set({ loading: false, error: j?.error || 'Đăng nhập thất bại' })
        return
      }
      const u = (await res.json()) as User
      set({ user: u, isAuthenticated: true, loading: false })
    } catch {
      set({ loading: false, error: 'Đăng nhập thất bại' })
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    // Clear client-side state
    try {
      useFlowStore.getState().clear()
      useWorkspaceStore.setState({ diagrams: {}, order: [], activeId: undefined, loaded: false })
    } catch {}
    set({ user: undefined, isAuthenticated: false, error: undefined })
  },
}))
