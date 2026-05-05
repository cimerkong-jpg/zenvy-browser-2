import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess, exec } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Profile } from '../shared/types'
import { getFontsByOS } from './fingerprints/fonts'
import { getSettings } from './appSettings'

const runningProfiles = new Map<string, { process: ChildProcess; pid?: number }>()

// Track profiles opened by Puppeteer automation — stores Browser instance to allow closing
const automationProfiles = new Map<string, { close: () => Promise<void> }>()

// Helper to promisify exec
function execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve({ stdout, stderr })
    })
  })
}

// Notify renderer when profile status changes
function notifyProfileStatusChange(profileId: string, isRunning: boolean) {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('browser:status-changed', { profileId, isRunning })
  }
}

function getChromePath(): string {
  try {
    const settings = getSettings()
    if (!settings || !settings.chromePath) {
      console.error('[Browser] Chrome path not configured in settings')
      throw new Error('❌ Chrome chưa được cấu hình.\n\n📍 Cách fix:\n1. Vào Settings (⚙️)\n2. Nhấn "Chọn Chrome"\n3. Chọn file Chrome trên máy bạn')
    }
    
    // Verify Chrome exists at configured path
    if (!existsSync(settings.chromePath)) {
      console.error('[Browser] Chrome not found at configured path:', settings.chromePath)
      throw new Error(`❌ Chrome không tồn tại tại:\n${settings.chromePath}\n\n📍 Cách fix:\n1. Vào Settings (⚙️)\n2. Nhấn "Chọn Chrome" để chọn lại\n3. Hoặc cài Chrome nếu chưa có`)
    }
    
    return settings.chromePath
  } catch (error) {
    console.error('[Browser] Error getting Chrome path:', error)
    if (error instanceof Error && error.message.includes('❌')) {
      throw error // Re-throw our formatted errors
    }
    throw new Error('❌ Không thể lấy đường dẫn Chrome.\n\n📍 Cách fix: Vào Settings và chọn lại Chrome')
  }
}

function injectSpoofScripts(profile: Profile, testPagePath: string): string {
  try {
    console.log('[Browser] Injecting spoof scripts for profile:', profile.id)
    
    const possibleResourcePaths = [
      join(app.getAppPath(), 'resources'),
      join(__dirname, '../../resources'),
      join(process.cwd(), 'resources')
    ]

    const resourcesDir = possibleResourcePaths.find(p => existsSync(p))
    if (!resourcesDir) {
      console.warn('[Browser] Resources directory not found, skipping script injection')
      return testPagePath
    }

    let htmlContent: string
    try {
      htmlContent = readFileSync(testPagePath, 'utf-8')
    } catch (error) {
      console.error('[Browser] Failed to read test page:', error)
      throw new Error('Không thể đọc file test page')
    }

    const scripts: string[] = []

    // WebRTC blocker - Always inject if WebRTC is disabled
    if (profile.fingerprint.webRTC === 'disabled') {
      try {
        const webrtcScript = readFileSync(join(resourcesDir, 'webrtc-inject.js'), 'utf-8')
        scripts.push(webrtcScript)
      } catch (error) {
        console.warn('[Browser] WebRTC script not found, skipping')
      }
    }

    // Fonts spoof
    if (profile.fingerprint.fonts) {
      try {
        const fontsScript = readFileSync(join(resourcesDir, 'fonts-spoof.js'), 'utf-8')
        scripts.push(fontsScript.replace('%FONTS_LIST%', JSON.stringify(profile.fingerprint.fonts)))
      } catch (error) {
        console.warn('[Browser] Fonts script not found, skipping')
      }
    }

    // Audio spoof
    if (profile.fingerprint.audioContext) {
      try {
        const audioScript = readFileSync(join(resourcesDir, 'audio-spoof.js'), 'utf-8')
        scripts.push(audioScript.replace('%AUDIO_CONFIG%', JSON.stringify(profile.fingerprint.audioContext)))
      } catch (error) {
        console.warn('[Browser] Audio script not found, skipping')
      }
    }

    // Screen spoof
    if (profile.fingerprint.screen) {
      try {
        const screenScript = readFileSync(join(resourcesDir, 'screen-spoof.js'), 'utf-8')
        scripts.push(screenScript.replace('%SCREEN_CONFIG%', JSON.stringify(profile.fingerprint.screen)))
      } catch (error) {
        console.warn('[Browser] Screen script not found, skipping')
      }
    }

    // Geolocation spoof
    if (profile.fingerprint.geolocation) {
      try {
        const geoScript = readFileSync(join(resourcesDir, 'geolocation-spoof.js'), 'utf-8')
        scripts.push(geoScript.replace('%GEO_CONFIG%', JSON.stringify(profile.fingerprint.geolocation)))
      } catch (error) {
        console.warn('[Browser] Geolocation script not found, skipping')
      }
    }

    // Battery spoof
    if (profile.fingerprint.battery) {
      try {
        const batteryScript = readFileSync(join(resourcesDir, 'battery-spoof.js'), 'utf-8')
        scripts.push(batteryScript.replace('%BATTERY_CONFIG%', JSON.stringify(profile.fingerprint.battery)))
      } catch (error) {
        console.warn('[Browser] Battery script not found, skipping')
      }
    }

    // Replace or inject scripts
    if (scripts.length > 0) {
      const injectedScripts = `<script>${scripts.join('\n')}</script>`
      htmlContent = htmlContent.replace('<script src="webrtc-inject.js"></script>', injectedScripts)
    }

    const tempPath = join(app.getPath('userData'), 'profiles', profile.id, 'test-page.html')
    const tempDir = join(app.getPath('userData'), 'profiles', profile.id)
    
    try {
      if (!existsSync(tempDir)) {
        require('fs').mkdirSync(tempDir, { recursive: true })
      }
      writeFileSync(tempPath, htmlContent)
      console.log('[Browser] Test page created at:', tempPath)
    } catch (error) {
      console.error('[Browser] Failed to write test page:', error)
      throw new Error('Không thể tạo file test page')
    }

    return tempPath
  } catch (error) {
    console.error('[Browser] Error in injectSpoofScripts:', error)
    // Return original path as fallback
    return testPagePath
  }
}

