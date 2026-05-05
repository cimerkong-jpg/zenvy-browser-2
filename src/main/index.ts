import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import * as db from './db'
import * as browser from './browser'
import * as cookies from './cookies'
import * as templates from './templates'
import * as scripts from './automation/scripts'
import * as executor from './automation/executor'
import * as history from './automation/history'
import * as scheduler from './automation/scheduler'
import * as appSettings from './appSettings'
import * as userSettings from './userSettings'
import * as extensions from './extensions'
import * as auth from './auth'
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
    title: 'Zenvy Browser',
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
    try {
      if (level >= 3) {
        console.error('Renderer console:', { level, message, line, sourceId })
      }
    } catch { /* ignore EPIPE in dev mode */ }
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

  // ── Browser handlers ─────────────────────────────────────────────────────
  ipcMain.handle('browser:launch', (_, profile: Profile) => browser.launchProfile(profile))
  ipcMain.handle('browser:close', (_, profileId: string) => browser.closeProfile(profileId))
  ipcMain.handle('browser:running', () => browser.getRunningProfiles())
  ipcMain.handle('browser:sync', async () => {
    const profiles = await db.getProfiles()
    const profileIds = profiles.map(p => p.id)
    return browser.syncRunningProfiles(profileIds)
  })

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

  // ── Automation handlers ──────────────────────────────────────────────────
  ipcMain.handle('scripts:getAll', () => scripts.getScripts())
  ipcMain.handle('scripts:get', (_, id: string) => scripts.getScript(id))
  ipcMain.handle('scripts:create', (_, data: { name: string; description: string; code: string }) =>
    scripts.createScript(data)
  )
  ipcMain.handle('scripts:update', (_, id: string, data: { name?: string; description?: string; code?: string }) =>
    scripts.updateScript(id, data)
  )
  ipcMain.handle('scripts:delete', (_, id: string) => scripts.deleteScript(id))
  ipcMain.handle('scripts:run', async (_, scriptId: string, profile: Profile) => {
    const script = scripts.getScript(scriptId)
    if (!script) return { success: false, error: 'Script không tồn tại' }
    try {
      const result = await executor.runScript(script, profile)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ── History handlers ─────────────────────────────────────────────────────
  ipcMain.handle('history:getAll', () => history.getHistory())
  ipcMain.handle('history:delete', (_, id: string) => history.deleteHistoryRecord(id))
  ipcMain.handle('history:clear', () => history.clearHistory())

  // ── Scheduler handlers ───────────────────────────────────────────────────
  ipcMain.handle('scheduler:getAll', () => scheduler.getScheduledTasks())
  ipcMain.handle('scheduler:create', (_, data: Parameters<typeof scheduler.createScheduledTask>[0]) =>
    scheduler.createScheduledTask(data)
  )
  ipcMain.handle('scheduler:update', (_, id: string, data: Parameters<typeof scheduler.updateScheduledTask>[1]) =>
    scheduler.updateScheduledTask(id, data)
  )
  ipcMain.handle('scheduler:toggle', (_, id: string, enabled: boolean) =>
    scheduler.toggleScheduledTask(id, enabled)
  )
  ipcMain.handle('scheduler:delete', (_, id: string) => scheduler.deleteScheduledTask(id))

  // ── Profile variable handlers ────────────────────────────────────────────
  ipcMain.handle('profiles:setVariables', async (_, profileId: string, variables: Record<string, string>) => {
    return db.updateProfile(profileId, { variables })
  })

  // ── App handlers ─────────────────────────────────────────────────────────
  ipcMain.handle('app:reload', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].reload()
    }
  })

  // ── Settings handlers ────────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => appSettings.getSettings())
  ipcMain.handle('settings:update', (_, data: any) => appSettings.updateSettings(data))
  ipcMain.handle('settings:getChromePath', () => appSettings.detectChromePath())
  ipcMain.handle('settings:openDataDir', () => appSettings.openDataDir())
  ipcMain.handle('settings:getDataDir', () => appSettings.getDataDir())
  ipcMain.handle('settings:backup', () => appSettings.backup())
  ipcMain.handle('settings:restore', (_, data: any) => appSettings.restore(data))
  ipcMain.handle('settings:browseChrome', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Chọn Chrome Executable',
      properties: ['openFile'],
      filters: [
        { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['app'] }
      ]
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  // ── User handlers ────────────────────────────────────────────────────────
  ipcMain.handle('user:get', () => userSettings.getUser())
  ipcMain.handle('user:update', (_, data: any) => userSettings.updateUser(data))
  ipcMain.handle('user:getStats', async () => {
    const profiles = await db.getProfiles()
    const allScripts = await scripts.getScripts()
    const historyRecords = await history.getHistory()
    const tasks = await scheduler.getScheduledTasks()
    return {
      profileCount: profiles.length,
      scriptCount: allScripts.length,
      historyCount: historyRecords.length,
      activeSchedulerCount: tasks.filter(t => t.enabled).length,
      totalRuns: historyRecords.length
    }
  })

  // ── Extension handlers ───────────────────────────────────────────────────
  ipcMain.handle('extensions:getAll', (_, profileId: string) => extensions.getExtensions(profileId))
  ipcMain.handle('extensions:toggle', (_, profileId: string, extId: string, enabled: boolean) =>
    extensions.toggleExtension(profileId, extId, enabled)
  )
  ipcMain.handle('extensions:copyTo', (_, fromProfileId: string, toProfileIds: string[], extIds: string[]) =>
    extensions.copyExtensions(fromProfileId, toProfileIds, extIds)
  )

  // ── Browser navigation handler ───────────────────────────────────────────
  ipcMain.handle('browser:navigateTo', async (_, profileId: string, url: string) => {
    // This will be handled by the executor when we have access to the page
    return { success: false, error: 'Not implemented yet - requires active browser connection' }
  })

  // ── Auth handlers ─────────────────────────────────────────────────────────
  ipcMain.handle('auth:signUp', async (_, email: string, password: string) => {
    return await auth.signUp(email, password)
  })

  ipcMain.handle('auth:signIn', async (_, email: string, password: string) => {
    return await auth.signIn(email, password)
  })

  ipcMain.handle('auth:signOut', async () => {
    return await auth.signOut()
  })

  ipcMain.handle('auth:getCurrentUser', async () => {
    return await auth.getCurrentUser()
  })

  ipcMain.handle('auth:getCurrentSession', async () => {
    return await auth.getCurrentSession()
  })

  ipcMain.handle('auth:isAuthenticated', async () => {
    return await auth.isAuthenticated()
  })

  scheduler.startScheduler(() => db.getProfiles())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
 
