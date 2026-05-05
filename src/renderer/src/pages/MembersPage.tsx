import { useEffect, useState } from 'react'
import { useToast } from '../store/useToast'
import type { UserProfile, UserStats } from '../../../shared/types'

export default function MembersPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarColor, setAvatarColor] = useState('#7C3AED')
  const [loading, setLoading] = useState(false)
  const addToast = useToast((s) => s.addToast)

  useEffect(() => {
    loadUser()
    loadStats()
  }, [])

  const loadUser = async () => {
    const data = await window.api.user.get()
    setUser(data)
    setDisplayName(data.displayName)
    setEmail(data.email)
    setAvatarColor(data.avatarColor)
  }

  const loadStats = async () => {
    const data = await window.api.user.getStats()
    setStats(data)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await window.api.user.update({
        displayName,
        email,
        avatarColor
      })
      addToast('success', 'Đã lưu thông tin')
      await loadUser()
    } catch (err) {
      addToast('error', 'Lỗi khi lưu thông tin')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!user || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 border-b border-purple-500/10 bg-[#0D0B1A]/80 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Thành viên</h1>
        <p className="text-xs text-slate-400 mt-1">Thông tin người dùng và thống kê sử dụng</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Profile Info */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white">Thông tin cá nhân</h2>

          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(displayName)}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tên hiển thị</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors"
                  placeholder="Nhập tên"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Màu avatar</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={avatarColor}
                onChange={(e) => setAvatarColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-purple-500/10 bg-white/5 cursor-pointer"
              />
              <input
                type="text"
                value={avatarColor}
                onChange={(e) => setAvatarColor(e.target.value)}
                className="flex-1 rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 focus:border-purple-500/30 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Usage Stats */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white">Thống kê sử dụng</h2>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Profiles" value={stats.profileCount} />
            <StatCard label="Scripts" value={stats.scriptCount} />
            <StatCard label="Runs" value={stats.totalRuns} />
            <StatCard label="Schedulers" value={stats.activeSchedulerCount} />
          </div>
        </section>

        {/* License Info */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-medium text-white mb-3">License</h2>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Gói</span>
            <span className="text-sm font-medium text-white">{user.plan}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Kích hoạt</span>
            <span className="text-sm text-slate-300">{formatDate(user.activatedAt)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Giới hạn</span>
            <span className="text-sm text-emerald-400">Unlimited</span>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-purple-500/10 bg-white/5 p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-white">{value.toLocaleString()}</div>
    </div>
  )
}
