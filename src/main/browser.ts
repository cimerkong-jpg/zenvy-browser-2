import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess, exec } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Profile } from '../shared/types'
import { getFontsByOS } from './fingerprints/fonts'

const runningProfiles = new Map<string, { process: ChildProcess; pid?: number }>()

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
  switch (process.platform) {
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    default:
      return '/usr/bin/google-chrome'
  }
}

function injectSpoofScripts(profile: Profile, testPagePath: string): string {
  const possibleResourcePaths = [
    join(app.getAppPath(), 'resources'),
    join(__dirname, '../../resources'),
    join(process.cwd(), 'resources')
  ]

  const resourcesDir = possibleResourcePaths.find(p => existsSync(p)) || possibleResourcePaths[0]

  let htmlContent = readFileSync(testPagePath, 'utf-8')
  const scripts: string[] = []

  // WebRTC blocker - Always inject if WebRTC is disabled
  if (profile.fingerprint.webRTC === 'disabled') {
    const webrtcScript = readFileSync(join(resourcesDir, 'webrtc-inject.js'), 'utf-8')
    scripts.push(webrtcScript)
  }

  // Fonts spoof
  if (profile.fingerprint.fonts) {
    const fontsScript = readFileSync(join(resourcesDir, 'fonts-spoof.js'), 'utf-8')
    scripts.push(fontsScript.replace('%FONTS_LIST%', JSON.stringify(profile.fingerprint.fonts)))
  }

  // Audio spoof
  if (profile.fingerprint.audioContext) {
    const audioScript = readFileSync(join(resourcesDir, 'audio-spoof.js'), 'utf-8')
    scripts.push(audioScript.replace('%AUDIO_CONFIG%', JSON.stringify(profile.fingerprint.audioContext)))
  }

  // Screen spoof
  if (profile.fingerprint.screen) {
    const screenScript = readFileSync(join(resourcesDir, 'screen-spoof.js'), 'utf-8')
    scripts.push(screenScript.replace('%SCREEN_CONFIG%', JSON.stringify(profile.fingerprint.screen)))
  }

  // Geolocation spoof
  if (profile.fingerprint.geolocation) {
    const geoScript = readFileSync(join(resourcesDir, 'geolocation-spoof.js'), 'utf-8')
    scripts.push(geoScript.replace('%GEO_CONFIG%', JSON.stringify(profile.fingerprint.geolocation)))
  }

  // Battery spoof
  if (profile.fingerprint.battery) {
    const batteryScript = readFileSync(join(resourcesDir, 'battery-spoof.js'), 'utf-8')
    scripts.push(batteryScript.replace('%BATTERY_CONFIG%', JSON.stringify(profile.fingerprint.battery)))
  }

  // Replace or inject scripts
  if (scripts.length > 0) {
    const injectedScripts = `<script>${scripts.join('\n')}</script>`
    // Replace the webrtc-inject.js script tag with inline scripts
    htmlContent = htmlContent.replace('<script src="webrtc-inject.js"></script>', injectedScripts)
  }

  const tempPath = join(app.getPath('userData'), 'profiles', profile.id, 'test-page.html')
  const tempDir = join(app.getPath('userData'), 'profiles', profile.id)
  if (!existsSync(tempDir)) {
    require('fs').mkdirSync(tempDir, { recursive: true })
  }
  writeFileSync(tempPath, htmlContent)

  return tempPath
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

export function launchProfile(profile: Profile): { success: boolean; error?: string } {
  if (runningProfiles.has(profile.id)) {
    return { success: false, error: 'Profile đang mở' }
  }

  const chromePath = getChromePath()
  const userDataDir = join(app.getPath('userData'), 'profiles', profile.id)

  // Try multiple paths to find test page
  const { existsSync } = require('fs')
  const possiblePaths = [
    join(app.getAppPath(), 'resources', 'fingerprint-test.html'),
    join(__dirname, '../../resources/fingerprint-test.html'),
    join(process.cwd(), 'resources', 'fingerprint-test.html'),
    '/Users/kongka0809/Desktop/zenvy-browser/resources/fingerprint-test.html'
  ]

  let testPagePath = possiblePaths.find(p => existsSync(p))
  if (!testPagePath) {
    console.error('Test page not found! Tried:', possiblePaths)
    testPagePath = possiblePaths[0] // fallback
  }
  console.log('Using test page path:', testPagePath)

  // Inject spoof scripts into test page
  testPagePath = injectSpoofScripts(profile, testPagePath)

  // Find WebRTC blocker extension
  let extensionPath: string | undefined
  if (profile.fingerprint.webRTC === 'disabled') {
    const extensionPaths = [
      join(app.getAppPath(), 'resources', 'webrtc-blocker'),
      join(__dirname, '../../resources/webrtc-blocker'),
      join(process.cwd(), 'resources', 'webrtc-blocker'),
      '/Users/kongka0809/Desktop/zenvy-browser/resources/webrtc-blocker'
    ]
    extensionPath = extensionPaths.find(p => existsSync(p))
    if (extensionPath) {
      console.log('Loading WebRTC blocker extension:', extensionPath)
    }
  }

  const args = buildChromeArgs(profile, userDataDir, testPagePath, extensionPath)

  try {
    const child = spawn(chromePath, args, { detached: true, stdio: 'ignore' })
    child.unref()
    
    const pid = child.pid
    runningProfiles.set(profile.id, { process: child, pid })

    child.on('exit', () => {
      runningProfiles.delete(profile.id)
      notifyProfileStatusChange(profile.id, false)
    })

    // Notify renderer that profile is now running
    notifyProfileStatusChange(profile.id, true)

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export function closeProfile(profileId: string): void {
  const entry = runningProfiles.get(profileId)
  if (entry) {
    entry.process.kill()
    runningProfiles.delete(profileId)
    notifyProfileStatusChange(profileId, false)
  }
}

export function getRunningProfiles(): string[] {
  return Array.from(runningProfiles.keys())
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
