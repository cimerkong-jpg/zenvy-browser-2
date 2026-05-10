import { app, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  Browser,
  BrowserPlatform,
  BrowserTag,
  getInstalledBrowsers,
  install,
  resolveBuildId,
} from '@puppeteer/browsers'

export type ChromeDownloadStatus =
  | { state: 'checking'; profileId?: string; message: string }
  | { state: 'downloading'; profileId?: string; downloadedBytes: number; totalBytes: number; percent: number; message: string }
  | { state: 'ready'; profileId?: string; executablePath: string; message: string }
  | { state: 'error'; profileId?: string; error: string; message: string }

let installPromise: Promise<string> | null = null

function getBrowserPlatform(): BrowserPlatform {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? BrowserPlatform.MAC_ARM : BrowserPlatform.MAC
  }

  if (process.platform === 'win32') {
    return process.arch === 'ia32' ? BrowserPlatform.WIN32 : BrowserPlatform.WIN64
  }

  if (process.platform === 'linux' && process.arch === 'arm64') {
    return BrowserPlatform.LINUX_ARM
  }

  return BrowserPlatform.LINUX
}

export function getBrowserCacheDir(): string {
  return join(app.getPath('userData'), 'browsers')
}

function emitStatus(status: ChromeDownloadStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('browser:chrome-download-status', status)
  }
}

async function getInstalledChromePath(): Promise<string | null> {
  const installed = await getInstalledBrowsers({ cacheDir: getBrowserCacheDir() })
  const platform = getBrowserPlatform()
  const chrome = installed
    .filter((item) => item.browser === Browser.CHROME && item.platform === platform)
    .sort((a, b) => b.buildId.localeCompare(a.buildId))[0]

  if (chrome?.executablePath && existsSync(chrome.executablePath)) {
    return chrome.executablePath
  }

  return null
}

export async function getDownloadedChromePath(): Promise<string | null> {
  try {
    return await getInstalledChromePath()
  } catch (err) {
    console.warn('[BrowserInstaller] Failed to inspect browser cache:', err)
    return null
  }
}

export async function ensureChromeInstalled(profileId?: string): Promise<string> {
  const installedPath = await getDownloadedChromePath()
  if (installedPath) {
    emitStatus({ state: 'ready', profileId, executablePath: installedPath, message: 'Chrome da san sang' })
    return installedPath
  }

  if (installPromise) return installPromise

  installPromise = (async () => {
    const platform = getBrowserPlatform()
    emitStatus({ state: 'checking', profileId, message: 'Dang kiem tra Chrome...' })

    const buildId = await resolveBuildId(Browser.CHROME, platform, BrowserTag.STABLE)
    emitStatus({ state: 'checking', profileId, message: 'Dang chuan bi tai Chrome...' })

    const browser = await install({
      browser: Browser.CHROME,
      buildId,
      buildIdAlias: 'stable',
      cacheDir: getBrowserCacheDir(),
      platform,
      downloadProgressCallback: (downloadedBytes, totalBytes) => {
        const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0
        emitStatus({
          state: 'downloading',
          profileId,
          downloadedBytes,
          totalBytes,
          percent,
          message: totalBytes > 0 ? `Dang tai Chrome ${percent}%` : 'Dang tai Chrome...',
        })
      },
    })

    emitStatus({
      state: 'ready',
      profileId,
      executablePath: browser.executablePath,
      message: 'Chrome da san sang',
    })

    return browser.executablePath
  })().catch((err) => {
    const message = err instanceof Error ? err.message : String(err)
    emitStatus({ state: 'error', profileId, error: message, message: 'Tai Chrome that bai' })
    throw err
  }).finally(() => {
    installPromise = null
  })

  return installPromise
}
