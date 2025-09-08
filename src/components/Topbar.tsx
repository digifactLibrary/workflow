import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { useHotkeys } from 'react-hotkeys-hook'
import { useFlowStore } from '../state/flowStore'
import { Plus, Undo2, Redo2, Trash2, Upload, Download, LayoutGrid } from 'lucide-react'
import { Switch } from './ui/switch'
import { useRef } from 'react'
import { useWorkspaceStore } from '../state/workspaceStore'

export function Topbar({ onAddAtCenter }: { onAddAtCenter: () => void }) {
  const toggleDashboard = useWorkspaceStore((s) => s.toggleDashboard)
  const undo = useFlowStore((s) => s.undo)
  const redo = useFlowStore((s) => s.redo)
  const del = useFlowStore((s) => s.deleteSelection)
  const autosave = useFlowStore((s) => s.autosave)
  const setAutosave = useFlowStore((s) => s.setAutosave)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)

  const fileRef = useRef<HTMLInputElement>(null)

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
      <div className="mx-auto flex h-12 items-center gap-2 px-3">
        <Button onClick={() => toggleDashboard(true)} size="sm" variant="outline">
          <LayoutGrid className="mr-2 h-4 w-4" /> Sơ đồ
        </Button>
        <Button onClick={onAddAtCenter} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Node
        </Button>
        <Button onClick={del} size="sm" variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
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
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Autosave</span>
          <Switch checked={autosave} onCheckedChange={(v) => setAutosave(!!v)} />
        </div>
      </div>
    </div>
  )
}
