import { useEffect, useMemo, useRef, useState } from 'react'
import { useFlowStore } from '../state/flowStore'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { PlusCircle, Pencil, Trash2, Archive, ArchiveRestore, CheckCircle2, XCircle, Mail, Bell, MessageSquareText } from 'lucide-react'

// Options for Trigger configuration (with icons)
const triggerEventOptions = [
  { value: 'tạo mới', label: 'Tạo mới', Icon: PlusCircle },
  { value: 'chỉnh sửa', label: 'Chỉnh sửa', Icon: Pencil },
  { value: 'xóa', label: 'Xóa', Icon: Trash2 },
  { value: 'lưu trữ', label: 'Lưu trữ', Icon: Archive },
  { value: 'hủy lưu trữ', label: 'Hủy lưu trữ', Icon: ArchiveRestore },
  { value: 'phê duyệt', label: 'Phê duyệt', Icon: CheckCircle2 },
  { value: 'từ chối phê duyệt', label: 'Từ chối phê duyệt', Icon: XCircle },
]

const triggerModuleOptions = [
  'Quản lý đơn hàng',
  'Lên báo giá mới',
  'Danh sách báo giá',
  'Danh sách khách hàng',
  'Danh sách đơn hàng',

  'Quản lý mua sắm',
  'Nhà cung cấp',
  'Cân đối - Dự trù',
  'Yêu cầu mua hàng',

  'Thư viện tài liệu',
  'Loại nguyên vật liệu',
  'Loại vật tư tiêu hao',
  'Loại công cụ thiết bị',
  'Loại sản phẩm',
  'Loại thành phẩm',
  'Quy trình sản xuất',
  'Loại công đoạn',
  'Quản lý tài liệu',

  'Quản lý công cụ thiết bị',
  'Danh sách công cụ thiết bị',
  'Danh sách vật tư tiêu hao',
  'Quản lý kiểm kê',
  'Quản lý kiểm định',
  'Quản lý bảo dưỡng',
  'Quản lý sửa chữa',

  'Quản lý kho',
  'Nhập kho vật tư',
  'Xuất kho vật tư',
  'Tồn kho vật tư',

  'Quản lý sản xuất',
  'Kế hoạch sản xuất',
  'Lệnh sản xuất',
  'Đề nghị xuất vật tư',

  'Thực thi sản xuất',
  'Ghi nhận sản xuất',
  'Lịch sử vấn đề sản xuất',

  'Quản lý chất lượng',
  'Phương pháp kiểm tra',
  'Tiêu chuẩn kiểm tra cơ sở',
  'Thực hiện kiểm tra',
  'Hồ sơ sản phẩm',
  'Quản lý vấn đề',

  'Quản lý nhân sự',
  'Danh sách nhân sự',
  'Cơ cấu tổ chức',

  'Giám sát - Báo cáo',
  'Giám sát vận hành',
  'Báo cáo SQCD',

  'Tính năng hỗ trợ',
  'Chat nội bộ',
  'Tìm kiếm nhanh',
  'ChatbotAI',
  'Quản lý dự án - OpenProject',
  'Tự động hóa quy trình',
  'Email nội bộ',
  'Khảo sát nội bộ',
  'Đào tạo nội bộ',
  'Đánh giá nội bộ',
  'Trình duyệt web',

  'Quản trị viên',
  'Khai báo dùng chung',
  'Quy tắc sinh mã tự động',
  'Luồng phê duyệt',
  'Tham chiếu có điều kiện',
]

// Options for Send configuration (with icons)
const sendKindOptions = [
  { value: 'Email', label: 'Email', Icon: Mail },
  { value: 'Notification in app', label: 'Notification in app', Icon: Bell },
  { value: 'ChatApp', label: 'ChatApp', Icon: MessageSquareText },
]

// Human configuration lists
const humanPersonTypeOptions = [
  { value: 'personal' as const, label: 'Cá nhân' },
  { value: 'role' as const, label: 'Chức danh' },
]

