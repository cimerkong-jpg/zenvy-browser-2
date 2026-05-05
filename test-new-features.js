// Test script for 4 new features
// Run this in DevTools Console to test APIs

async function testAllFeatures() {
  console.log('🧪 Testing 4 new features...\n')
  
  // Test 1: Settings API
  console.log('1️⃣ Testing Settings API...')
  try {
    const settings = await window.api.settings.get()
    console.log('✅ Settings loaded:', settings)
    
    const chromePath = await window.api.settings.getChromePath()
    console.log('✅ Chrome path detected:', chromePath)
    
    const dataDir = await window.api.settings.getDataDir()
    console.log('✅ Data directory:', dataDir)
  } catch (err) {
    console.error('❌ Settings API failed:', err)
  }
  
  // Test 2: User API
  console.log('\n2️⃣ Testing User API...')
  try {
    const user = await window.api.user.get()
    console.log('✅ User loaded:', user)
    
    const stats = await window.api.user.getStats()
    console.log('✅ Stats loaded:', stats)
  } catch (err) {
    console.error('❌ User API failed:', err)
  }
  
  // Test 3: Extensions API
  console.log('\n3️⃣ Testing Extensions API...')
  try {
    const profiles = await window.api.profiles.getAll()
    if (profiles.length > 0) {
      const extensions = await window.api.extensions.getAll(profiles[0].id)
      console.log(`✅ Extensions for profile "${profiles[0].name}":`, extensions)
    } else {
      console.log('⚠️ No profiles found to test extensions')
    }
  } catch (err) {
    console.error('❌ Extensions API failed:', err)
  }
  
  // Test 4: Browser API (for Sync page)
  console.log('\n4️⃣ Testing Browser API...')
  try {
    const running = await window.api.browser.running()
    console.log('✅ Running profiles:', running)
  } catch (err) {
    console.error('❌ Browser API failed:', err)
  }
  
  console.log('\n✨ Test completed!')
}

// Run the test
testAllFeatures()
