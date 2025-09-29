import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { getDashboardModules, type DashboardModuleSummary } from '../lib/api'
import { useWorkspaceStore } from '../state/workspaceStore'
import { ExternalLink, FolderPlus, Pencil, Trash2, Copy, LogOut, Search, Eye } from 'lucide-react'
import { useAuthStore } from '../state/authStore'
import DashboardSelector from './dashboard/DashboardSelector'
import { useNavigate, useParams } from 'react-router-dom'

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const UNASSIGNED_PATH = 'unassigned'

export function Dashboard() {
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
  const [moduleData, setModuleData] = useState<DashboardModuleSummary[] | null>(null)
  const [moduleLoading, setModuleLoading] = useState(false)
  const [moduleError, setModuleError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const mountedRef = useRef(true)
  const navigate = useNavigate()
  const { modulePath: modulePathParam } = useParams<{ modulePath?: string }>()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const onStartRename = (id: string, current: string) => {
    setRenamingId(id)
    setRenameValue(current)
  }

  const refreshModules = useCallback(async () => {
    try {
      if (!mountedRef.current) return
      setModuleLoading(true)
      setModuleError(null)
      const response = await getDashboardModules()
      if (!mountedRef.current) return
      setModuleData(response.modules)
    } catch (error) {
      if (!mountedRef.current) return
      setModuleError(error instanceof Error ? error.message : 'Không thể tải dữ liệu dashboard')
    } finally {
      if (mountedRef.current) {
        setModuleLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    refreshModules()
  }, [refreshModules])

  const onCommitRename = useCallback(async () => {
    if (!renamingId) return
    const nextName = renameValue.trim() || 'Không tên'
    await rename(renamingId, nextName)
    setRenamingId(null)
    setRenameValue('')
    await refreshModules()
  }, [renamingId, renameValue, rename, refreshModules])

  const moduleList = moduleData ?? []
  const availablePaths = useMemo(() => new Set(moduleList.map((module) => module.path)), [moduleList])

  const resolvedPath = useMemo(() => {
    if (moduleLoading) {
      return modulePathParam ?? null
    }
    if (modulePathParam && availablePaths.has(modulePathParam)) {
      return modulePathParam
    }
    if (moduleList.length > 0) {
      return moduleList[0]?.path ?? null
    }
    return modulePathParam ?? null
  }, [moduleLoading, modulePathParam, availablePaths, moduleList])

  useEffect(() => {
    if (moduleLoading) return
    if (moduleList.length === 0) return

    if (resolvedPath && resolvedPath !== modulePathParam) {
      navigate(`/${resolvedPath}`, { replace: modulePathParam === undefined })
    } else if (!resolvedPath && modulePathParam !== undefined) {
      navigate('/', { replace: true })
    }
  }, [resolvedPath, modulePathParam, moduleLoading, moduleList.length, navigate])

  const activeModule = useMemo(() => {
    if (!moduleList.length) return null
    if (!resolvedPath) return moduleList[0]
    return moduleList.find((module) => module.path === resolvedPath) ?? moduleList[0]
  }, [moduleList, resolvedPath])

  const filteredDiagrams = useMemo(() => {
    if (!activeModule) return []
    const query = searchTerm.trim()
    if (!query) return activeModule.diagrams
    const normalizedQuery = normalizeText(query)
    return activeModule.diagrams.filter((diagram) => {
      const name = normalizeText(diagram.name || '')
      const viewModel = normalizeText(diagram.viewModelDisplayName || '')
      return name.includes(normalizedQuery) || viewModel.includes(normalizedQuery)
    })
  }, [activeModule, searchTerm])

  const handleDiagramAction = useCallback((action: string, diagramId: string) => {
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
  }, [open])

  const handleCreateDiagram = useCallback(async () => {
    try {
      // Lấy activeModuleId từ module hiện tại
      const activeModuleId = activeModule?.id !== 'unassigned' ? activeModule?.id : undefined
      await create('Sơ đồ mới', undefined, activeModuleId)
      await refreshModules()
      if (mountedRef.current) {
        // Nếu có activeModuleId thì giữ nguyên trang, không thì chuyển về unassigned
        if (!activeModuleId) {
          navigate(`/${UNASSIGNED_PATH}`)
        }
      }
    } catch (error) {
      console.error('Failed to create diagram:', error)
    }
  }, [create, refreshModules, navigate, activeModule?.id])

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      await duplicate(id)
      await refreshModules()
      if (mountedRef.current) {
        navigate(`/${UNASSIGNED_PATH}`)
      }
    } catch (error) {
      console.error('Failed to duplicate diagram:', error)
    }
  }, [duplicate, refreshModules, navigate])

  const handleRemove = useCallback(async (id: string) => {
    try {
      await remove(id)
      if (renamingId === id) {
        setRenamingId(null)
        setRenameValue('')
      }
      await refreshModules()
    } catch (error) {
      console.error('Failed to remove diagram:', error)
    }
  }, [remove, renamingId, refreshModules])

  const renderClassicDashboard = () => (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex w-full gap-2 sm:w-80">
          <Input
            placeholder="Tìm kiếm sơ đồ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" onClick={() => void refreshModules()} disabled={moduleLoading}>
            {moduleLoading ? 'Đang tải…' : 'Làm mới'}
          </Button>
        </div>
      </div>

      {moduleError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{moduleError}</span>
          <Button size="sm" variant="outline" onClick={() => void refreshModules()}>
            Thử lại
          </Button>
        </div>
      )}

      {moduleLoading && moduleList.length === 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-md border bg-muted/20" />
          ))}
        </div>
      )}

      {!moduleLoading && moduleList.length === 0 && !moduleError && (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          Chưa có dashboard nào khả dụng. Hãy kiểm tra dữ liệu module hoặc tạo sơ đồ mới.
        </div>
      )}

      {!moduleLoading && activeModule && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{activeModule.displayName}</h2>
                <Badge variant="secondary" className="text-xs">
                  {activeModule.diagramCount} sơ đồ
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Đường dẫn: /{activeModule.path}</p>
            </div>
            {searchTerm && (
              <Button size="sm" variant="ghost" onClick={() => setSearchTerm('')}>
                Xóa tìm kiếm
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDiagrams.length === 0 ? (
              <div className="col-span-full rounded-md border p-6 text-center text-sm text-muted-foreground">
                {searchTerm ? 'Không tìm thấy sơ đồ phù hợp với từ khóa.' : 'Chưa có sơ đồ nào trong dashboard này.'}
              </div>
            ) : (
              filteredDiagrams.map((diagram) => (
                <div key={diagram.id} className="relative flex flex-col rounded-md border bg-card p-4 shadow-sm">
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      title="Mở sơ đồ"
                      onClick={() => handleDiagramAction('edit', diagram.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      title="Nhân đôi"
                      onClick={() => void handleDuplicate(diagram.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mb-3">
                    <Badge variant="outline" className="mb-2 w-fit text-[0.65rem] uppercase tracking-wide">
                      {diagram.viewModelDisplayName || 'Chưa gán view model'}
                    </Badge>
                    {renamingId === diagram.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void onCommitRename()
                            if (e.key === 'Escape') {
                              setRenamingId(null)
                              setRenameValue('')
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => void onCommitRename()}>OK</Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="line-clamp-2 text-base font-medium" title={diagram.name}>
                          {diagram.name}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="Đổi tên"
                          onClick={() => onStartRename(diagram.id, diagram.name)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      Cập nhật: {new Date(diagram.updatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDiagramAction('statistics', diagram.id)}
                        title="Xem sơ đồ ở chế độ preview"
                      >
                        <Eye className="mr-2 h-4 w-4" /> Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDiagramAction('track', diagram.id)}
                        title="Theo dõi luồng"
                      >
                        <Search className="mr-2 h-4 w-4" /> Theo dõi luồng
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="destructive" className="ml-auto" onClick={() => void handleRemove(diagram.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
                <Button onClick={() => void handleCreateDiagram()}>
                  <FolderPlus className="mr-2 h-4 w-4" /> Sơ đồ mới
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
