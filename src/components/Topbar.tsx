import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { useHotkeys } from 'react-hotkeys-hook'
import { useFlowStore } from '../state/flowStore'
import { Undo2, Redo2, Upload, Download, LayoutGrid, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, LogOut } from 'lucide-react'
import { Switch } from './ui/switch'
import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '../state/workspaceStore'
import { Input } from './ui/input'
import { useAuthStore } from '../state/authStore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export function Topbar() {
  const toggleDashboard = useWorkspaceStore((s) => s.toggleDashboard)
  const togglePalette = useWorkspaceStore((s) => s.togglePalette)
  const showPalette = useWorkspaceStore((s) => s.ui.showPalette)
  const activeId = useWorkspaceStore((s) => s.activeId)
  const rename = useWorkspaceStore((s) => s.rename)
  const diagramName = useWorkspaceStore((s) => (s.activeId ? s.diagrams[s.activeId]?.name ?? '' : ''))
  const undo = useFlowStore((s) => s.undo)
  const redo = useFlowStore((s) => s.redo)
  const del = useFlowStore((s) => s.deleteSelection)
  const autosave = useFlowStore((s) => s.autosave)
  const setAutosave = useFlowStore((s) => s.setAutosave)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const logout = useAuthStore((s) => s.logout)
  const showDetailBar = useWorkspaceStore((s) => s.ui.showDetailBar)
  const toggleDetailBar = useWorkspaceStore((s) => s.toggleDetailBar)

  const fileRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(diagramName)

  useEffect(() => {
    setNameDraft(diagramName)
  }, [diagramName])

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [editingName])

  useHotkeys('ctrl+z, cmd+z', (e) => { e.preventDefault(); undo() }, [undo])
  useHotkeys('ctrl+y, cmd+y, ctrl+shift+z, cmd+shift+z', (e) => { e.preventDefault(); redo() }, [redo])
  useHotkeys('delete, del, backspace', (e) => { e.preventDefault(); del() }, [del])
  useHotkeys('ctrl+s, cmd+s', (e) => { e.preventDefault(); onExport() }, [nodes, edges])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleDeleteKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete') return
      const target = event.target
      if (target instanceof HTMLElement) {
        if (target.isContentEditable) return
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        const role = target.getAttribute('role')
        if (role === 'textbox') return
      }
      event.preventDefault()
      del()
    }
    window.addEventListener('keydown', handleDeleteKey)
    return () => {
      window.removeEventListener('keydown', handleDeleteKey)
    }
  }, [del])

  const onExport = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result))
        if (obj.nodes && obj.edges) {
          // replace store directly
          // push to history for undo
          useFlowStore.getState().setDiagram({ nodes: obj.nodes, edges: obj.edges })
        }
      } catch (error) {
        console.error('Failed to parse imported file:', error)
      }
    }
    reader.readAsText(f)
  }

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-10 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 items-center px-3 justify-between">
          {/* Left section - Palette toggle and Dashboard */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => togglePalette()} size="sm" variant="outline">
                  {showPalette ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  <span className="hidden lg:ml-2 lg:block">{showPalette ? 'Hide' : 'Show'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showPalette ? 'Ẩn Object Component' : 'Hiện Object Component'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => toggleDashboard(true)} size="sm" variant="outline">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden lg:ml-2 lg:block">Dashboard</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Dashboard
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Center section - Diagram title */}
          <div className="flex-1 flex justify-center mx-4">
            <div className="max-w-[200px] md:max-w-[300px] lg:max-w-[400px] w-full">
              {editingName ? (
                <Input
                  ref={nameInputRef}
                  value={nameDraft}
                  className="h-8 w-full min-w-[150px]"
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => {
                    if (activeId) rename(activeId, nameDraft.trim() || diagramName)
                    setEditingName(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (activeId) rename(activeId, nameDraft.trim() || diagramName)
                      setEditingName(false)
                    }
                    if (e.key === 'Escape') {
                      setNameDraft(diagramName)
                      setEditingName(false)
                    }
                  }}
                />
              ) : (
                <div
                  role="button"
                  title="Nhấn để sửa tên"
                  className="cursor-text rounded px-2 py-1 text-sm font-medium hover:bg-muted truncate min-w-[150px] text-center"
                  onClick={() => setEditingName(true)}
                >
                  {diagramName || 'Untitled diagram'}
                </div>
              )}
            </div>
          </div>

          {/* Right section - Controls */}
          <div className="flex items-center gap-1 md:gap-2">
            <Separator className="mx-1 md:mx-2 h-6 w-px" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={undo} size="sm" variant="outline">
                  <Undo2 className="h-4 w-4" />
                  <span className="hidden xl:ml-2 xl:block">Undo</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Hoàn tác (Ctrl+Z)
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={redo} size="sm" variant="outline">
                  <Redo2 className="h-4 w-4" />
                  <span className="hidden xl:ml-2 xl:block">Redo</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Làm lại (Ctrl+Y)
              </TooltipContent>
            </Tooltip>

            {/* Detail Bar toggle - placed next to Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => toggleDetailBar()} size="sm" variant="outline">
                  {showDetailBar ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                  <span className="hidden xl:ml-2 xl:block">{showDetailBar ? 'Hide' : 'Show'} Details</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showDetailBar ? 'Ẩn Detail Bar' : 'Hiện Detail Bar'}
              </TooltipContent>
            </Tooltip>

            <Separator className="mx-1 md:mx-2 h-6 w-px" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={onExport}>
                  <Download className="h-4 w-4" />
                  <span className="hidden xl:ml-2 xl:block">Export</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Xuất file (Ctrl+S)
              </TooltipContent>
            </Tooltip>

            <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  <span className="hidden xl:ml-2 xl:block">Import</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Nhập file
              </TooltipContent>
            </Tooltip>

            <Separator className="mx-1 md:mx-2 h-6 w-px" />

            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-muted-foreground text-xs md:text-sm hidden md:block">Autosave</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch checked={autosave} onCheckedChange={(v) => setAutosave(!!v)} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Tự động lưu
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator className="mx-1 md:mx-2 h-6 w-px" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={logout} size="sm" variant="outline">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:ml-2 lg:block">Đăng xuất</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Đăng xuất
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}



