import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { useHotkeys } from 'react-hotkeys-hook'
import { useFlowStore } from '../state/flowStore'
import { Undo2, Redo2, Upload, Download, LayoutGrid, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Switch } from './ui/switch'
import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '../state/workspaceStore'
import { Input } from './ui/input'

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
  useHotkeys('del, backspace', (e) => { e.preventDefault(); del() }, [del])
  useHotkeys('ctrl+s, cmd+s', (e) => { e.preventDefault(); onExport() }, [nodes, edges])

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
      } catch {}
    }
    reader.readAsText(f)
  }

  return (
    <div className="sticky top-0 z-10 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto relative flex h-12 items-center px-3">
        <Button onClick={() => togglePalette()} size="sm" variant="outline" title={showPalette ? 'Ẩn Object Component' : 'Hiện Object Component'}>
          {showPalette ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />} {showPalette ? 'Hide' : 'Show'}
        </Button>
        {/* Centered diagram title */}
        <div className="absolute left-1/2 -translate-x-1/2">
          {editingName ? (
            <Input
              ref={nameInputRef}
              value={nameDraft}
              className="h-8 w-[240px]"
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
              className="cursor-text rounded px-2 py-1 text-sm font-medium hover:bg-muted"
              onClick={() => setEditingName(true)}
            >
              {diagramName || 'Untitled diagram'}
            </div>
          )}
        </div>
        <Button onClick={() => toggleDashboard(true)} size="sm" variant="outline" className="ml-2">
          <LayoutGrid className="mr-2 h-4 w-4" /> Dashboard
        </Button>
                <div className="ml-auto flex items-center gap-2 text-sm">
          <Separator className="mx-2 h-6 w-px" />
          <Button onClick={undo} size="sm" variant="outline">
            <Undo2 className="mr-2 h-4 w-4" /> Undo
          </Button>
          <Button onClick={redo} size="sm" variant="outline">
            <Redo2 className="mr-2 h-4 w-4" /> Redo
          </Button>
          <Separator className="mx-2 h-6 w-px" />
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Separator className="mx-2 h-6 w-px" />
          <span className="text-muted-foreground">Autosave</span>
          <Switch checked={autosave} onCheckedChange={(v) => setAutosave(!!v)} />
        </div>
      </div>
    </div>
  )
}