function buildChromeArgs(profile: Profile, userDataDir: string, testPagePath: string, extensionPath?: string): string[] {
  const args = [
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',

    // Load extension if provided
    ...(extensionPath ? [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ] : []),

    // Antidetect: Hide automation
    '--disable-blink-features=AutomationControlled',
    '--exclude-switches=enable-automation',
    '--disable-dev-shm-usage',

    // Fingerprint
    `--user-agent=${profile.fingerprint.userAgent}`,
    `--lang=${profile.fingerprint.language}`,

    // WebRTC - Force disable completely
    ...(profile.fingerprint.webRTC === 'disabled' ? [
      '--disable-webrtc',
      '--disable-webrtc-hw-encoding',
      '--disable-webrtc-hw-decoding',
      '--disable-webrtc-encryption',
      '--enforce-webrtc-ip-permission-check',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--disable-features=WebRTC'
    ] : []),

    // Canvas & WebGL noise
    ...(profile.fingerprint.canvas === 'noise' ? ['--disable-reading-from-canvas'] : []),

    // Security (can be disabled for testing)
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-site-isolation-trials',

    // Performance
    '--disable-gpu-vsync',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',

    // Open test page
    `file://${testPagePath}`
  ]

  // Proxy configuration
  if (profile.proxy.type !== 'none' && profile.proxy.host) {
    const auth = profile.proxy.username
      ? `${profile.proxy.type}://${profile.proxy.username}:${profile.proxy.password}@${profile.proxy.host}:${profile.proxy.port}`
      : `${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}`
    args.push(`--proxy-server=${auth}`)
  }

  return args
}

// Called by executor.ts when Puppeteer opens a browser for automation
export function registerAutomationProfile(profileId: string, browser: { close: () => Promise<void> }): void {
  automationProfiles.set(profileId, browser)
  notifyProfileStatusChange(profileId, true)
}

// Called when Puppeteer browser disconnects / closes
export function unregisterAutomationProfile(profileId: string): void {
  automationProfiles.delete(profileId)
  if (!runningProfiles.has(profileId)) {
    notifyProfileStatusChange(profileId, false)
  }
}

