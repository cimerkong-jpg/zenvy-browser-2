/**
 * IPC Contracts - Type-safe communication between main and renderer
 * 
 * This file defines all IPC channels and their input/output types
 */

import type { AuthUser, AuthSession } from '../main/auth'

// ============================================
// AUTH CONTRACTS
// ============================================

export interface AuthContracts {
  'auth:signUp': {
    input: { email: string; password: string }
    output: { user: AuthUser | null; error: string | null }
  }
  'auth:signIn': {
    input: { email: string; password: string }
    output: { session: AuthSession | null; error: string | null }
  }
  'auth:signOut': {
    input: void
    output: { error: string | null }
  }
  'auth:getCurrentUser': {
    input: void
    output: AuthUser | null
  }
  'auth:getCurrentSession': {
    input: void
    output: AuthSession | null
  }
  'auth:isAuthenticated': {
    input: void
    output: boolean
  }
}

// ============================================
// SYNC CONTRACTS (Future)
// ============================================

export interface SyncContracts {
  'sync:pull': {
    input: { lastSyncTime?: number }
    output: { success: boolean; error: string | null; syncedCount: number }
  }
  'sync:push': {
    input: void
    output: { success: boolean; error: string | null; pushedCount: number }
  }
  'sync:full': {
    input: void
    output: { 
      success: boolean
      error: string | null
      pulled: number
      pushed: number
    }
  }
  'sync:getStatus': {
    input: void
    output: {
      lastSyncTime: number | null
      isSyncing: boolean
      pendingChanges: number
    }
  }
}

// ============================================
// COMBINED CONTRACTS
// ============================================

export type IPCContracts = AuthContracts & SyncContracts

// ============================================
// TYPE HELPERS
// ============================================

export type IPCChannel = keyof IPCContracts
export type IPCInput<T extends IPCChannel> = IPCContracts[T]['input']
export type IPCOutput<T extends IPCChannel> = IPCContracts[T]['output']
