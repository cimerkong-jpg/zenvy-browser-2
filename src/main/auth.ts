import { getSupabase, isSupabaseConfigured } from './supabase'
import { saveSession, getSession, clearSession } from './sessionStorage'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  createdAt: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Restore session from storage on app start
 */
export async function restoreSession(): Promise<AuthSession | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const savedSession = getSession()
  if (!savedSession) {
    console.log('[Auth] No saved session found')
    return null
  }

  try {
    const supabase = getSupabase()
    
    // Restore session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: savedSession.access_token,
      refresh_token: savedSession.refresh_token,
    })

    if (error) {
      console.error('[Auth] Failed to restore session:', error.message)
      clearSession()
      return null
    }

    if (!data.session) {
      console.log('[Auth] Session expired')
      clearSession()
      return null
    }

    console.log('[Auth] Session restored successfully')
    
    // Update saved session with refreshed tokens
    const newSessionData = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || 0,
      user: {
        id: data.session.user.id,
        email: data.session.user.email!,
        created_at: data.session.user.created_at,
      }
    }
    saveSession(newSessionData)

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email!,
        createdAt: data.session.user.created_at,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at || 0,
    }
  } catch (err) {
    console.error('[Auth] Error restoring session:', err)
    clearSession()
    return null
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase not configured' }
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { user: null, error: error.message }
    }

    if (!data.user) {
      return { user: null, error: 'No user returned' }
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        createdAt: data.user.created_at,
      },
      error: null,
    }
  } catch (err) {
    return { user: null, error: (err as Error).message }
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ session: AuthSession | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { session: null, error: 'Supabase not configured' }
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { session: null, error: error.message }
    }

    if (!data.session || !data.user) {
      return { session: null, error: 'No session returned' }
    }

    // Save session to storage
    const sessionData = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || 0,
      user: {
        id: data.user.id,
        email: data.user.email!,
        created_at: data.user.created_at,
      }
    }
    saveSession(sessionData)

    return {
      session: {
        user: {
          id: data.user.id,
          email: data.user.email!,
          createdAt: data.user.created_at,
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0,
      },
      error: null,
    }
  } catch (err) {
    return { session: null, error: (err as Error).message }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: string | null }> {
  // Clear local session first
  clearSession()

  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Auth] Sign out error:', error.message)
      return { error: error.message }
    }

    console.log('[Auth] Signed out successfully')
    return { error: null }
  } catch (err) {
    console.error('[Auth] Sign out failed:', err)
    return { error: (err as Error).message }
  }
}

/**
 * Get current user session
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()

    if (!data.session || !data.session.user) {
      return null
    }

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email!,
        createdAt: data.session.user.created_at,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at || 0,
    }
  } catch (err) {
    console.error('[Auth] Error getting session:', err)
    return null
  }
}

/**
 * Get current user (without full session)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // Try to restore session first
  const session = await restoreSession()
  if (session) {
    return session.user
  }

  // If no saved session, check Supabase
  const currentSession = await getCurrentSession()
  return currentSession?.user || null
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  if (!isSupabaseConfigured()) {
    return () => {}
  }

  const supabase = getSupabase()
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Auth] State changed:', event)
    
    if (session?.user) {
      // Save session on change
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0,
        user: {
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        }
      }
      saveSession(sessionData)
      
      callback({
        id: session.user.id,
        email: session.user.email!,
        createdAt: session.user.created_at,
      })
    } else {
      clearSession()
      callback(null)
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}
