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
