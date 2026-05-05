import 'dotenv/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import ws from 'ws'

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

// Debug logs (remove after testing)
console.log('[Supabase] Configuration check:')
console.log('  SUPABASE_URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'NOT SET')
console.log('  SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET')

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create Supabase client instance
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      const missing = []
      if (!SUPABASE_URL) missing.push('SUPABASE_URL')
      if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY')
      throw new Error(
        `Supabase not configured: missing environment variables: ${missing.join(', ')}\n` +
        'Please create a .env file in the project root with:\n' +
        '  SUPABASE_URL=https://your-project.supabase.co\n' +
        '  SUPABASE_ANON_KEY=your-anon-key'
      )
    }
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        fetch: fetch.bind(globalThis),
      },
      realtime: {
        transport: ws as any,
      }
    })
  }
  
  return supabaseClient
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}
