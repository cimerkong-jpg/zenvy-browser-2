/**
 * Auth Flow Test Script
 * 
 * Run this to validate:
 * 1. Supabase connection
 * 2. Sign up flow
 * 3. Sign in flow
 * 4. Session persistence
 * 5. Sign out flow
 * 
 * Usage: node test-auth.js
 */

const { signUp, signIn, signOut, getCurrentUser, getCurrentSession, isAuthenticated } = require('./src/main/auth')
const { isSupabaseConfigured } = require('./src/main/supabase')

// Test credentials
const TEST_EMAIL = `test-${Date.now()}@zenvy.test`
const TEST_PASSWORD = 'TestPassword123!'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runTests() {
  console.log('🧪 Starting Auth Flow Tests...\n')

  // Test 1: Check Supabase configuration
  console.log('1️⃣  Checking Supabase configuration...')
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured!')
    console.log('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  console.log('✅ Supabase configured\n')

  // Test 2: Sign up
  console.log('2️⃣  Testing sign up...')
  console.log(`   Email: ${TEST_EMAIL}`)
  const signUpResult = await signUp(TEST_EMAIL, TEST_PASSWORD)
  
  if (signUpResult.error) {
    console.error(`❌ Sign up failed: ${signUpResult.error}`)
    process.exit(1)
  }
  
  if (!signUpResult.user) {
    console.error('❌ No user returned from sign up')
    process.exit(1)
  }
  
  console.log('✅ Sign up successful')
  console.log(`   User ID: ${signUpResult.user.id}`)
  console.log(`   Email: ${signUpResult.user.email}\n`)

  // Wait for email confirmation (in production)
  console.log('⏳ Waiting 2 seconds...\n')
  await sleep(2000)

  // Test 3: Sign in
  console.log('3️⃣  Testing sign in...')
  const signInResult = await signIn(TEST_EMAIL, TEST_PASSWORD)
  
  if (signInResult.error) {
    console.error(`❌ Sign in failed: ${signInResult.error}`)
    process.exit(1)
  }
  
  if (!signInResult.session) {
    console.error('❌ No session returned from sign in')
    process.exit(1)
  }
  
  console.log('✅ Sign in successful')
  console.log(`   User ID: ${signInResult.session.user.id}`)
  console.log(`   Email: ${signInResult.session.user.email}`)
  console.log(`   Token: ${signInResult.session.accessToken.substring(0, 20)}...`)
  console.log(`   Expires: ${new Date(signInResult.session.expiresAt * 1000).toISOString()}\n`)

  // Test 4: Get current user
  console.log('4️⃣  Testing getCurrentUser...')
  const currentUser = await getCurrentUser()
  
  if (!currentUser) {
    console.error('❌ No current user found')
    process.exit(1)
  }
  
  console.log('✅ Current user retrieved')
  console.log(`   User ID: ${currentUser.id}`)
  console.log(`   Email: ${currentUser.email}\n`)

  // Test 5: Get current session
  console.log('5️⃣  Testing getCurrentSession...')
  const currentSession = await getCurrentSession()
  
  if (!currentSession) {
    console.error('❌ No current session found')
    process.exit(1)
  }
  
  console.log('✅ Current session retrieved')
  console.log(`   User ID: ${currentSession.user.id}`)
  console.log(`   Token valid: ${currentSession.expiresAt > Date.now() / 1000}\n`)

  // Test 6: Check authentication status
  console.log('6️⃣  Testing isAuthenticated...')
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    console.error('❌ User should be authenticated')
    process.exit(1)
  }
  
  console.log('✅ User is authenticated\n')

  // Test 7: Sign out
  console.log('7️⃣  Testing sign out...')
  const signOutResult = await signOut()
  
  if (signOutResult.error) {
    console.error(`❌ Sign out failed: ${signOutResult.error}`)
    process.exit(1)
  }
  
  console.log('✅ Sign out successful\n')

  // Test 8: Verify signed out
  console.log('8️⃣  Verifying signed out state...')
  const userAfterSignOut = await getCurrentUser()
  
  if (userAfterSignOut) {
    console.error('❌ User should be null after sign out')
    process.exit(1)
  }
  
  console.log('✅ User is signed out\n')

  // Test 9: Verify not authenticated
  console.log('9️⃣  Testing isAuthenticated after sign out...')
  const authenticatedAfterSignOut = await isAuthenticated()
  
  if (authenticatedAfterSignOut) {
    console.error('❌ User should not be authenticated')
    process.exit(1)
  }
  
  console.log('✅ User is not authenticated\n')

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 All tests passed!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✅ Auth flow is working correctly')
  console.log('✅ Session management is working')
  console.log('✅ Ready for UI integration\n')
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test failed with error:')
  console.error(error)
  process.exit(1)
})
