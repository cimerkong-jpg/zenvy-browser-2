import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import * as db from './db'
import * as browser from './browser'
import * as cookies from './cookies'
import * as templates from './templates'
import type { Profile } from '../shared/types'
import type { Cookie } from './cookies'

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string

function getAppIconPath(): string | undefined {
  const candidates = [
    join(process.cwd(), 'resources', 'icons', 'zenvy-logo.png'),
    join(process.resourcesPath, 'resources', 'icons', 'zenvy-logo.png')
  ]

  return candidates.find((path) => existsSync(path))
}

function createWindow(): void {
  const icon = getAppIconPath()
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0D0B1A',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Renderer failed to load:', { errorCode, errorDescription, validatedURL })
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details)
  })

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 3) {
      console.error('Renderer console:', { level, message, line, sourceId })
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const devServerUrls = [
      MAIN_WINDOW_VITE_DEV_SERVER_URL,
      MAIN_WINDOW_VITE_DEV_SERVER_URL.replace('localhost', '127.0.0.1')
    ]

    const loadWithRetry = (retries = 5, delay = 1000, urlIndex = 0) => {
      const url = devServerUrls[urlIndex] ?? devServerUrls[0]
      win.loadURL(url).catch((err) => {
        if (retries > 0) {
          console.log(`Retrying to load Vite dev server... (${retries} attempts left)`)
          setTimeout(() => loadWithRetry(retries - 1, delay, (urlIndex + 1) % devServerUrls.length), delay)
        } else {
          console.error('Failed to load Vite dev server after multiple attempts:', err)
        }
      })
    }
    loadWithRetry()
  } else {
    win.loadFile(join(__dirname, '../renderer/main_window/index.html'))
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const win = windows[0]
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.zenvy.browser')

  // ── Group handlers ───────────────────────────────────────────────────────
  ipcMain.handle('groups:getAll', () => db.getGroups())
  ipcMain.handle('groups:create', (_, name: string) => db.createGroup(name))
  ipcMain.handle('groups:update', (_, id: string, data: { name: string }) => db.updateGroup(id, data.name))
  ipcMain.handle('groups:delete', (_, id: string) => db.deleteGroup(id))

  // ── Profile handlers ─────────────────────────────────────────────────────
  ipcMain.handle('profiles:getAll', () => db.getProfiles())
  ipcMain.handle('profiles:create', (_, data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) =>
    db.createProfile(data)
  )
  ipcMain.handle('profiles:update', (_, id: string, data: Partial<Profile>) =>
    db.updateProfile(id, data)
  )
  ipcMain.handle('profiles:delete', (_, id: string) => db.deleteProfile(id))
  ipcMain.handle('profiles:deleteMany', (_, ids: string[]) => db.deleteProfiles(ids))
  ipcMain.handle('profiles:duplicate', (_, id: string) => db.duplicateProfile(id))
  ipcMain.handle('profiles:export', (_, ids: string[]) => db.exportProfiles(ids))
  ipcMain.handle('profiles:import', (_, jsonData: string) => db.importProfiles(jsonData))

  // ── Tag handlers ─────────────────────────────────────────────────────────
  ipcMain.handle('tags:getAll', () => db.getTags())
  ipcMain.handle('tags:create', (_, name: string, color: string) => db.createTag(name, color))
  ipcMain.handle('tags:delete', (_, id: string) => db.deleteTag(id))

  // ── Browser handlers ─────────────────────────────────────────────────────
  ipcMain.handle('browser:launch', (_, profile: Profile) => browser.launchProfile(profile))
  ipcMain.handle('browser:close', (_, profileId: string) => browser.closeProfile(profileId))
  ipcMain.handle('browser:running', () => browser.getRunningProfiles())

  // ── Cookie handlers ──────────────────────────────────────────────────────
  ipcMain.handle('cookies:get', (_, profileId: string) => cookies.getCookies(profileId))
  ipcMain.handle('cookies:set', (_, profileId: string, cookie: Cookie) => cookies.setCookie(profileId, cookie))
  ipcMain.handle('cookies:delete', (_, profileId: string, domain: string, name: string) =>
    cookies.deleteCookie(profileId, domain, name)
  )
  ipcMain.handle('cookies:clear', (_, profileId: string) => cookies.clearCookies(profileId))

  ipcMain.handle('cookies:import', async (_, profileId: string) => {
    const result = await dialog.showOpenDialog({
      title: 'Import Cookies',
      filters: [{ name: 'Cookie Files', extensions: ['txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return cookies.importCookies(profileId, result.filePaths[0])
  })

  ipcMain.handle('cookies:export', async (_, profileId: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Cookies',
      defaultPath: 'cookies.txt',
      filters: [{ name: 'Cookie Files', extensions: ['txt'] }]
    })
    if (result.canceled || !result.filePath) return false
    cookies.exportCookies(profileId, result.filePath)
    return true
  })

  ipcMain.handle('cookies:sync', (_, profileId: string, chromeCookies: any[]) => {
    cookies.syncCookiesFromBrowser(profileId, chromeCookies)
  })

  // ── Template handlers ────────────────────────────────────────────────────
  ipcMain.handle('templates:getAll', () => templates.getAllTemplates())
  ipcMain.handle('templates:get', (_, name: string) => templates.getTemplate(name))
  ipcMain.handle('templates:save', (_, template: any) => templates.saveCustomTemplate(template))
  ipcMain.handle('templates:delete', (_, name: string) => templates.deleteCustomTemplate(name))

  ipcMain.handle('templates:export', async (_, template: any) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Template',
      defaultPath: `${template.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false
    templates.exportTemplate(template, result.filePath)
    return true
  })

  ipcMain.handle('templates:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Template',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const template = templates.importTemplate(result.filePaths[0])
    templates.saveCustomTemplate(template)
    return template
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
 
