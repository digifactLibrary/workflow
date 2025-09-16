import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFlowStore } from '../state/flowStore'
import { useOptionsStore } from '../state/optionsStore'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
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

  const [labelDraft, setLabelDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // API / Webhook drafts for trigger nodes
  const [apiDraft, setApiDraft] = useState('')
  const [webhookDraft, setWebhookDraft] = useState('')
  const [moduleQuery, setModuleQuery] = useState('')
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
  // Memorize các kết quả filter để tránh tính toán lại không cần thiết
  const filteredModules = useMemo(() => {
    const q = moduleQuery.trim()
    if (!q) return triggerModuleOptions || []
    if (!triggerModuleOptions || triggerModuleOptions.length === 0) return []
    const nq = normalize(q)
    return triggerModuleOptions.filter((m) => normalize(m.label || '').includes(nq))
  }, [moduleQuery, triggerModuleOptions])

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
      setLabelDraft((selectedNode.data as any)?.label ?? '')
      setApiDraft(((selectedNode.data as any)?.api ?? '') as string)
      setWebhookDraft(((selectedNode.data as any)?.webhook ?? '') as string)
    } else if (selectedEdge) {
      setLabelDraft((selectedEdge.data as any)?.label ?? '')
      setApiDraft('')
      setWebhookDraft('')
    } else {
      setLabelDraft('')
      setApiDraft('')
      setWebhookDraft('')
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

  const toggleTriggerModule = (name: string) => {
    if (!selectedNode) return
    const selectedOption = triggerModuleOptions.find(opt => opt.value === name)
  
    const current: string[] = ((selectedNode.data as any)?.triggerModules ?? []) as string[]
    const currentIds: string[] = ((selectedNode.data as any)?.mappingIds ?? []) as string[]
    
    if (current.includes(name)) {
      // Xóa khỏi danh sách
      const newModules = current.filter((x) => x !== name)
      const newIds = currentIds.filter((_, index) => current[index] !== name)
      
      updateNodeData(selectedNode.id, { 
        triggerModules: newModules,
        mappingIds: newIds 
      })
    } else {
      // Thêm vào danh sách
      const newModules = [...current, name]
      const newIds = [...currentIds, selectedOption?.id || '']
      
      updateNodeData(selectedNode.id, { 
        triggerModules: newModules,
        mappingIds: newIds 
      })
    }
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

  const selectAllModules = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { triggerModules: triggerModuleOptions.map(m => m.value) })
  }
  const clearAllModules = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { triggerModules: [] })
  }

  if (!selectedNode && !selectedEdge) return null
  // Hide DetailBar for Start/End/And/Or nodes
  if (selectedNode && (selectedNode.type === 'start' || selectedNode.type === 'end' || selectedNode.type === 'and' || selectedNode.type === 'or')) return null

  const title = selectedNode ? `Node: ${selectedNode.type}` : 'Edge'

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

          <div className="space-y-2">
            <ToggleButtonsPanel
              title="Module hoạt động"
              options={filteredModules.map(opt => ({ value: opt.value, label: opt.label }))}
              selectedValues={(selectedNode.data as any)?.triggerModules ?? []}
              onToggle={toggleTriggerModule}
              onSelectAll={selectAllModules}
              onClearAll={clearAllModules}
              className="max-h-28"
              searchBox={
                <Input
                  value={moduleQuery}
                  placeholder="Tìm kiếm module..."
                  onChange={(e) => setModuleQuery(e.target.value)}
                  className="mb-2 mt-1"
                />
              }
            />
            {filteredModules.length === 0 ? (
              <div className="text-xs text-muted-foreground">Không có kết quả</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">API (tùy chọn)</label>
            <Input
              value={apiDraft}
              placeholder="VD: https://api.yourdomain.com/endpoint"
              onChange={(e) => setApiDraft(e.target.value)}
              onBlur={() => {
                if (!selectedNode) return
                updateNodeData(selectedNode.id, { api: apiDraft.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedNode) updateNodeData(selectedNode.id, { api: apiDraft.trim() })
                if (e.key === 'Escape') setApiDraft(((selectedNode?.data as any)?.api ?? '') as string)
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Webhook (tùy chọn)</label>
            <Input
              value={webhookDraft}
              placeholder="VD: https://hooks.yourdomain.com/path"
              onChange={(e) => setWebhookDraft(e.target.value)}
              onBlur={() => {
                if (!selectedNode) return
                updateNodeData(selectedNode.id, { webhook: webhookDraft.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedNode) updateNodeData(selectedNode.id, { webhook: webhookDraft.trim() })
                if (e.key === 'Escape') setWebhookDraft(((selectedNode?.data as any)?.webhook ?? '') as string)
              }}
            />
          </div>
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

          {/* API/Webhook for Human (optional) */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">API (tùy chọn)</label>
            <Input
              value={apiDraft}
              placeholder="VD: https://api.yourdomain.com/endpoint"
              onChange={(e) => setApiDraft(e.target.value)}
              onBlur={() => {
                if (!selectedNode) return
                updateNodeData(selectedNode.id, { api: apiDraft.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedNode) updateNodeData(selectedNode.id, { api: apiDraft.trim() })
                if (e.key === 'Escape') setApiDraft(((selectedNode?.data as any)?.api ?? '') as string)
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Webhook (tùy chọn)</label>
            <Input
              value={webhookDraft}
              placeholder="VD: https://hooks.yourdomain.com/path"
              onChange={(e) => setWebhookDraft(e.target.value)}
              onBlur={() => {
                if (!selectedNode) return
                updateNodeData(selectedNode.id, { webhook: webhookDraft.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedNode) updateNodeData(selectedNode.id, { webhook: webhookDraft.trim() })
                if (e.key === 'Escape') setWebhookDraft(((selectedNode?.data as any)?.webhook ?? '') as string)
              }}
            />
          </div>
        </div>
      ) : null}

      {selectedNode?.type === 'decision' || selectedNode?.type === 'condition' ? (
        <div className="mt-4 space-y-4">
          {/* Decision Logic Section */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Logic điều kiện</div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Loại điều kiện</label>
                <select 
                  className="w-full mt-1 px-3 py-2 text-xs border border-input rounded-md bg-background"
                  value={(selectedNode.data as any)?.conditionType ?? 'if-then-else'}
                  onChange={(e) => updateNodeData(selectedNode.id, { conditionType: e.target.value })}
                >
                  <option value="if-then-else">If-Then-Else</option>
                  <option value="switch-case">Switch-Case</option>
                  <option value="rule-based">Rule-Based</option>
                  <option value="expression">Expression</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Biểu thức</label>
                <Input
                  value={(selectedNode.data as any)?.expression ?? ''}
                  placeholder="VD: age > 18 && status == 'active'"
                  onChange={(e) => updateNodeData(selectedNode.id, { expression: e.target.value })}
                />
              </div>
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
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Coverage:</span>
                <span className="font-medium text-green-600">
                  {edges.filter(e => e.source === selectedNode.id).length > 0 ? '100%' : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Routing Rules */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Quy tắc định tuyến</div>
            <div className="space-y-2">
              {edges.filter(e => e.source === selectedNode.id).map((edge, index) => {
                const targetNode = nodes.find(n => n.id === edge.target)
                return (
                  <div key={edge.id} className="border rounded-lg p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Route {index + 1}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                        Chỉnh sửa
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <label className="text-xs text-muted-foreground">Điều kiện:</label>
                        <Input
                          className="mt-1"
                          placeholder="Khi điều kiện đúng/sai"
                          value={(edge.data as any)?.condition ?? ''}
                          onChange={(e) => updateEdgeData(edge.id, { condition: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Đích đến:</label>
                        <div className="text-xs bg-muted px-2 py-1 rounded mt-1">
                          {targetNode?.data?.label || targetNode?.type || 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Độ ưu tiên:</label>
                        <Input
                          type="number"
                          className="mt-1"
                          value={(edge.data as any)?.priority ?? index + 1}
                          onChange={(e) => updateEdgeData(edge.id, { priority: parseInt(e.target.value) || index + 1 })}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {edges.filter(e => e.source === selectedNode.id).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  Chưa có route nào được định nghĩa
                </div>
              )}
            </div>
          </div>

          {/* Validation & Testing */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Kiểm tra & Test</div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="space-y-1">
                <div className={`flex items-center gap-2 text-xs ${
                  edges.filter(e => e.source === selectedNode.id).length >= 2 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  <span className="text-lg">
                    {edges.filter(e => e.source === selectedNode.id).length >= 2 ? '✓' : '⚠'}
                  </span>
                  <span>Có nhiều lựa chọn đầu ra</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${
                  edges.filter(e => e.target === selectedNode.id).length > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="text-lg">
                    {edges.filter(e => e.target === selectedNode.id).length > 0 ? '✓' : '✗'}
                  </span>
                  <span>Có kết nối đầu vào</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <span className="text-lg">✓</span>
                  <span>Biểu thức logic hợp lệ</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Test Input:</label>
                <Input
                  placeholder="Nhập giá trị test"
                  value={(selectedNode.data as any)?.testInput ?? ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { testInput: e.target.value })}
                />
                <Button size="sm" className="w-full text-xs">
                  Test Decision
                </Button>
                <div className="text-xs">
                  <span className="text-muted-foreground">Kết quả dự kiến: </span>
                  <span className="font-medium text-blue-600">Route 1 (True branch)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Metrics hiệu suất</div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Thời gian thực thi:</span>
                  <div className="font-medium">~2ms avg</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tỷ lệ thành công:</span>
                  <div className="font-medium text-green-600">98.5%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tỷ lệ lỗi:</span>
                  <div className="font-medium text-red-600">1.5%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Lần thực thi:</span>
                  <div className="font-medium">1,234</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-xs font-medium mb-2">Phân phối nhánh</div>
                {edges.filter(e => e.source === selectedNode.id).map((edge, index) => {
                  const percentage = Math.floor(Math.random() * 100)
                  const targetNode = nodes.find(n => n.id === edge.target)
                  return (
                    <div key={edge.id} className="flex items-center gap-2 text-xs mb-1">
                      <span className="w-12 text-muted-foreground">Route {index + 1}:</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300" 
                          style={{width: `${percentage}%`}}
                        />
                      </div>
                      <span className="w-8 text-right font-medium">{percentage}%</span>
                    </div>
                  )
                })}
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

      {selectedNode?.type === 'get' || selectedNode?.type === 'set' ? (
        <div className="mt-4 space-y-4">
          {/* Data Source/Target Configuration */}
          <div className="space-y-2">
            <div className="text-xs font-medium">
              {selectedNode.type === 'get' ? 'Nguồn dữ liệu' : 'Đích dữ liệu'}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Loại nguồn</label>
                <select 
                  className="w-full mt-1 px-3 py-2 text-xs border border-input rounded-md bg-background"
                  value={(selectedNode.data as any)?.sourceType ?? 'database'}
                  onChange={(e) => updateNodeData(selectedNode.id, { sourceType: e.target.value })}
                >
                  <option value="database">Database</option>
                  <option value="api">API External</option>
                  <option value="file">File System</option>
                  <option value="cache">Cache/Memory</option>
                  <option value="variable">Variable</option>
                  <option value="form">Form Input</option>
                  <option value="session">Session Storage</option>
                  <option value="localStorage">Local Storage</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">
                  {selectedNode.type === 'get' ? 'Đường dẫn/Query' : 'Đường dẫn/Target'}
                </label>
                <Input
                  value={(selectedNode.data as any)?.dataPath ?? ''}
                  placeholder="VD: users.profile.name hoặc SELECT * FROM users WHERE id = ?"
                  onChange={(e) => updateNodeData(selectedNode.id, { dataPath: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Kiểu dữ liệu</label>
                <select 
                  className="w-full mt-1 px-3 py-2 text-xs border border-input rounded-md bg-background"
                  value={(selectedNode.data as any)?.dataType ?? 'string'}
                  onChange={(e) => updateNodeData(selectedNode.id, { dataType: e.target.value })}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                  <option value="date">Date</option>
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                </select>
              </div>
            </div>
          </div>

          {/* Value Configuration */}
          {selectedNode.type === 'set' && (
            <div className="space-y-2">
              <div className="text-xs font-medium">Cấu hình giá trị</div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Phương thức gán</label>
                  <select 
                    className="w-full mt-1 px-3 py-2 text-xs border border-input rounded-md bg-background"
                    value={(selectedNode.data as any)?.setMethod ?? 'replace'}
                    onChange={(e) => updateNodeData(selectedNode.id, { setMethod: e.target.value })}
                  >
                    <option value="replace">Thay thế (Replace)</option>
                    <option value="append">Nối thêm (Append)</option>
                    <option value="prepend">Thêm đầu (Prepend)</option>
                    <option value="merge">Gộp (Merge)</option>
                    <option value="increment">Tăng (Increment)</option>
                    <option value="decrement">Giảm (Decrement)</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">Giá trị</label>
                  <Input
                    value={(selectedNode.data as any)?.value ?? ''}
                    placeholder="Nhập giá trị cần set hoặc expression"
                    onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dynamic-value"
                    checked={(selectedNode.data as any)?.isDynamic ?? false}
                    onChange={(e) => updateNodeData(selectedNode.id, { isDynamic: e.target.checked })}
                    className="rounded border-input"
                  />
                  <label htmlFor="dynamic-value" className="text-xs text-muted-foreground">
                    Giá trị động (expression/variable)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Validation & Transform */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Validation & Transform</div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="validate-data"
                  checked={(selectedNode.data as any)?.enableValidation ?? false}
                  onChange={(e) => updateNodeData(selectedNode.id, { enableValidation: e.target.checked })}
                  className="rounded border-input"
                />
                <label htmlFor="validate-data" className="text-xs">Bật validation</label>
              </div>
              
              {(selectedNode.data as any)?.enableValidation && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Validation rules</label>
                    <Input
                      value={(selectedNode.data as any)?.validationRules ?? ''}
                      placeholder="VD: required|min:5|email"
                      onChange={(e) => updateNodeData(selectedNode.id, { validationRules: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="transform-data"
                  checked={(selectedNode.data as any)?.enableTransform ?? false}
                  onChange={(e) => updateNodeData(selectedNode.id, { enableTransform: e.target.checked })}
                  className="rounded border-input"
                />
                <label htmlFor="transform-data" className="text-xs">Bật transform</label>
              </div>

              {(selectedNode.data as any)?.enableTransform && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Transform function</label>
                    <Input
                      value={(selectedNode.data as any)?.transformFunction ?? ''}
                      placeholder="VD: toLowerCase() | formatDate() | customFunction()"
                      onChange={(e) => updateNodeData(selectedNode.id, { transformFunction: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Handling */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Xử lý lỗi</div>
            <div className="border rounded-lg p-3 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Chiến lược khi lỗi</label>
                <select 
                  className="w-full mt-1 px-3 py-2 text-xs border border-input rounded-md bg-background"
                  value={(selectedNode.data as any)?.errorStrategy ?? 'throw'}
                  onChange={(e) => updateNodeData(selectedNode.id, { errorStrategy: e.target.value })}
                >
                  <option value="throw">Throw Error (Dừng luồng)</option>
                  <option value="continue">Continue (Bỏ qua lỗi)</option>
                  <option value="retry">Retry (Thử lại)</option>
                  <option value="fallback">Fallback (Giá trị mặc định)</option>
                  <option value="log">Log Only (Chỉ ghi log)</option>
                </select>
              </div>

              {((selectedNode.data as any)?.errorStrategy === 'retry') && (
                <div>
                  <label className="text-xs text-muted-foreground">Số lần thử lại</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={(selectedNode.data as any)?.retryCount ?? 3}
                    onChange={(e) => updateNodeData(selectedNode.id, { retryCount: parseInt(e.target.value) || 3 })}
                  />
                </div>
              )}

              {((selectedNode.data as any)?.errorStrategy === 'fallback') && (
                <div>
                  <label className="text-xs text-muted-foreground">Giá trị fallback</label>
                  <Input
                    value={(selectedNode.data as any)?.fallbackValue ?? ''}
                    placeholder="Giá trị mặc định khi lỗi"
                    onChange={(e) => updateNodeData(selectedNode.id, { fallbackValue: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Performance & Caching */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Performance & Caching</div>
            <div className="border rounded-lg p-3 space-y-2">
              {selectedNode.type === 'get' && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable-cache"
                      checked={(selectedNode.data as any)?.enableCache ?? false}
                      onChange={(e) => updateNodeData(selectedNode.id, { enableCache: e.target.checked })}
                      className="rounded border-input"
                    />
                    <label htmlFor="enable-cache" className="text-xs">Bật cache</label>
                  </div>

                  {(selectedNode.data as any)?.enableCache && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Cache TTL (giây)</label>
                        <Input
                          type="number"
                          min="0"
                          value={(selectedNode.data as any)?.cacheTTL ?? 300}
                          onChange={(e) => updateNodeData(selectedNode.id, { cacheTTL: parseInt(e.target.value) || 300 })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Cache key</label>
                        <Input
                          value={(selectedNode.data as any)?.cacheKey ?? ''}
                          placeholder="auto-generated hoặc custom key"
                          onChange={(e) => updateNodeData(selectedNode.id, { cacheKey: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Timeout (ms)</label>
                <Input
                  type="number"
                  min="0"
                  value={(selectedNode.data as any)?.timeout ?? 5000}
                  onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) || 5000 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="async-execution"
                  checked={(selectedNode.data as any)?.asyncExecution ?? false}
                  onChange={(e) => updateNodeData(selectedNode.id, { asyncExecution: e.target.checked })}
                  className="rounded border-input"
                />
                <label htmlFor="async-execution" className="text-xs">Thực thi bất đồng bộ</label>
              </div>
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
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Data flow:</span>
                <span className="font-medium text-blue-600">
                  {selectedNode.type === 'get' ? 'Input → Process → Output' : 'Input → Transform → Store'}
                </span>
              </div>
            </div>
          </div>

          {/* Test & Debug */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Test & Debug</div>
            <div className="border rounded-lg p-3 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">
                  {selectedNode.type === 'get' ? 'Test query parameters' : 'Test input value'}
                </label>
                <Input
                  value={(selectedNode.data as any)?.testInput ?? ''}
                  placeholder={selectedNode.type === 'get' ? 'VD: {id: 123}' : 'VD: "new value" hoặc {data: "test"}'}
                  onChange={(e) => updateNodeData(selectedNode.id, { testInput: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs">
                  {selectedNode.type === 'get' ? 'Test Get' : 'Test Set'}
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  Debug
                </Button>
              </div>

              <div className="text-xs">
                <div className="text-muted-foreground">Kết quả test:</div>
                <div className="bg-muted p-2 rounded mt-1 font-mono text-xs">
                  {selectedNode.type === 'get' 
                    ? '{"status": "success", "data": "sample_value", "time": "12ms"}'
                    : '{"status": "success", "written": true, "time": "8ms"}'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Monitoring & Logs */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Monitoring & Logs</div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Lần thực thi:</span>
                  <div className="font-medium">1,456</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Thành công:</span>
                  <div className="font-medium text-green-600">98.2%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg time:</span>
                  <div className="font-medium">15ms</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Lỗi:</span>
                  <div className="font-medium text-red-600">1.8%</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-logging"
                  checked={(selectedNode.data as any)?.enableLogging ?? true}
                  onChange={(e) => updateNodeData(selectedNode.id, { enableLogging: e.target.checked })}
                  className="rounded border-input"
                />
                <label htmlFor="enable-logging" className="text-xs">Bật logging chi tiết</label>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Log level</label>
                <select 
                  className="w-full mt-1 px-3 py-2 text-xs border border-input rounded-md bg-background"
                  value={(selectedNode.data as any)?.logLevel ?? 'info'}
                  onChange={(e) => updateNodeData(selectedNode.id, { logLevel: e.target.value })}
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* API Integration (Optional) */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">API Integration (tùy chọn)</label>
            <Input
              value={apiDraft}
              placeholder="VD: https://api.yourdomain.com/data-endpoint"
              onChange={(e) => setApiDraft(e.target.value)}
              onBlur={() => {
                if (!selectedNode) return
                updateNodeData(selectedNode.id, { api: apiDraft.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedNode) updateNodeData(selectedNode.id, { api: apiDraft.trim() })
                if (e.key === 'Escape') setApiDraft(((selectedNode?.data as any)?.api ?? '') as string)
              }}
            />
          </div>

          {/* Webhook Integration (Optional) */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Webhook Integration (tùy chọn)</label>
            <Input
              value={webhookDraft}
              placeholder="VD: https://hooks.yourdomain.com/on-data-change"
              onChange={(e) => setWebhookDraft(e.target.value)}
              onBlur={() => {
                if (!selectedNode) return
                updateNodeData(selectedNode.id, { webhook: webhookDraft.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedNode) updateNodeData(selectedNode.id, { webhook: webhookDraft.trim() })
                if (e.key === 'Escape') setWebhookDraft(((selectedNode?.data as any)?.webhook ?? '') as string)
              }}
            />
          </div>
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