export function launchProfile(profile: Profile): { success: boolean; error?: string } {
  console.log('[Browser] Launching profile:', profile.id, profile.name)
  
  // Check if profile is already running
  if (runningProfiles.has(profile.id) || automationProfiles.has(profile.id)) {
    console.warn('[Browser] Profile already running:', profile.id)
    return { success: false, error: 'Profile đang mở' }
  }

  // Get Chrome path with error handling
  let chromePath: string
  try {
    chromePath = getChromePath()
    console.log('[Browser] Chrome path:', chromePath)
  } catch (error) {
    console.error('[Browser] Failed to get Chrome path:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Không thể lấy đường dẫn Chrome' }
  }

  // Verify Chrome exists
  if (!existsSync(chromePath)) {
    console.error('[Browser] Chrome not found at:', chromePath)
    return { success: false, error: 'Chrome không tồn tại tại đường dẫn đã cấu hình. Vui lòng kiểm tra Settings.' }
  }

  const userDataDir = join(app.getPath('userData'), 'profiles', profile.id)
  console.log('[Browser] User data dir:', userDataDir)

  // Try multiple paths to find test page (NO hardcoded paths)
  const possiblePaths = [
    join(app.getAppPath(), 'resources', 'fingerprint-test.html'),
    join(__dirname, '../../resources/fingerprint-test.html'),
    join(process.cwd(), 'resources', 'fingerprint-test.html')
  ]

  let testPagePath = possiblePaths.find(p => existsSync(p))
  if (!testPagePath) {
    console.error('[Browser] Test page not found! Tried:', possiblePaths)
    return { success: false, error: 'Không tìm thấy file test page. Vui lòng kiểm tra cài đặt app.' }
  }
  console.log('[Browser] Using test page:', testPagePath)

  // Inject spoof scripts into test page
  try {
    testPagePath = injectSpoofScripts(profile, testPagePath)
  } catch (error) {
    console.error('[Browser] Failed to inject spoof scripts:', error)
    // Continue anyway with original test page
  }

  // Find WebRTC blocker extension (optional)
  let extensionPath: string | undefined
  if (profile.fingerprint.webRTC === 'disabled') {
    const extensionPaths = [
      join(app.getAppPath(), 'resources', 'webrtc-blocker'),
      join(__dirname, '../../resources/webrtc-blocker'),
      join(process.cwd(), 'resources', 'webrtc-blocker')
    ]
    extensionPath = extensionPaths.find(p => existsSync(p))
    if (extensionPath) {
      console.log('[Browser] Loading WebRTC blocker extension:', extensionPath)
    } else {
      console.warn('[Browser] WebRTC blocker extension not found')
    }
  }

  // Build Chrome arguments
  const args = buildChromeArgs(profile, userDataDir, testPagePath, extensionPath)
  console.log('[Browser] Chrome args count:', args.length)

  // Launch Chrome
  try {
    const child = spawn(chromePath, args, { detached: true, stdio: 'ignore' })
    
    if (!child || !child.pid) {
      console.error('[Browser] Failed to spawn Chrome process')
      return { success: false, error: 'Không thể khởi động Chrome. Vui lòng thử lại.' }
    }

    child.unref()
    
    const pid = child.pid
    runningProfiles.set(profile.id, { process: child, pid })
    console.log('[Browser] Chrome launched with PID:', pid)

    // Handle process exit
    child.on('exit', (code, signal) => {
      console.log('[Browser] Chrome process exited:', { profileId: profile.id, code, signal })
      runningProfiles.delete(profile.id)
      notifyProfileStatusChange(profile.id, false)
    })

    // Handle process error
    child.on('error', (error) => {
      console.error('[Browser] Chrome process error:', error)
      runningProfiles.delete(profile.id)
      notifyProfileStatusChange(profile.id, false)
    })

    // Notify renderer that profile is now running
    notifyProfileStatusChange(profile.id, true)

    return { success: true }
  } catch (error) {
    console.error('[Browser] Error launching Chrome:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể khởi động Chrome. Vui lòng thử lại.' 
    }
  }
}

export function closeProfile(profileId: string): void {
  let closed = false
  
  const entry = runningProfiles.get(profileId)
  if (entry) {
    entry.process.kill()
    runningProfiles.delete(profileId)
    closed = true
  }

  const automationBrowser = automationProfiles.get(profileId)
  if (automationBrowser) {
    automationBrowser.close().catch(() => {})
    automationProfiles.delete(profileId)
    closed = true
  }
  
  // Always notify status change if we closed something
  if (closed) {
    notifyProfileStatusChange(profileId, false)
  }
}

export function getRunningProfiles(): string[] {
  return [...new Set([...runningProfiles.keys(), ...automationProfiles.keys()])]
}

// Check if a Chrome process with specific user-data-dir is actually running
async function isProfileActuallyRunning(profileId: string): Promise<boolean> {
  const userDataDir = join(app.getPath('userData'), 'profiles', profileId)
  
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync(`ps aux | grep "user-data-dir=${userDataDir}" | grep -v grep`)
      return stdout.trim().length > 0
    } else if (process.platform === 'win32') {
      const { stdout } = await execAsync(`wmic process where "commandline like '%user-data-dir=${userDataDir}%'" get processid`)
      return stdout.trim().split('\n').length > 1
    } else {
      const { stdout } = await execAsync(`ps aux | grep "user-data-dir=${userDataDir}" | grep -v grep`)
      return stdout.trim().length > 0
    }
  } catch {
    return false
  }
}

// Sync running profiles on app start
export async function syncRunningProfiles(profileIds: string[]): Promise<string[]> {
  const actuallyRunning: string[] = []
  
  for (const profileId of profileIds) {
    const isRunning = await isProfileActuallyRunning(profileId)
    if (isRunning) {
      actuallyRunning.push(profileId)
      // Add to map without process reference (we don't have it)
      runningProfiles.set(profileId, { process: null as any, pid: undefined })
    }
  }
  
  return actuallyRunning
}
