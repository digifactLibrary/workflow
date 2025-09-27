import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuthStore } from '../state/authStore'

export default function Login() {
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const [username, setUsername] = useState('') // Changed from email to username
  const [password, setPassword] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(username.trim(), password) // Changed from email to username
  }

  return (
    <div className="min-h-screen w-full grid place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground mt-1">Vui lòng nhập email hoặc mã nhân viên và mật khẩu</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm" htmlFor="username">Email hoặc mã nhân viên</label>
            <Input
              id="username"
              type="text"
              placeholder="user@example.com hoặc NV001"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm" htmlFor="password">Mật khẩu</label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
      </div>
    </div>
  )
}
