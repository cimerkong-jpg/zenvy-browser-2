/**
 * Simple Auth Test - Debug sign in issue
 */

require('dotenv/config')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Auth...\n')

// Check env vars
console.log('1. Environment Variables:')
console.log('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
console.log()

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Environment variables not set!')
  process.exit(1)
}

// Create client
console.log('2. Creating Supabase client...')
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})
console.log('   ✅ Client created\n')

// Test credentials
const TEST_EMAIL = 'test@zenvy.app'
const TEST_PASSWORD = 'test123456'

async function testAuth() {
  try {
    // Test 1: Sign up
    console.log('3. Testing Sign Up...')
    console.log(`   Email: ${TEST_EMAIL}`)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (signUpError) {
      // User might already exist, that's okay
      console.log(`   ⚠️  Sign up error: ${signUpError.message}`)
      console.log('   (This is okay if user already exists)\n')
    } else {
      console.log('   ✅ Sign up successful')
      console.log(`   User ID: ${signUpData.user?.id}\n`)
    }

    // Test 2: Sign in
    console.log('4. Testing Sign In...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (signInError) {
      console.error('   ❌ Sign in failed:', signInError.message)
      console.error('   Error details:', signInError)
      process.exit(1)
    }

    console.log('   ✅ Sign in successful!')
    console.log(`   User ID: ${signInData.user?.id}`)
    console.log(`   Email: ${signInData.user?.email}`)
    console.log(`   Access Token: ${signInData.session?.access_token?.substring(0, 20)}...`)
    console.log()

    // Test 3: Get current session
    console.log('5. Testing Get Session...')
    const { data: sessionData } = await supabase.auth.getSession()
    
    if (sessionData.session) {
      console.log('   ✅ Session retrieved')
      console.log(`   User: ${sessionData.session.user.email}`)
    } else {
      console.log('   ⚠️  No session found')
    }
    console.log()

    // Test 4: Sign out
    console.log('6. Testing Sign Out...')
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      console.error('   ❌ Sign out failed:', signOutError.message)
    } else {
      console.log('   ✅ Sign out successful')
    }
    console.log()

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ All auth tests passed!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
    console.log('Auth is working correctly.')
    console.log('If sign in still fails in the app, check:')
    console.log('  1. Browser console for errors')
    console.log('  2. Network tab for failed requests')
    console.log('  3. Supabase dashboard for auth logs')
    console.log()

  } catch (err) {
    console.error('\n❌ Test failed with error:')
    console.error(err)
    process.exit(1)
  }
}

testAuth()
