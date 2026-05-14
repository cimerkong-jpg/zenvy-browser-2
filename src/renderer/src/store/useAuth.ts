import { create } from 'zustand'
import { useWorkspace } from './useWorkspace'

interface AuthUser {
  id: string
  email: string
  createdAt: string
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  initAuth: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.'
  if (normalized.includes('email not confirmed')) return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.'
  if (normalized.includes('user already registered') || normalized.includes('already registered')) return 'Email này đã được đăng ký.'
  if (normalized.includes('signup disabled')) return 'Chức năng đăng ký đang tạm tắt.'
  if (normalized.includes('password')) return 'Mật khẩu không hợp lệ hoặc không đúng.'
  if (normalized.includes('email')) return 'Email không hợp lệ hoặc chưa được đăng ký.'
  if (normalized.includes('network') || normalized.includes('fetch')) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.'
  if (normalized.includes('no session returned')) return 'Không tạo được phiên đăng nhập. Vui lòng thử lại.'
  if (normalized.includes('failed to check authentication status')) return 'Không thể kiểm tra trạng thái đăng nhập.'
  if (normalized.includes('sign in failed')) return 'Đăng nhập thất bại. Vui lòng thử lại.'
  if (normalized.includes('sign up failed')) return 'Đăng ký thất bại. Vui lòng thử lại.'
  return message || 'Có lỗi xảy ra. Vui lòng thử lại.'
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to check session
  error: null,

  /**
   * Initialize auth state on app start
   * Checks if user has existing session
   */
  initAuth: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const user = await window.api.auth.getCurrentUser()
      
      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err)
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Không thể kiểm tra trạng thái đăng nhập.'
      })
    }
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const { session, error } = await window.api.auth.signIn(email, password)

      if (error) {
        const translated = translateAuthError(error)
        set({
          isLoading: false,
          error: translated
        })
        throw new Error(translated)
      }

      if (!session) {
        const translated = translateAuthError('No session returned')
        set({
          isLoading: false,
          error: translated
        })
        throw new Error(translated)
      }

      set({
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (err) {
      const errorMessage = translateAuthError(err instanceof Error ? err.message : 'Sign in failed')
      set({
        isLoading: false,
        error: errorMessage
      })
      throw err
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const { user, error } = await window.api.auth.signUp(email, password)

      if (error) {
        const translated = translateAuthError(error)
        set({
          isLoading: false,
          error: translated
        })
        throw new Error(translated)
      }

      if (!user) {
        const translated = 'Không tạo được tài khoản. Vui lòng thử lại.'
        set({
          isLoading: false,
          error: translated
        })
        throw new Error(translated)
      }

      // After signup, sign in automatically
      await useAuth.getState().signIn(email, password)
    } catch (err) {
      const errorMessage = translateAuthError(err instanceof Error ? err.message : 'Sign up failed')
      set({
        isLoading: false,
        error: errorMessage
      })
      throw err
    }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    const lastEmail = get().user?.email
    if (lastEmail) {
      localStorage.setItem('zenvy:lastLoginEmail', lastEmail)
    }
    set({ isLoading: true, error: null })

    try {
      const { error } = await window.api.auth.signOut()

      if (error) {
        console.error('Sign out error:', error)
        // Still clear local state even if server signout fails
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
      useWorkspace.getState().reset()
    } catch (err) {
      console.error('Failed to sign out:', err)
      // Clear local state anyway
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
      useWorkspace.getState().reset()
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null })
  }
}))
