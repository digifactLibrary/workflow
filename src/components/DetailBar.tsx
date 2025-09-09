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

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filteredModules = useMemo(() => {
    const q = moduleQuery.trim()
    if (!q) return triggerModuleOptions
    const nq = normalize(q)
    return triggerModuleOptions.filter((m) => normalize(m).includes(nq))
  }, [moduleQuery])

  useEffect(() => {
    if (selectedNode) setLabelDraft((selectedNode.data as any)?.label ?? '')
    else if (selectedEdge) setLabelDraft((selectedEdge.data as any)?.label ?? '')
    else setLabelDraft('')
    // initialize API/Webhook drafts when switching selection
    if (selectedNode?.type === 'trigger') {
      setApiDraft(((selectedNode.data as any)?.api ?? '') as string)
      setWebhookDraft(((selectedNode.data as any)?.webhook ?? '') as string)
      setModuleQuery('')
    } else {
      setApiDraft('')
      setWebhookDraft('')
      setModuleQuery('')
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

      {selectedEdge ? (
        <div className="mt-4 text-xs text-muted-foreground">
          Gợi ý: Với nhánh Yes/No bạn có thể đặt nhãn như "Có" hoặc "Không".
        </div>
      ) : null}
    </div>
  )
}

export default DetailBar

