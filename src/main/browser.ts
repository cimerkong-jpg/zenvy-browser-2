import { app } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Profile } from '../shared/types'
import { getFontsByOS } from './fingerprints/fonts'

const runningProfiles = new Map<string, ChildProcess>()

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

  if (scripts.length > 0) {
    const injectedScripts = `<script>${scripts.join('\n')}</script>`
    htmlContent = htmlContent.replace('<script src="webrtc-inject.js"></script>', `<script src="webrtc-inject.js"></script>\n    ${injectedScripts}`)
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
    runningProfiles.set(profile.id, child)

    child.on('exit', () => {
      runningProfiles.delete(profile.id)
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export function closeProfile(profileId: string): void {
  const child = runningProfiles.get(profileId)
  if (child) {
    child.kill()
    runningProfiles.delete(profileId)
  }
}

export function getRunningProfiles(): string[] {
  return Array.from(runningProfiles.keys())
}
