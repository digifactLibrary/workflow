import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Separator } from './ui/separator'
import { useWorkspaceStore } from '../state/workspaceStore'
import { ExternalLink, FolderPlus, Pencil, Trash2, Copy, LogOut } from 'lucide-react'
import { useAuthStore } from '../state/authStore'

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

  return (
    <div className="h-screen w-full bg-background">
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard Sơ đồ</h1>
            <p className="text-sm text-muted-foreground">Quản lý nhiều sơ đồ (tạo, mở, đổi tên, nhân đôi, xoá)</p>
          </div>
          <Button onClick={() => create()}>
            <FolderPlus className="mr-2 h-4 w-4" /> Sơ đồ mới
          </Button>
        </div>
        <Separator />

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="mt-auto flex items-center gap-2">
                  <Button size="sm" onClick={() => open(id)}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Mở
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStartRename(id, d.name)}>
                    <Pencil className="mr-2 h-4 w-4" /> Đổi tên
                  </Button>
                  <Button size="sm" variant="outline" className="hidden" onClick={() => duplicate(id)}>
                    <Copy className="mr-2 h-4 w-4" /> Nhân đôi
                  </Button>
                  <Button size="sm" variant="destructive" className="ml-auto" onClick={() => remove(id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Xoá
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
