import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFlowStore } from '../state/flowStore'
import { useWorkspaceStore } from '../state/workspaceStore'
import { useOptionsStore } from '../state/optionsStore'
import { fetchSubModuleOptions } from '../lib/api'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { PlusCircle, Send, Pencil, Trash2, Archive, ArchiveRestore, CheckCircle2, XCircle, Mail, Bell, MessageSquareText, RefreshCw, Plus, Check } from 'lucide-react'
import type { AlgoNodeData } from '../flow/types'

// Icon mapping for dynamic loading
const iconMap = {
  PlusCircle,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  XCircle,
  Mail,
  Bell,
  MessageSquareText,
  RefreshCw,
  Send,
  Plus,
  Check,
}

const statusColorPresets = ['#22c55e', '#f97316', '#ef4444', '#3b82f6', '#a855f7', '#facc15'] as const
const statusSourceOptions = [
  { value: 'api', label: 'API' },
  { value: 'database', label: 'Database query' },
] as const
const statusHttpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
type IntegrationSource = 'api' | 'database'
type IntegrationHttpMethod = (typeof statusHttpMethods)[number]

// Component tái sử dụng cho các panel toggle buttons
interface ToggleButtonsPanelProps {
  title: string;
  options: Array<{ value: string; label: string; Icon?: React.ComponentType<any> }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  className?: string;
  searchBox?: React.ReactNode; // Prop để truyền vào search box
}

