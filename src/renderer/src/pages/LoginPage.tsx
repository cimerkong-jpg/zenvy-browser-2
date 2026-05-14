import { useEffect, useState } from 'react'
import { useAuth } from '../store/useAuth'

interface LoginPageProps {
  onNavigateToRegister?: () => void
}

export default function LoginPage({ onNavigateToRegister }: LoginPageProps) {
  const [email, setEmail] = useState(() => localStorage.getItem('zenvy:rememberEmail') || localStorage.getItem('zenvy:lastLoginEmail') || '')
  const [password, setPassword] = useState(() => localStorage.getItem('zenvy:rememberPassword') || '')
  const [rememberAccount, setRememberAccount] = useState(() => localStorage.getItem('zenvy:rememberAccount') === 'true')
  const { signIn, isLoading, error, clearError } = useAuth()

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('zenvy:rememberEmail')
    const rememberedPassword = localStorage.getItem('zenvy:rememberPassword')
    const lastEmail = localStorage.getItem('zenvy:lastLoginEmail')
    if (!email && (rememberedEmail || lastEmail)) setEmail(rememberedEmail || lastEmail || '')
    if (!password && rememberedPassword) setPassword(rememberedPassword)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email || !password) {
      return
    }

    try {
      await signIn(email, password)
      localStorage.setItem('zenvy:lastLoginEmail', email.trim())
      localStorage.setItem('zenvy:rememberAccount', rememberAccount ? 'true' : 'false')
      if (rememberAccount) {
        localStorage.setItem('zenvy:rememberEmail', email.trim())
        localStorage.setItem('zenvy:rememberPassword', password)
      } else {
        localStorage.removeItem('zenvy:rememberEmail')
        localStorage.removeItem('zenvy:rememberPassword')
      }
      // Navigation will be handled by App.tsx
    } catch (err) {
      // Error is already set in store
      console.error('Login failed:', err)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0B1A] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Zenvy Browser</h1>
          <p className="mt-2 text-sm text-slate-400">Đăng nhập vào tài khoản của bạn</p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-purple-500/10 bg-white/[0.04] backdrop-blur-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={rememberAccount}
                onChange={(event) => setRememberAccount(event.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-purple-500/20 bg-white/5 accent-purple-600"
              />
              <span>Lưu tài khoản</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-medium text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                Đăng ký
              </button>
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Đồng bộ đám mây qua Supabase
          </p>
        </div>
      </div>
    </div>
  )
}
