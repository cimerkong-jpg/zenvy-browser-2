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

export const useAuth = create<AuthStore>((set) => ({
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
        error: 'Failed to check authentication status'
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
        set({
          isLoading: false,
          error: error
        })
        throw new Error(error)
      }

      if (!session) {
        set({
          isLoading: false,
          error: 'No session returned'
        })
        throw new Error('No session returned')
      }

      set({
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
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
        set({
          isLoading: false,
          error: error
        })
        throw new Error(error)
      }

      if (!user) {
        set({
          isLoading: false,
          error: 'No user returned'
        })
        throw new Error('No user returned')
      }

      // After signup, sign in automatically
      await useAuth.getState().signIn(email, password)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
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