function ToggleButtonsPanel({ 
  title, 
  options, 
  selectedValues, 
  onToggle, 
  onSelectAll, 
  onClearAll,
  className = "",
  searchBox
}: ToggleButtonsPanelProps) {
  // Tách options thành đã chọn và chưa chọn
  const selectedOptions = options.filter(option => selectedValues.includes(option.value));
  const unselectedOptions = options.filter(option => !selectedValues.includes(option.value));
  
  // Tính toán độ cao mặc định cho mỗi panel dựa vào className đã truyền vào
  const maxHeightClass = className || "max-h-48";
  
  return (
    <div className="space-y-2">
      {/* Header cố định */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium">{title}</div>
        {(onSelectAll || onClearAll) && (
          <div className="flex items-center gap-2">
            {onSelectAll && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onSelectAll}>
                Chọn tất cả
              </Button>
            )}
            {onClearAll && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClearAll}>
                Bỏ chọn tất cả
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Search box (nếu được cung cấp) */}
      {searchBox}
      
      {/* Container cho các panel riêng biệt */}
      <div className="space-y-3">
        {/* Panel hiển thị các options đã chọn */}
        {selectedOptions.length > 0 && (
          <div className="border rounded-lg">
            <div className="p-2 border-b">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3" /> Đã chọn
              </div>
            </div>
            <div className={`p-2 overflow-auto ${maxHeightClass}`}>
              <div className="flex flex-wrap gap-2">
                {selectedOptions.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full border transition bg-primary text-primary-foreground border-primary shadow-sm"
                    onClick={() => onToggle(value)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Panel hiển thị các options chưa chọn */}
        {unselectedOptions.length > 0 && (
          <div className="border rounded-lg">
            <div className="p-2 border-b">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" /> Chưa chọn
              </div>
            </div>
            <div className={`p-2 overflow-auto ${maxHeightClass}`}>
              <div className="flex flex-wrap gap-2">
                {unselectedOptions.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full border transition bg-transparent hover:bg-muted border-input text-foreground/80"
                    onClick={() => onToggle(value)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailBar() {
  const selection = useFlowStore((s) => s.selection)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData)
  
  // Get options from options store - sử dụng selectors riêng biệt để tránh re-render không cần thiết
  const options = useOptionsStore(state => state.options)
  const fetchOptions = useOptionsStore(state => state.fetchOptions)
  const isLoadingOptions = useOptionsStore(state => state.isLoading)
  const fetchingRef = useOptionsStore(state => state.fetchingRef)
  
  // Extract options from the store with stable references to prevent re-renders
  const triggerEventOptions = useMemo(() => {
    if (!options || !options.triggerEventOptions) return []
    return options.triggerEventOptions.map(option => ({
      ...option,
      Icon: option.icon && iconMap[option.icon as keyof typeof iconMap] || PlusCircle
    }))
  }, [options?.triggerEventOptions])
  
  const triggerModuleOptions = useMemo(() => 
    options?.triggerModuleOptions || []
  , [options?.triggerModuleOptions])
  
  const diagramModuleOptions = useMemo(() => 
    options?.diagramModuleOptions || []
  , [options?.diagramModuleOptions])
  
  const sendKindOptions = useMemo(() => {
    if (!options || !options.sendKindOptions) return []
    return options.sendKindOptions.map(option => ({
      ...option, 
      Icon: option.icon && iconMap[option.icon as keyof typeof iconMap] || Bell
    }))
  }, [options?.sendKindOptions])
  
  const humanPersonTypeOptions = useMemo(() => 
    options?.humanPersonTypeOptions || []
  , [options?.humanPersonTypeOptions])
  
  const humanPeopleOptions = useMemo(() => 
    options?.humanPeopleOptions || []
  , [options?.humanPeopleOptions])
  
  const humanRoleOptions = useMemo(() => 
    options?.humanRoleOptions || []
  , [options?.humanRoleOptions])
  
  const humanDepartmentOptions = useMemo(() => 
    options?.humanDepartmentOptions || []
  , [options?.humanDepartmentOptions])

  const selectedNode = useMemo(() => (selection.nodeIds.length === 1 ? nodes.find((n) => n.id === selection.nodeIds[0]) : undefined), [selection, nodes])
  const selectedEdge = useMemo(() => (selection.edgeIds.length === 1 && selection.nodeIds.length === 0 ? edges.find((e) => e.id === selection.edgeIds[0]) : undefined), [selection, edges])
  const activeDiagramDetails = useWorkspaceStore((s) => (s.activeId ? s.diagrams[s.activeId]?.details : undefined))
  const setDiagramDetails = useWorkspaceStore((s) => s.setDiagramDetails)

  const [labelDraft, setLabelDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [integrationApiMethod, setIntegrationApiMethod] = useState<IntegrationHttpMethod>('GET')
  const [integrationApiUrlDraft, setIntegrationApiUrlDraft] = useState('')
  const [integrationApiHeadersDraft, setIntegrationApiHeadersDraft] = useState('')
  const [integrationApiBodyDraft, setIntegrationApiBodyDraft] = useState('')
  const [integrationDbConnectionDraft, setIntegrationDbConnectionDraft] = useState('')
  const [integrationDbQueryDraft, setIntegrationDbQueryDraft] = useState('')
  const [integrationDbParamsDraft, setIntegrationDbParamsDraft] = useState('')
  const [integrationEnabled, setIntegrationEnabled] = useState(false)
  const [moduleQuery, setModuleQuery] = useState('')
  const [subModuleQuery, setSubModuleQuery] = useState('')
  const [subModuleOptions, setSubModuleOptions] = useState<Array<{id: string; value: string; label: string}>>([])
  const [humanPersonQuery, setHumanPersonQuery] = useState('')
  const [humanRoleQuery, setHumanRoleQuery] = useState('')
  const [humanDeptQuery, setHumanDeptQuery] = useState('')

  // Chỉ chạy effect này một lần khi component mount
  useEffect(() => {
    // Sử dụng một biến để đánh dấu nếu component đã unmount
    let isMounted = true;
    
    // Hàm fetch riêng biệt để tránh sự phụ thuộc vào closure
    const fetchData = async () => {
      try {
        // Chỉ fetchOptions nếu component vẫn mounted
        if (isMounted) await fetchOptions();
      } catch (error) {
        console.error("Error fetching options:", error);
      }
    };
    
    // Fetch lần đầu khi mount
    fetchData();
    
    // Set up interval với hàm fetchData local
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    
    // Cleanup
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [])

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  
  // Memorize các kết quả filter cho trigger modules (cr04viewmodelmapping)
  const filteredModules = useMemo(() => {
    const q = moduleQuery.trim()
    if (!q) return triggerModuleOptions || []
    if (!triggerModuleOptions || triggerModuleOptions.length === 0) return []
    const nq = normalize(q)
    return triggerModuleOptions.filter((m) => normalize(m.label || '').includes(nq))
  }, [moduleQuery, triggerModuleOptions])
  
  // Memorize các kết quả filter cho diagram modules (cr06modulemapping)
  const filteredDiagramModules = useMemo(() => {
    const q = moduleQuery.trim()
    if (!q) return diagramModuleOptions || []
    if (!diagramModuleOptions || diagramModuleOptions.length === 0) return []
    const nq = normalize(q)
    return diagramModuleOptions.filter((m) => normalize(m.label || '').includes(nq))
  }, [moduleQuery, diagramModuleOptions])

  // Memorize các kết quả filter cho SubModule options (cr04viewmodelmapping)
  const filteredSubModules = useMemo(() => {
    const q = subModuleQuery.trim()
    if (!q) return subModuleOptions || []
    if (!subModuleOptions || subModuleOptions.length === 0) return []
    const nq = normalize(q)
    return subModuleOptions.filter((m) => normalize(m.label || '').includes(nq))
  }, [subModuleQuery, subModuleOptions])
  
  // Set initial module query when node changes
  useEffect(() => {
    if (selectedNode?.type === 'trigger') {
      const selectedModuleValue = (selectedNode.data as any)?.triggerModules?.[0];
      if (selectedModuleValue) {
        const moduleLabel = triggerModuleOptions.find(opt => opt.value === selectedModuleValue)?.label || '';
        setModuleQuery(moduleLabel);
      } else {
        setModuleQuery('');
      }
    }
  }, [selectedNode?.id, selectedNode?.type, triggerModuleOptions]);

  // Fetch SubModule options when active module changes
  useEffect(() => {
    const fetchSubModules = async () => {
      if (activeDiagramDetails?.mappingId) {
        try {
          const response = await fetchSubModuleOptions(activeDiagramDetails.mappingId);
          setSubModuleOptions(response.subModuleOptions);
        } catch (error) {
          console.error('Failed to fetch submodule options:', error);
          setSubModuleOptions([]);
        }
      } else {
        setSubModuleOptions([]);
      }
    };

    fetchSubModules();
  }, [activeDiagramDetails?.mappingId]);

  // Reset subModule query when diagram changes or when subModuleId is already set
  useEffect(() => {
    if (activeDiagramDetails?.subModuleId && subModuleOptions.length > 0) {
      const selectedSubModule = subModuleOptions.find(opt => opt.id === activeDiagramDetails.subModuleId);
      if (selectedSubModule) {
        setSubModuleQuery(''); // Clear query to show the selected item below
      }
    } else {
      setSubModuleQuery('');
    }
  }, [activeDiagramDetails?.subModuleId, subModuleOptions]);

  const filteredHumanPeople = useMemo(() => {
    const q = humanPersonQuery.trim()
    if (!q) return humanPeopleOptions || []
    if (!humanPeopleOptions || humanPeopleOptions.length === 0) return []
    const nq = normalize(q)
    return humanPeopleOptions.filter((m) => normalize(m.label || '').includes(nq))
  }, [humanPersonQuery, humanPeopleOptions])

  const filteredHumanRoles = useMemo(() => {
    const q = humanRoleQuery.trim()
    if (!q) return humanRoleOptions || []
    if (!humanRoleOptions || humanRoleOptions.length === 0) return []
    const nq = normalize(q)
    return humanRoleOptions.filter((m) => normalize(m.label || '').includes(nq))
  }, [humanRoleQuery, humanRoleOptions])

  const filteredHumanDepts = useMemo(() => {
    const q = humanDeptQuery.trim()
    if (!q) return humanDepartmentOptions || []
    if (!humanDepartmentOptions || humanDepartmentOptions.length === 0) return []
    const nq = normalize(q)
    return humanDepartmentOptions.filter((m) => normalize(m.label || '').includes(nq))
  }, [humanDeptQuery, humanDepartmentOptions])

  useEffect(() => {
    if (selectedNode) {
      const data: any = selectedNode.data || {}
      setLabelDraft(data?.label ?? '')
      setIntegrationApiMethod((data?.integrationApiMethod ?? 'GET') as IntegrationHttpMethod)
      setIntegrationApiUrlDraft((data?.integrationApiUrl ?? data?.api ?? '') as string)
      setIntegrationApiHeadersDraft((data?.integrationApiHeaders ?? '') as string)
      setIntegrationApiBodyDraft((data?.integrationApiBody ?? '') as string)
      setIntegrationDbConnectionDraft((data?.integrationDbConnection ?? '') as string)
      setIntegrationDbQueryDraft((data?.integrationDbQuery ?? '') as string)
      setIntegrationDbParamsDraft((data?.integrationDbParams ?? '') as string)
      setIntegrationEnabled(selectedNode.type === 'get' || selectedNode.type === 'set' ? true : Boolean(data?.integrationEnabled))
    } else if (selectedEdge) {
      setLabelDraft((selectedEdge.data as any)?.label ?? '')
      setIntegrationApiMethod('GET')
      setIntegrationApiUrlDraft('')
      setIntegrationApiHeadersDraft('')
      setIntegrationApiBodyDraft('')
      setIntegrationDbConnectionDraft('')
      setIntegrationDbQueryDraft('')
      setIntegrationDbParamsDraft('')
      setIntegrationEnabled(false)
    } else {
      setLabelDraft('')
      setIntegrationApiMethod('GET')
      setIntegrationApiUrlDraft('')
      setIntegrationApiHeadersDraft('')
      setIntegrationApiBodyDraft('')
      setIntegrationDbConnectionDraft('')
      setIntegrationDbQueryDraft('')
      setIntegrationDbParamsDraft('')
      setIntegrationEnabled(false)
    }
    // reset queries for unrelated sections
    if (selectedNode?.type !== 'trigger') setModuleQuery('')
    if (selectedNode?.type !== 'human') {
      setHumanPersonQuery('')
      setHumanRoleQuery('')
      setHumanDeptQuery('')
    }
  }, [selectedNode, selectedEdge])

  useEffect(() => {
    // autofocus when appearing
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [selectedNode?.id, selectedEdge?.id])

  const commitLabel = () => {
    const v = labelDraft.trim()
    if (selectedNode) updateNodeData(selectedNode.id, { label: v })
    if (selectedEdge) updateEdgeData(selectedEdge.id, { label: v })
  }

  const toggleTriggerEvent = (name: string) => {
    if (!selectedNode) return
    const current: string[] = ((selectedNode.data as any)?.triggerEvents ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    updateNodeData(selectedNode.id, { triggerEvents: next })
  }

  // Sử dụng useCallback để tránh tạo lại hàm này mỗi khi component re-render
  const toggleSendKind = useCallback((name: string) => {
    if (!selectedNode) return
    const current: string[] = ((selectedNode.data as any)?.sendKinds ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    updateNodeData(selectedNode.id, { sendKinds: next })
  }, [selectedNode, updateNodeData])

  const setHumanType = (value: 'personal' | 'role') => {
    if (!selectedNode) return
    
    // Get current data to preserve some values
    const data: any = selectedNode.data || {}
    const currentType = data?.humanType ?? 'personal'
    
    // If type hasn't changed, no need to reset anything
    if (currentType === value) return
    
    // Create an update object with type-safe properties
    const resetData: Partial<AlgoNodeData> = { humanType: value }
    
    // Preserve humanIds and humanPersons fields as appropriate
    if (value === 'personal') {
      // When switching to personal type, clear role-based selections
      resetData.humanPersonsByRole = []
      resetData.humanRoles = []
      resetData.humanRoleIds = []
      resetData.humanDepartments = []
      resetData.humanDepartmentIds = []
      
      // Keep existing personal selections if any
      if (data.humanPersonsPersonal?.length > 0) {
        resetData.humanPersonsPersonal = data.humanPersonsPersonal
        resetData.humanPersons = data.humanPersonsPersonal
        resetData.humanIds = data.humanIds || []
      } else {
        // Initialize with empty arrays
        resetData.humanPersonsPersonal = []
        resetData.humanPersons = []
        resetData.humanIds = []
      }
    } else if (value === 'role') {
      // When switching to role type, clear personal selections
      resetData.humanPersonsPersonal = []
      
      // Keep existing role selections if any
      if (data.humanRoles?.length > 0) {
        resetData.humanRoles = data.humanRoles
        resetData.humanRoleIds = data.humanRoleIds || []
      } else {
        // Initialize with empty arrays
        resetData.humanRoles = []
        resetData.humanRoleIds = []
      }
      
      if (data.humanDepartments?.length > 0) {
        resetData.humanDepartments = data.humanDepartments
        resetData.humanDepartmentIds = data.humanDepartmentIds || []
      } else {
        // Initialize with empty arrays
        resetData.humanDepartments = []
        resetData.humanDepartmentIds = []
      }
      
      if (data.humanRoles?.length > 0 && data.humanDepartments?.length > 0) {
        // If both roles and departments exist, preserve role-based people
        resetData.humanPersonsByRole = data.humanPersonsByRole || []
        resetData.humanPersons = data.humanPersonsByRole || []
      } else {
        // Initialize with empty arrays
        resetData.humanPersonsByRole = []
        resetData.humanPersons = []
      }
    }
    
    // Set flag to indicate initialization
    if (value === 'personal') {
      resetData.humanPersonalPeopleInitialized = true
    } else {
      resetData.humanRolePeopleInitialized = true
    }
    
    // Update node data with reset values
    updateNodeData(selectedNode.id, resetData)
  }

  const toggleHumanPersonPersonal = (name: string) => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const current: string[] = (data?.humanPersonsPersonal ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    const byRole: string[] = (data?.humanPersonsByRole ?? []) as string[]
    const union = Array.from(new Set<string>([...next, ...byRole]))
    
    // Tìm option đầy đủ để lấy ID
    const selectedOption = humanPeopleOptions.find(opt => opt.value === name)
    
    // Lấy danh sách IDs hiện tại
    const currentIds: string[] = (data?.humanIds ?? []) as string[]
    
    // Thêm hoặc xóa ID tùy thuộc vào trạng thái
    let nextIds = [...currentIds]
    if (selectedOption) {
      if (current.includes(name)) {
        // Xóa ID nếu đã bỏ chọn
        nextIds = nextIds.filter(id => id !== selectedOption.id)
      } else {
        // Thêm ID nếu đã chọn
        nextIds.push(selectedOption.id)
      }
    }
    
    updateNodeData(selectedNode.id, { 
      humanPersonsPersonal: next, 
      humanPersons: union,
      humanIds: nextIds
    })
  }

  const toggleHumanPersonRole = (name: string) => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const current: string[] = (data?.humanPersonsByRole ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    const personal: string[] = (data?.humanPersonsPersonal ?? []) as string[]
    const union = Array.from(new Set<string>([...personal, ...next]))
    updateNodeData(selectedNode.id, { humanPersonsByRole: next, humanPersons: union })
  }

  const toggleHumanRole = (name: string) => {
    if (!selectedNode) return
    
    // Tìm option đầy đủ để lấy ID
    const selectedOption = humanRoleOptions.find(opt => opt.value === name)
    
    // Lấy danh sách values và IDs hiện tại
    const currentValues: string[] = ((selectedNode.data as any)?.humanRoles ?? []) as string[]
    const currentIds: string[] = ((selectedNode.data as any)?.humanRoleIds ?? []) as string[]
    
    if (currentValues.includes(name)) {
      // Xóa khỏi danh sách
      const valueIndex = currentValues.indexOf(name)
      const newValues = currentValues.filter(x => x !== name)
      // Xóa ID tương ứng nếu có
      const newIds = [...currentIds]
      if (valueIndex >= 0 && valueIndex < currentIds.length) {
        newIds.splice(valueIndex, 1)
      }
      
      updateNodeData(selectedNode.id, { 
        humanRoles: newValues,
        humanRoleIds: newIds
      })
    } else {
      // Thêm vào danh sách
      const newValues = [...currentValues, name]
      const newIds = [...currentIds, selectedOption?.id || '']
      
      updateNodeData(selectedNode.id, { 
        humanRoles: newValues,
        humanRoleIds: newIds
      })
    }
  }

  const toggleHumanDept = (name: string) => {
    if (!selectedNode) return
    
    // Tìm option đầy đủ để lấy ID
    const selectedOption = humanDepartmentOptions.find(opt => opt.value === name)
    
    // Lấy danh sách values và IDs hiện tại
    const currentValues: string[] = ((selectedNode.data as any)?.humanDepartments ?? []) as string[]
    const currentIds: string[] = ((selectedNode.data as any)?.humanDepartmentIds ?? []) as string[]
    
    if (currentValues.includes(name)) {
      // Xóa khỏi danh sách
      const valueIndex = currentValues.indexOf(name)
      const newValues = currentValues.filter(x => x !== name)
      // Xóa ID tương ứng nếu có
      const newIds = [...currentIds]
      if (valueIndex >= 0 && valueIndex < currentIds.length) {
        newIds.splice(valueIndex, 1)
      }
      
      updateNodeData(selectedNode.id, { 
        humanDepartments: newValues,
        humanDepartmentIds: newIds
      })
    } else {
      // Thêm vào danh sách
      const newValues = [...currentValues, name]
      const newIds = [...currentIds, selectedOption?.id || '']
      
      updateNodeData(selectedNode.id, { 
        humanDepartments: newValues,
        humanDepartmentIds: newIds
      })
    }
  }

  const selectAllHumanRoles = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanRoles: humanRoleOptions.map(r => r.value) })
  }
  const clearAllHumanRoles = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanRoles: [] })
  }
  const selectAllHumanDepts = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanDepartments: humanDepartmentOptions.map(d => d.value) })
  }
  const clearAllHumanDepts = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanDepartments: [] })
  }
  const selectAllPersonalPeople = () => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const byRole: string[] = (data?.humanPersonsByRole ?? []) as string[]
    const all = humanPeopleOptions.map(p => p.value)
    const union = Array.from(new Set<string>([...all, ...byRole]))
    updateNodeData(selectedNode.id, { humanPersonsPersonal: all, humanPersons: union })
  }
  const clearAllPersonalPeople = () => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const byRole: string[] = (data?.humanPersonsByRole ?? []) as string[]
    const union = Array.from(new Set<string>([...byRole]))
    updateNodeData(selectedNode.id, { humanPersonsPersonal: [], humanPersons: union })
  }
  const selectAllRolePeople = () => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const personal: string[] = (data?.humanPersonsPersonal ?? []) as string[]
    const all = humanPeopleOptions.map(p => p.value)
    const union = Array.from(new Set<string>([...personal, ...all]))
    updateNodeData(selectedNode.id, { humanPersonsByRole: all, humanPersons: union })
  }
  const clearAllRolePeople = () => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const personal: string[] = (data?.humanPersonsPersonal ?? []) as string[]
    const union = Array.from(new Set<string>([...personal]))
    updateNodeData(selectedNode.id, { humanPersonsByRole: [], humanPersons: union })
  }

  // Sử dụng memo để lưu cache giá trị people options
  const stableHumanPeopleValues = useMemo(() => {
    return humanPeopleOptions?.map(p => p.value) || []
  }, [humanPeopleOptions])

  // Hàm để kiểm tra và cập nhật người khi vai trò và phòng ban thay đổi
  // Sử dụng useCallback để đảm bảo tính ổn định của hàm
  const checkAndUpdatePeople = useCallback((node: any) => {
    if (!node || node.type !== 'human') return;
    
    const data: any = node.data || {};
    const humanType = (data?.humanType ?? 'personal') as 'personal' | 'role';
    if (humanType !== 'role') return;
    
    const roles: string[] = (data?.humanRoles ?? []);
    const depts: string[] = (data?.humanDepartments ?? []);
    
    // Chỉ cập nhật khi cả vai trò và phòng ban đều được chọn
    if (roles.length > 0 && depts.length > 0) {
      const personal: string[] = (data?.humanPersonsPersonal ?? []);
      const peopleValues = stableHumanPeopleValues;
      
      // Kiểm tra xem đã có sẵn chưa
      const currentByRole = data?.humanPersonsByRole || [];
      
      // Chỉ cập nhật khi cần thiết
      if (JSON.stringify(currentByRole.sort()) !== JSON.stringify(peopleValues.sort())) {
        const union = Array.from(new Set<string>([...personal, ...peopleValues]));
        updateNodeData(node.id, { 
          humanPersonsByRole: peopleValues, 
          humanPersons: union 
        });
      }
    }
  }, [stableHumanPeopleValues, updateNodeData]);

  // Thực hiện kiểm tra khi selectedNode thay đổi
  useEffect(() => {
    if (selectedNode) {
      checkAndUpdatePeople(selectedNode);
    }
  }, [selectedNode, checkAndUpdatePeople]);

  const selectAllTriggerEvents = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { triggerEvents: triggerEventOptions.map((o) => o.value) })
  }
  const clearAllTriggerEvents = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { triggerEvents: [] })
  }
  
  const selectAllSendKinds = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { sendKinds: sendKindOptions.map((o) => o.value) })
  }
  
  const clearAllSendKinds = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { sendKinds: [] })
  }

  // Hide DetailBar for Start/End/And/Or nodes
  if (selectedNode && (selectedNode.type === 'start' || selectedNode.type === 'end' || selectedNode.type === 'and' || selectedNode.type === 'or')) return null

  const integrationSource: IntegrationSource = ((selectedNode?.data as any)?.integrationSource ?? 'api') as IntegrationSource

  const IntegrationSection = ({ description, optional }: { description: string; optional?: boolean }) => {
    if (!selectedNode) return null
    const nodeData: any = selectedNode.data || {}
    const enabled = optional ? integrationEnabled : true
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-medium">
              Nguồn dữ liệu đầu vào{optional ? ' (tùy chọn)' : ''}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {optional ? (
            <Switch
              checked={enabled}
              onCheckedChange={(value) => {
                setIntegrationEnabled(value)
                updateNodeData(selectedNode.id, { integrationEnabled: value })
              }}
              className="mt-1"
            />
          ) : null}
        </div>

        {!enabled ? null : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {statusSourceOptions.map((option) => {
                const active = integrationSource === option.value
                return (
                  <Button
                    key={option.value}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="h-8 px-3 text-xs"
                  onClick={() => updateNodeData(selectedNode.id, { integrationSource: option.value })}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>

            {integrationSource === 'api' ? (
              <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">HTTP method</div>
              <div className="flex flex-wrap gap-2">
                {statusHttpMethods.map((method) => {
                  const active = integrationApiMethod === method
                  return (
                    <Button
                      key={method}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        setIntegrationApiMethod(method)
                        updateNodeData(selectedNode.id, { integrationApiMethod: method })
                      }}
                    >
                      {method}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Endpoint URL</label>
              <Input
                value={integrationApiUrlDraft}
                placeholder="https://api.example.com/status"
                onChange={(e) => setIntegrationApiUrlDraft(e.target.value)}
                onBlur={() => updateNodeData(selectedNode.id, { integrationApiUrl: integrationApiUrlDraft.trim() })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateNodeData(selectedNode.id, { integrationApiUrl: integrationApiUrlDraft.trim() })
                  if (e.key === 'Escape') {
                    setIntegrationApiUrlDraft(((nodeData?.integrationApiUrl ?? nodeData?.api ?? '') as string))
                  }
                }}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Headers (JSON, tùy chọn)</label>
              <textarea
                value={integrationApiHeadersDraft}
                placeholder='{"Authorization": "Bearer token"}'
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) => setIntegrationApiHeadersDraft(e.target.value)}
                onBlur={() => updateNodeData(selectedNode.id, { integrationApiHeaders: integrationApiHeadersDraft })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIntegrationApiHeadersDraft(((nodeData?.integrationApiHeaders ?? '') as string))
                  }
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Payload/Mapping (JSON, tùy chọn)</label>
              <textarea
                value={integrationApiBodyDraft}
                placeholder='{"customerId": "123"}'
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) => setIntegrationApiBodyDraft(e.target.value)}
                onBlur={() => updateNodeData(selectedNode.id, { integrationApiBody: integrationApiBodyDraft })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIntegrationApiBodyDraft(((nodeData?.integrationApiBody ?? '') as string))
                  }
                }}
              />
            </div>
          </div>
            ) : (
              <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Kết nối database</label>
              <Input
                value={integrationDbConnectionDraft}
                placeholder="production-db hoặc URL kết nối"
                onChange={(e) => setIntegrationDbConnectionDraft(e.target.value)}
                onBlur={() => updateNodeData(selectedNode.id, { integrationDbConnection: integrationDbConnectionDraft.trim() })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateNodeData(selectedNode.id, { integrationDbConnection: integrationDbConnectionDraft.trim() })
                  if (e.key === 'Escape') {
                    setIntegrationDbConnectionDraft(((nodeData?.integrationDbConnection ?? '') as string))
                  }
                }}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Câu truy vấn</label>
              <textarea
                value={integrationDbQueryDraft}
                placeholder="SELECT status FROM orders WHERE id = $1"
                className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) => setIntegrationDbQueryDraft(e.target.value)}
                onBlur={() => updateNodeData(selectedNode.id, { integrationDbQuery: integrationDbQueryDraft })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIntegrationDbQueryDraft(((nodeData?.integrationDbQuery ?? '') as string))
                  }
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Parameters (JSON, tùy chọn)</label>
              <textarea
                value={integrationDbParamsDraft}
                placeholder='{"id": "123"}'
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) => setIntegrationDbParamsDraft(e.target.value)}
                onBlur={() => updateNodeData(selectedNode.id, { integrationDbParams: integrationDbParamsDraft })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIntegrationDbParamsDraft(((nodeData?.integrationDbParams ?? '') as string))
                  }
                }}
              />
            </div>
          </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const title = selectedNode ? `Node: ${selectedNode.type}` : selectedEdge ? 'Edge' : 'S\u01a1 \u0111\u1ed3'

  return (
    <div className="w-80 shrink-0 border-l bg-card/60 backdrop-blur p-3 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-semibold opacity-80">Chi tiết</div>
          <div className="text-xs text-muted-foreground">{title}</div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="Làm mới dữ liệu từ server"
          onClick={() => {
            // Sử dụng một timeout để tránh lỗi khi render
            setTimeout(() => {
              fetchOptions();
            }, 0);
          }}
          disabled={isLoadingOptions}
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingOptions ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <Separator className="my-3" />

      {(selectedNode || selectedEdge) && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Nhãn (Label)</label>
          <Input
            ref={inputRef}
            value={labelDraft}
            placeholder={selectedNode ? 'Tên node' : 'Tên nhãn cho liên kết'}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitLabel()
              if (e.key === 'Escape') {
                if (selectedNode) setLabelDraft((selectedNode.data as any)?.label ?? '')
                if (selectedEdge) setLabelDraft((selectedEdge.data as any)?.label ?? '')
              }
            }}
          />
        </div>
      )}

      {!selectedNode && !selectedEdge && (
        <div className="mt-2 space-y-4">
          {/* Diagram details: Module hoạt động */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Module hoạt động</div>
            <div className="relative">
              <div className="flex w-full items-center space-x-2">
                <div className="relative w-full">
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background pr-8"
                    placeholder="Tìm kiếm và chọn module..."
                    value={moduleQuery}
                    onChange={(e) => setModuleQuery(e.target.value)}
                    onFocus={() => document.getElementById('diagram-module-options')?.classList.remove('hidden')}
                    onBlur={() => {
                      setTimeout(() => {
                        document.getElementById('diagram-module-options')?.classList.add('hidden');
                      }, 200);
                    }}
                  />
                  {moduleQuery && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setModuleQuery('')}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div
                id="diagram-module-options"
                className="absolute z-10 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-40 overflow-auto hidden"
              >
                {filteredDiagramModules.length > 0 ? (
                  filteredDiagramModules.map(opt => (
                    <div
                      key={opt.value}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                        activeDiagramDetails?.mappingId === (opt as any)?.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => {
                        const selectedOption = diagramModuleOptions.find(o => o.value === opt.value);
                        setDiagramDetails({ triggerModule: opt.value, mappingId: selectedOption?.id || '' })
                        setModuleQuery(opt.label)
                        document.getElementById('diagram-module-options')?.classList.add('hidden')
                      }}
                    >
                      {opt.label}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy kết quả</div>
                )}
              </div>
            </div>
            {(activeDiagramDetails?.mappingId && moduleQuery === '') && (
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground">Module đã chọn: </span>
                <span className="font-medium">
                  {(() => {
                    const found = diagramModuleOptions.find(opt => String(opt.id) === String(activeDiagramDetails?.mappingId));
                    
                    return found?.label || 'Unknown';
                  })()}
                </span>
              </div>
            )}
          </div>

          {/* Diagram details: SubModule hoạt động */}
          {activeDiagramDetails?.mappingId && (
            <div className="space-y-2">
              <div className="text-xs font-medium">SubModule hoạt động</div>
              <div className="relative">
                <div className="flex w-full items-center space-x-2">
                  <div className="relative w-full">
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background pr-8"
                      placeholder="Tìm kiếm và chọn submodule..."
                      value={subModuleQuery}
                      onChange={(e) => setSubModuleQuery(e.target.value)}
                      onFocus={() => document.getElementById('diagram-submodule-options')?.classList.remove('hidden')}
                      onBlur={() => {
                        setTimeout(() => {
                          document.getElementById('diagram-submodule-options')?.classList.add('hidden');
                        }, 200);
                      }}
                    />
                    {subModuleQuery && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setSubModuleQuery('')}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div
                  id="diagram-submodule-options"
                  className="absolute z-10 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-40 overflow-auto hidden"
                >
                  {filteredSubModules.length > 0 ? (
                    filteredSubModules.map(opt => (
                      <div
                        key={opt.value}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                          String(activeDiagramDetails?.subModuleId) === String(opt.id) ? 'bg-muted' : ''
                        }`}
                        onClick={() => {
                          setDiagramDetails({ subModuleId: opt.id })
                          setSubModuleQuery(opt.label)
                          document.getElementById('diagram-submodule-options')?.classList.add('hidden')
                        }}
                      >
                        {opt.label}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy kết quả</div>
                  )}
                </div>
              </div>
              {(activeDiagramDetails?.subModuleId && subModuleQuery === '') && (
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">SubModule đã chọn: </span>
                  <span className="font-medium">
                    {subModuleOptions.length > 0 ? (
                      subModuleOptions.find(opt => String(opt.id) === String(activeDiagramDetails?.subModuleId))?.label || 'Unknown'
                    ) : (
                      'Đang tải...'
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Diagram details: Phê duyệt */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Phê duyệt</div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeDiagramDetails?.approval ? 'default' : 'outline'}
                className="h-8 px-3 text-xs"
                onClick={() => setDiagramDetails({ approval: true })}
              >
                Có
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!activeDiagramDetails?.approval ? 'default' : 'outline'}
                className="h-8 px-3 text-xs"
                onClick={() => setDiagramDetails({ approval: false })}
              >
                Không
              </Button>
            </div>
          </div>

          <Separator />
        </div>
      )}

      {selectedNode?.type === 'status' ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium">Màu chấm hiển thị</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                {statusColorPresets.map((color) => {
                  const active = ((selectedNode.data as any)?.statusColor ?? '#22c55e') === color
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Chọn màu ${color}`}
                      className={`h-6 w-6 rounded-full border-2 transition ${active ? 'border-slate-900 shadow-[0_0_0_2px_rgba(15,23,42,0.15)]' : 'border-transparent shadow'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateNodeData(selectedNode.id, { statusColor: color })}
                    />
                  )
                })}
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Tùy chỉnh</span>
                <Input
                  type="color"
                  value={((selectedNode.data as any)?.statusColor ?? '#22c55e') as string}
                  onChange={(e) => updateNodeData(selectedNode.id, { statusColor: e.target.value })}
                  className="h-8 w-12 cursor-pointer border border-input bg-transparent p-1 shadow-none"
                />
              </label>
            </div>
          </div>

          <IntegrationSection description="Chọn cách khối status lấy dữ liệu hiển thị: trực tiếp từ API hoặc câu truy vấn database." optional />
        </div>
      ) : null}

      {selectedNode?.type === 'trigger' ? (
        <div className="mt-4 space-y-4">
          <ToggleButtonsPanel
            title="Sự kiện trigger"
            options={triggerEventOptions}
            selectedValues={(selectedNode.data as any)?.triggerEvents ?? []}
            onToggle={toggleTriggerEvent}
            onSelectAll={selectAllTriggerEvents}
            onClearAll={clearAllTriggerEvents}
            className="max-h-48"
          />
          
          {/* Approval Mode Combobox - Only visible when approve event is selected */}
          {((selectedNode.data as any)?.triggerEvents || []).includes('approve') && (
            <div className="space-y-2">
              <div className="text-xs font-medium">Chế độ phê duyệt</div>
              <div className="relative">
                <div className="relative w-full">
                  <select 
                    className="w-full appearance-none px-3 py-2 text-sm border border-input rounded-md bg-background pr-8"
                    value={(selectedNode.data as any)?.approvalMode || 'any'}
                    onChange={(e) => updateNodeData(selectedNode.id, { approvalMode: e.target.value as 'any' | 'all' })}
                  >
                    <option value="any">Bất kỳ</option>
                    <option value="all">Tất cả</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {(selectedNode.data as any)?.approvalMode === 'all' 
                  ? 'Tất cả người dùng phải phê duyệt để node này hoàn thành' 
                  : 'Chỉ cần một người phê duyệt để node này hoàn thành'}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium">Module hoạt động</div>
            <div className="relative">
              <div className="flex w-full items-center space-x-2">
                <div className="relative w-full">
                  <input
                    type="text" 
                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background pr-8"
                    placeholder="Tìm kiếm và chọn module..."
                    value={moduleQuery}
                    onChange={(e) => setModuleQuery(e.target.value)}
                    onFocus={() => document.getElementById('module-options')?.classList.remove('hidden')}
                    onBlur={() => {
                      // Delay để cho phép click event xảy ra trước khi ẩn danh sách
                      setTimeout(() => {
                        document.getElementById('module-options')?.classList.add('hidden');
                      }, 200);
                    }}
                  />
                  {moduleQuery && (
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setModuleQuery('')}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div 
                id="module-options"
                className="absolute z-10 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-40 overflow-auto hidden"
              >
                {filteredModules.length > 0 ? (
                  filteredModules.map(opt => (
                    <div
                      key={opt.value}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                        (selectedNode.data as any)?.triggerModules?.[0] === opt.value ? 'bg-muted' : ''
                      }`}
                      onClick={() => {
                        const selectedOption = triggerModuleOptions.find(o => o.value === opt.value);
                        const moduleArray = opt.value ? [opt.value] : [];
                        const mappingIdArray = opt.value ? [selectedOption?.id || ''] : [];
                        updateNodeData(selectedNode.id, {
                          triggerModules: moduleArray,
                          mappingIds: mappingIdArray
                        });
                        setModuleQuery(opt.label); // Set the search field to the selected module name
                        document.getElementById('module-options')?.classList.add('hidden');
                      }}
                    >
                      {opt.label}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy kết quả</div>
                )}
              </div>
            </div>
            
            {/* Hiển thị module đã chọn */}
            {(selectedNode.data as any)?.triggerModules?.[0] && moduleQuery === '' && (
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground">Module đã chọn: </span>
                <span className="font-medium">
                  {triggerModuleOptions.find(opt => opt.value === (selectedNode.data as any)?.triggerModules?.[0])?.label || 'Unknown'}
                </span>
              </div>
            )}
          </div>

          <IntegrationSection description="Khai báo API hoặc truy vấn database để kích hoạt trigger với dữ liệu chính xác." optional />
        </div>
      ) : null}

      {selectedNode?.type === 'send' ? (
        <div className="mt-4 space-y-2">
          <ToggleButtonsPanel
            title="Kiểu gửi tin nhắn"
            options={sendKindOptions}
            selectedValues={(selectedNode.data as any)?.sendKinds ?? []}
            onToggle={toggleSendKind}
            onSelectAll={selectAllSendKinds}
            onClearAll={clearAllSendKinds}
            className="max-h-48"
          />
        </div>
      ) : null}

      {selectedNode?.type === 'human' ? (
        <div className="mt-4 space-y-4">
          {/* Người: Cá nhân / Chức danh */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Người</div>
            <div className="flex flex-wrap gap-2">
              {humanPersonTypeOptions.map((option) => {
                const value = option.value as 'personal' | 'role';
                const label = option.label;
                const checked = ((selectedNode.data as any)?.humanType ?? 'personal') === value;
                
                return (
                  <button
                    key={value}
                    type="button"
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      checked
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                    }`}
                    onClick={() => setHumanType(value)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* If Cá nhân: show People only */}
          {(((selectedNode.data as any)?.humanType ?? 'personal') === 'personal') ? (
            <div className="space-y-2">
              <ToggleButtonsPanel
                title="Người"
                options={filteredHumanPeople.map(opt => ({ value: opt.value, label: opt.label }))}
                selectedValues={(selectedNode.data as any)?.humanPersonsPersonal ?? []}
                onToggle={toggleHumanPersonPersonal}
                onSelectAll={selectAllPersonalPeople}
                onClearAll={clearAllPersonalPeople}
                className="max-h-28"
                searchBox={
                  <Input 
                    value={humanPersonQuery} 
                    placeholder="Tìm kiếm người..." 
                    onChange={(e) => setHumanPersonQuery(e.target.value)} 
                    className="mb-2 mt-1"
                  />
                }
              />
              {filteredHumanPeople.length === 0 ? (
                <div className="text-xs text-muted-foreground">Không có kết quả</div>
              ) : null}
            </div>
          ) : null}

          {/* If Chức danh: show Roles, Departments, People */}
          {(((selectedNode.data as any)?.humanType ?? 'personal') === 'role') ? (
            <>
              <div className="space-y-2">
                <ToggleButtonsPanel
                  title="Chức danh"
                  options={filteredHumanRoles.map(opt => ({ value: opt.value, label: opt.label }))}
                  selectedValues={(selectedNode.data as any)?.humanRoles ?? []}
                  onToggle={toggleHumanRole}
                  onSelectAll={selectAllHumanRoles}
                  onClearAll={clearAllHumanRoles}
                  className="max-h-28"
                  searchBox={
                    <Input 
                      value={humanRoleQuery} 
                      placeholder="Tìm kiếm chức danh..." 
                      onChange={(e) => setHumanRoleQuery(e.target.value)} 
                      className="mb-2 mt-1"
                    />
                  }
                />
                {filteredHumanRoles.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Không có kết quả</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <ToggleButtonsPanel
                  title="Phòng ban"
                  options={filteredHumanDepts.map(opt => ({ value: opt.value, label: opt.label }))}
                  selectedValues={(selectedNode.data as any)?.humanDepartments ?? []}
                  onToggle={toggleHumanDept}
                  onSelectAll={selectAllHumanDepts}
                  onClearAll={clearAllHumanDepts}
                  className="max-h-28"
                  searchBox={
                    <Input 
                      value={humanDeptQuery} 
                      placeholder="Tìm kiếm phòng ban..." 
                      onChange={(e) => setHumanDeptQuery(e.target.value)} 
                      className="mb-2 mt-1"
                    />
                  }
                />
                {filteredHumanDepts.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Không có kết quả</div>
                ) : null}
              </div>

              {/* Show Người only when both Chức danh and Phòng ban have selections */}
              {(() => {
                const data: any = selectedNode.data || {}
                const hasRoles = (data?.humanRoles ?? []).length > 0
                const hasDepts = (data?.humanDepartments ?? []).length > 0
                if (!(hasRoles && hasDepts)) return null
                return (
                  <div className="space-y-2">
                    <ToggleButtonsPanel
                      title="Người"
                      options={filteredHumanPeople.map(opt => ({ value: opt.value, label: opt.label }))}
                      selectedValues={(selectedNode.data as any)?.humanPersonsByRole ?? []}
                      onToggle={toggleHumanPersonRole}
                      onSelectAll={selectAllRolePeople}
                      onClearAll={clearAllRolePeople}
                      className="max-h-28"
                      searchBox={
                        <Input 
                          value={humanPersonQuery} 
                          placeholder="Tìm kiếm người..." 
                          onChange={(e) => setHumanPersonQuery(e.target.value)} 
                          className="mb-2 mt-1"
                        />
                      }
                    />
                    {filteredHumanPeople.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Không có kết quả</div>
                    ) : null}
                  </div>
                )
              })()}
            </>
          ) : null}

        </div>
      ) : null}

      {selectedNode?.type === 'decision' || selectedNode?.type === 'condition' ? (
        <div className="mt-4 space-y-4">
          {/* Decision Logic Section - Simplified */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Giá trị kiểm tra</div>
            <Input
              value={(selectedNode.data as any)?.conditionValue ?? ''}
              placeholder="Nhập giá trị để so sánh..."
              onChange={(e) => updateNodeData(selectedNode.id, { conditionValue: e.target.value })}
            />
            <div className="text-xs text-muted-foreground">
              Nếu input = giá trị kiểm tra thì đi nhánh "Có", ngược lại đi nhánh "Không"
            </div>
          </div>

          {/* Connection Analysis */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Phân tích kết nối</div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Đầu vào:</span>
                <span className="font-medium">{edges.filter(e => e.target === selectedNode.id).length} kết nối</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Đầu ra:</span>
                <span className="font-medium">{edges.filter(e => e.source === selectedNode.id).length} kết nối</span>
              </div>
            </div>
          </div>

          {/* Routing Rules */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Quy tắc định tuyến</div>
            <div className="space-y-2">
              <div className="border rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Nếu input = giá trị kiểm tra</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Có</Badge>
                </div>
              </div>
              <div className="border rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Nếu input ≠ giá trị kiểm tra</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">Không</Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Connected Nodes Overview */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Nodes được kết nối</div>
            <div className="border rounded-lg p-3 space-y-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Đầu vào từ:</div>
                <div className="space-y-1">
                  {edges.filter(e => e.target === selectedNode.id).map(edge => {
                    const sourceNode = nodes.find(n => n.id === edge.source)
                    return (
                      <div key={edge.id} className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-muted rounded text-xs">
                          {sourceNode?.type}
                        </span>
                        <span>{sourceNode?.data?.label || 'Unnamed'}</span>
                      </div>
                    )
                  })}
                  {edges.filter(e => e.target === selectedNode.id).length === 0 && (
                    <div className="text-xs text-muted-foreground">Không có kết nối đầu vào</div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Đầu ra đến:</div>
                <div className="space-y-1">
                  {edges.filter(e => e.source === selectedNode.id).map(edge => {
                    const targetNode = nodes.find(n => n.id === edge.target)
                    return (
                      <div key={edge.id} className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {(edge.data as any)?.condition || 'Default'}
                        </span>
                        <span className="px-2 py-1 bg-muted rounded text-xs">
                          {targetNode?.type}
                        </span>
                        <span>{targetNode?.data?.label || 'Unnamed'}</span>
                      </div>
                    )
                  })}
                  {edges.filter(e => e.source === selectedNode.id).length === 0 && (
                    <div className="text-xs text-muted-foreground">Không có kết nối đầu ra</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedNode?.type === 'get' ? (
        <div className="mt-4 space-y-4">
          <IntegrationSection description="Chỉ định API hoặc truy vấn database để lấy dữ liệu cho bước này." />
        </div>
      ) : null}

      {selectedNode?.type === 'set' ? (
        <div className="mt-4 space-y-4">
          <IntegrationSection description="Khai báo API hoặc truy vấn database để ghi dữ liệu tới hệ thống." />
        </div>
      ) : null}

      {selectedEdge ? (
        <div className="mt-4 text-xs text-muted-foreground">
          Gợi ý: Với nhánh Yes/No bạn có thể đặt nhãn như "Có" hoặc "Không".
        </div>
      ) : null}
    </div>
  )
}

export default DetailBar