const humanPeopleOptions = [
  'Nguyễn Minh Khoa',
  'Trần Thị Thu Hà',
  'Lê Anh Tuấn',
  'Phạm Ngọc Linh',
  'Hoàng Gia Huy',
  'Bùi Thanh Trúc',
  'Đặng Quang Minh',
  'Vũ Mai Anh',
  'Đỗ Nhật Nam',
  'Phan Khánh Vy',
]

const humanRoleOptions = [
  'Lead',
  'President',
  'Software Engineer',
  'Product Manager',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'QA Engineer',
  'UI/UX Designer',
  'Solutions Architect',
  'Data Engineer',
  'Data Scientist',
  'Engineering Manager',
]

const humanDepartmentOptions = [
  'Kỹ thuật (Engineering)',
  'Quản lý Sản phẩm (Product Management)',
  'Đảm bảo Chất lượng – QA',
  'DevOps / Nền tảng (Platform)',
  'Dữ liệu & Phân tích (Data & Analytics)',
  'Kinh doanh (Sales)',
  'Marketing',
  'Chăm sóc Khách hàng / Customer Success',
  'Nhân sự (People/HR)',
  'Tài chính (Finance)',
]

export function DetailBar() {
  const selection = useFlowStore((s) => s.selection)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData)

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

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filteredModules = useMemo(() => {
    const q = moduleQuery.trim()
    if (!q) return triggerModuleOptions
    const nq = normalize(q)
    return triggerModuleOptions.filter((m) => normalize(m).includes(nq))
  }, [moduleQuery])

  const filteredHumanPeople = useMemo(() => {
    const q = humanPersonQuery.trim()
    if (!q) return humanPeopleOptions
    const nq = normalize(q)
    return humanPeopleOptions.filter((m) => normalize(m).includes(nq))
  }, [humanPersonQuery])

  const filteredHumanRoles = useMemo(() => {
    const q = humanRoleQuery.trim()
    if (!q) return humanRoleOptions
    const nq = normalize(q)
    return humanRoleOptions.filter((m) => normalize(m).includes(nq))
  }, [humanRoleQuery])

  const filteredHumanDepts = useMemo(() => {
    const q = humanDeptQuery.trim()
    if (!q) return humanDepartmentOptions
    const nq = normalize(q)
    return humanDepartmentOptions.filter((m) => normalize(m).includes(nq))
  }, [humanDeptQuery])

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
    const current: string[] = ((selectedNode.data as any)?.triggerModules ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    updateNodeData(selectedNode.id, { triggerModules: next })
  }

  const toggleSendKind = (name: string) => {
    if (!selectedNode) return
    const current: string[] = ((selectedNode.data as any)?.sendKinds ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    updateNodeData(selectedNode.id, { sendKinds: next })
  }

  const setHumanType = (value: 'personal' | 'role') => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanType: value })
  }

  const toggleHumanPersonPersonal = (name: string) => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const current: string[] = (data?.humanPersonsPersonal ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    const byRole: string[] = (data?.humanPersonsByRole ?? []) as string[]
    const union = Array.from(new Set<string>([...next, ...byRole]))
    updateNodeData(selectedNode.id, { humanPersonsPersonal: next, humanPersons: union })
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
    const current: string[] = ((selectedNode.data as any)?.humanRoles ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    updateNodeData(selectedNode.id, { humanRoles: next })
  }

  const toggleHumanDept = (name: string) => {
    if (!selectedNode) return
    const current: string[] = ((selectedNode.data as any)?.humanDepartments ?? []) as string[]
    const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    updateNodeData(selectedNode.id, { humanDepartments: next })
  }

  const selectAllHumanRoles = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanRoles: [...humanRoleOptions] })
  }
  const clearAllHumanRoles = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanRoles: [] })
  }
  const selectAllHumanDepts = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanDepartments: [...humanDepartmentOptions] })
  }
  const clearAllHumanDepts = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { humanDepartments: [] })
  }
  const selectAllPersonalPeople = () => {
    if (!selectedNode) return
    const data: any = selectedNode.data || {}
    const byRole: string[] = (data?.humanPersonsByRole ?? []) as string[]
    const all = [...humanPeopleOptions]
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
    const all = [...humanPeopleOptions]
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

  // Auto-select all people (role-block) whenever readiness changes from false -> true
  const roleDeptReadyRef = useRef(false)
  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'human') return
    const data: any = selectedNode.data || {}
    const humanType = (data?.humanType ?? 'personal') as 'personal' | 'role'
    if (humanType !== 'role') {
      roleDeptReadyRef.current = false
      return
    }
    const roles: string[] = (data?.humanRoles ?? []) as string[]
    const depts: string[] = (data?.humanDepartments ?? []) as string[]
    const hasBoth = roles.length > 0 && depts.length > 0
    if (hasBoth && !roleDeptReadyRef.current) {
      const personal: string[] = (data?.humanPersonsPersonal ?? []) as string[]
      const all = [...humanPeopleOptions]
      const union = Array.from(new Set<string>([...personal, ...all]))
      updateNodeData(selectedNode.id, { humanPersonsByRole: all, humanPersons: union })
    }
    roleDeptReadyRef.current = hasBoth
  }, [selectedNode])

  const selectAllTriggerEvents = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { triggerEvents: triggerEventOptions.map((o) => o.value) })
  }
  const clearAllTriggerEvents = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { triggerEvents: [] })
  }

  const selectAllModules = () => {
    if (!selectedNode) return
    updateNodeData(selectedNode.id, { triggerModules: [...triggerModuleOptions] })
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
      <div className="text-sm font-semibold opacity-80">Chi tiết</div>
      <div className="text-xs text-muted-foreground">{title}</div>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">Sự kiện trigger</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectAllTriggerEvents}>
                  Chọn tất cả
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAllTriggerEvents}>
                  Bỏ chọn tất cả
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-2 max-h-48 overflow-auto">
              <div className="flex flex-wrap gap-2">
                {triggerEventOptions.map(({ value, label, Icon }) => {
                  const checked = ((selectedNode.data as any)?.triggerEvents ?? []).includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        checked
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                      }`}
                      onClick={() => toggleTriggerEvent(value)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">Module hoạt động</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectAllModules}>
                  Chọn tất cả
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAllModules}>
                  Bỏ chọn tất cả
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Input
                value={moduleQuery}
                placeholder="Tìm kiếm module..."
                onChange={(e) => setModuleQuery(e.target.value)}
              />
              <div className="border rounded-lg p-2 max-h-60 overflow-auto">
                <div className="flex flex-wrap gap-2">
                  {filteredModules.map((opt) => {
                    const checked = ((selectedNode.data as any)?.triggerModules ?? []).includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          checked
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                        }`}
                        onClick={() => toggleTriggerModule(opt)}
                      >
                        {opt}
                      </button>
                    )
                  })}
                  {filteredModules.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Không có kết quả</div>
                  ) : null}
                </div>
              </div>
            </div>
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
          <div className="text-xs font-medium">Kiểu gửi tin nhắn</div>
          <div className="border rounded-lg p-2">
            <div className="flex flex-wrap gap-2">
              {sendKindOptions.map(({ value, label, Icon }) => {
                const checked = ((selectedNode.data as any)?.sendKinds ?? []).includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      checked
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                    }`}
                    onClick={() => toggleSendKind(value)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {selectedNode?.type === 'human' ? (
        <div className="mt-4 space-y-4">
          {/* Người: Cá nhân / Chức danh */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Người</div>
            <div className="flex flex-wrap gap-2">
              {humanPersonTypeOptions.map(({ value, label }) => {
                const checked = ((selectedNode.data as any)?.humanType ?? 'personal') === value
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
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Người</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectAllPersonalPeople}>Chọn tất cả</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAllPersonalPeople}>Bỏ chọn tất cả</Button>
                </div>
              </div>
              <Input value={humanPersonQuery} placeholder="Tìm kiếm người..." onChange={(e) => setHumanPersonQuery(e.target.value)} />
              <div className="border rounded-lg p-2 max-h-60 overflow-auto">
                <div className="flex flex-wrap gap-2">
                  {filteredHumanPeople.map((opt) => {
                    const checked = ((selectedNode.data as any)?.humanPersonsPersonal ?? []).includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          checked
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                        }`}
                        onClick={() => toggleHumanPersonPersonal(opt)}
                      >
                        {opt}
                      </button>
                    )
                  })}
                  {filteredHumanPeople.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Không có kết quả</div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* If Chức danh: show Roles, Departments, People */}
          {(((selectedNode.data as any)?.humanType ?? 'personal') === 'role') ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">Chức danh</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectAllHumanRoles}>Chọn tất cả</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAllHumanRoles}>Bỏ chọn tất cả</Button>
                  </div>
                </div>
                <Input value={humanRoleQuery} placeholder="Tìm kiếm chức danh..." onChange={(e) => setHumanRoleQuery(e.target.value)} />
                <div className="border rounded-lg p-2 max-h-60 overflow-auto">
                  <div className="flex flex-wrap gap-2">
                    {filteredHumanRoles.map((opt) => {
                      const checked = ((selectedNode.data as any)?.humanRoles ?? []).includes(opt)
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`text-xs px-3 py-1.5 rounded-full border transition ${
                            checked
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                          }`}
                          onClick={() => toggleHumanRole(opt)}
                        >
                          {opt}
                        </button>
                      )
                    })}
                    {filteredHumanRoles.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Không có kết quả</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">Phòng ban</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectAllHumanDepts}>Chọn tất cả</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAllHumanDepts}>Bỏ chọn tất cả</Button>
                  </div>
                </div>
                <Input value={humanDeptQuery} placeholder="Tìm kiếm phòng ban..." onChange={(e) => setHumanDeptQuery(e.target.value)} />
                <div className="border rounded-lg p-2 max-h-60 overflow-auto">
                  <div className="flex flex-wrap gap-2">
                    {filteredHumanDepts.map((opt) => {
                      const checked = ((selectedNode.data as any)?.humanDepartments ?? []).includes(opt)
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`text-xs px-3 py-1.5 rounded-full border transition ${
                            checked
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                          }`}
                          onClick={() => toggleHumanDept(opt)}
                        >
                          {opt}
                        </button>
                      )
                    })}
                    {filteredHumanDepts.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Không có kết quả</div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Show Người only when both Chức danh and Phòng ban have selections */}
              {(() => {
                const data: any = selectedNode.data || {}
                const hasRoles = (data?.humanRoles ?? []).length > 0
                const hasDepts = (data?.humanDepartments ?? []).length > 0
                if (!(hasRoles && hasDepts)) return null
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">Người</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={selectAllRolePeople}>Chọn tất cả</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAllRolePeople}>Bỏ chọn tất cả</Button>
                      </div>
                    </div>
                    <Input value={humanPersonQuery} placeholder="Tìm kiếm người..." onChange={(e) => setHumanPersonQuery(e.target.value)} />
                    <div className="border rounded-lg p-2 max-h-60 overflow-auto">
                      <div className="flex flex-wrap gap-2">
                        {filteredHumanPeople.map((opt) => {
                          const checked = ((selectedNode.data as any)?.humanPersonsByRole ?? []).includes(opt)
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                                checked
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-transparent hover:bg-muted border-input text-foreground/80'
                              }`}
                              onClick={() => toggleHumanPersonRole(opt)}
                            >
                              {opt}
                            </button>
                          )
                        })}
                        {filteredHumanPeople.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Không có kết quả</div>
                        ) : null}
                      </div>
                    </div>
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

      {selectedEdge ? (
        <div className="mt-4 text-xs text-muted-foreground">
          Gợi ý: Với nhánh Yes/No bạn có thể đặt nhãn như "Có" hoặc "Không".
        </div>
      ) : null}
    </div>
  )
}

export default DetailBar
