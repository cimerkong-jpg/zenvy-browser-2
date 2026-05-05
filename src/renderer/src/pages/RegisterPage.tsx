import { useState } from 'react'
import { useAuth } from '../store/useAuth'

interface RegisterPageProps {
  onNavigateToLogin?: () => void
}

export default function RegisterPage({ onNavigateToLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const { signUp, isLoading, error, clearError } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError('')

    // Validation
    if (!email || !password || !confirmPassword) {
      setLocalError('All fields are required')
      return
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    try {
      await signUp(email, password)
      // Navigation will be handled by App.tsx after successful signup
    } catch (err) {
      // Error is already set in store
      console.error('Registration failed:', err)
    }
  }

  const displayError = localError || error

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0B1A] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Zenvy Browser</h1>
          <p className="mt-2 text-sm text-slate-400">Create your account</p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-purple-500/10 bg-white/[0.04] backdrop-blur-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {displayError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{displayError}</p>
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  setLocalError('')
                }}
                placeholder="your@email.com"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setLocalError('')
                }}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">At least 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setLocalError('')
                }}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password || !confirmPassword}
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-medium text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 rounded-lg border border-blue-500/10 bg-blue-500/5 p-4">
          <p className="text-xs text-slate-400 text-center">
            By signing up, your profiles and settings will be synced across devices
          </p>
        </div>
      </div>
    </div>
  )
}
