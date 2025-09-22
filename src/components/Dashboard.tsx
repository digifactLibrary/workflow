import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { useWorkspaceStore } from '../state/workspaceStore'
import { ExternalLink, FolderPlus, Pencil, Trash2, Copy, LogOut, BarChart3, Settings, Search } from 'lucide-react'
import { useAuthStore } from '../state/authStore'
import DashboardSelector from './dashboard/DashboardSelector'

export function Dashboard() {
  const diagrams = useWorkspaceStore((s) => s.diagrams)
  const order = useWorkspaceStore((s) => s.order)
  const create = useWorkspaceStore((s) => s.create)
  const open = useWorkspaceStore((s) => s.open)
  const rename = useWorkspaceStore((s) => s.rename)
  const duplicate = useWorkspaceStore((s) => s.duplicate)
  const remove = useWorkspaceStore((s) => s.remove)
  const logout = useAuthStore((s) => s.logout)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [viewMode, setViewMode] = useState<'classic' | 'advanced'>('classic')
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null)
  const [advancedMode, setAdvancedMode] = useState<'static' | 'statistics' | 'instance'>('static')

  const onStartRename = (id: string, current: string) => {
    setRenamingId(id)
    setRenameValue(current)
  }
  
  const onCommitRename = () => {
    if (renamingId) {
      rename(renamingId, renameValue.trim() || 'Không tên')
      setRenamingId(null)
    }
  }

  const handleDiagramAction = (action: string, diagramId: string) => {
    switch (action) {
      case 'edit':
        open(diagramId)
        break
      case 'statistics':
        setSelectedDiagramId(diagramId)
        setAdvancedMode('statistics')
        setViewMode('advanced')
        break
      case 'track':
        setSelectedDiagramId(diagramId)
        setAdvancedMode('instance')
        setViewMode('advanced')
        break
      default:
        break
    }
  }

  const renderClassicDashboard = () => (
    <div className="mt-6">
      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setViewMode('advanced')}
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Flow Configuration</h3>
              <p className="text-sm text-gray-600">Design and configure workflows</p>
            </div>
          </div>
        </div>

        <div 
          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            setAdvancedMode('statistics')
            setViewMode('advanced')
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Flow Statistics</h3>
              <p className="text-sm text-gray-600">Monitor performance and metrics</p>
            </div>
          </div>
        </div>

        <div 
          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            setAdvancedMode('instance')
            setViewMode('advanced')
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Instance Tracking</h3>
              <p className="text-sm text-gray-600">Track individual instances</p>
            </div>
          </div>
        </div>
      </div>

      {/* Diagrams Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {order.length === 0 && (
          <div className="col-span-full rounded-md border p-6 text-center text-sm text-muted-foreground">
            Chưa có sơ đồ nào. Hãy bấm "Sơ đồ mới" để bắt đầu.
          </div>
        )}
        {order.map((id) => {
          const d = diagrams[id]
          if (!d) return null
          return (
            <div key={id} className="relative flex flex-col rounded-md border bg-card p-4 shadow-sm">
              <Button size="icon" variant="outline" className="absolute right-2 top-2" title="Nhân đôi" onClick={() => duplicate(id)}>
                <Copy className="h-4 w-4" />
              </Button>
              <div className="mb-3">
                {renamingId === id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCommitRename()
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                    <Button size="sm" onClick={onCommitRename}>OK</Button>
                  </div>
                ) : (
                  <div className="line-clamp-1 text-base font-medium" title={d.name}>{d.name}</div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  Cập nhật: {new Date(d.updatedAt).toLocaleString()}
                </div>
              </div>
              
              {/* Enhanced Action Buttons */}
              <div className="mt-auto space-y-2">
                {/* Primary Actions */}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleDiagramAction('edit', id)}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDiagramAction('statistics', id)}
                    title="View Flow Statistics"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDiagramAction('track', id)}
                    title="Track Instances"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Secondary Actions */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onStartRename(id, d.name)}>
                    <Pencil className="mr-2 h-4 w-4" /> Rename
                  </Button>
                  <Button size="sm" variant="destructive" className="ml-auto" onClick={() => remove(id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderAdvancedDashboard = () => (
    <div className="mt-6">
      <DashboardSelector
        initialMode={advancedMode}
        initialDiagramId={selectedDiagramId || undefined}
      />
    </div>
  )

  return (
    <div className="h-screen w-full bg-background">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {viewMode === 'classic' ? 'Dashboard Sơ đồ' : 'Advanced Workflow Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'classic' 
                ? 'Quản lý nhiều sơ đồ (tạo, mở, đổi tên, nhân đôi, xoá)' 
                : 'Monitor, analyze, and track workflow instances'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'advanced' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setViewMode('classic')
                  setSelectedDiagramId(null)
                }}
              >
                ← Back to Classic
              </Button>
            )}
            
            {viewMode === 'classic' && (
              <>
                <Button onClick={() => create()}>
                  <FolderPlus className="mr-2 h-4 w-4" /> Sơ đồ mới
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setViewMode('advanced')}
                >
                  Advanced View
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </div>
        
        <Separator />

        {/* Render based on view mode */}
        {viewMode === 'classic' ? renderClassicDashboard() : renderAdvancedDashboard()}
      </div>
    </div>
  )
}
