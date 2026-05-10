import { app, shell, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
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
import * as cloudSync from './cloudSync'
import * as workspaces from './workspaces'
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
      nodeIntegration: false,
      devTools: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    // Auto-open DevTools in development
    if (!app.isPackaged) {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  })

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

function requireCurrentWorkspaceId(): string {
  const workspaceId = workspaces.getCurrentWorkspaceId()
  if (!workspaceId) throw new Error('No active workspace')
  return workspaceId
}

function requireProfileInCurrentWorkspace(profileId: string): Profile {
  const workspaceId = requireCurrentWorkspaceId()
  const profile = db.getProfiles(workspaceId).find((item) => item.id === profileId)
  if (!profile) throw new Error('Profile does not belong to current workspace')
  return profile
}

function requireGroupInCurrentWorkspace(groupId: string): void {
  const workspaceId = requireCurrentWorkspaceId()
  if (!db.getGroups(workspaceId).some((item) => item.id === groupId)) {
    throw new Error('Group does not belong to current workspace')
  }
}

function requireScriptInCurrentWorkspace(scriptId: string) {
  const workspaceId = requireCurrentWorkspaceId()
  const script = scripts.getScript(scriptId, workspaceId)
  if (!script) throw new Error('Script does not belong to current workspace')
  return script
}

function ipcError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [
      typeof value.message === 'string' ? value.message : null,
      typeof value.details === 'string' ? value.details : null,
      typeof value.hint === 'string' ? `Hint: ${value.hint}` : null,
      typeof value.code === 'string' ? `Code: ${value.code}` : null,
    ].filter(Boolean)
    if (parts.length > 0) return new Error(parts.join(' | '))
    try {
      return new Error(JSON.stringify(error))
    } catch {
      return new Error(String(error))
    }
  }
  return new Error(fallback)
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

  // Register global shortcuts for DevTools
  globalShortcut.register('F12', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.toggleDevTools()
    }
  })

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.toggleDevTools()
    }
  })

  // ── Group handlers ───────────────────────────────────────────────────────
  ipcMain.handle('groups:getAll', async () => {
    await cloudSync.syncGroupsAndProfiles()
    return db.getGroups(requireCurrentWorkspaceId())
  })
  ipcMain.handle('groups:create', async (_, name: string) => {
    if (!(await workspaces.hasPermission('group.create'))) throw new Error('Permission denied: group.create')
    const group = db.createGroup(name, requireCurrentWorkspaceId())
    cloudSync.pushGroup(group).catch((err) => console.warn('[CloudSync] Failed to push group:', err))
    return group
  })
  ipcMain.handle('groups:update', async (_, id: string, data: { name: string }) => {
    if (!(await workspaces.hasPermission('group.edit'))) throw new Error('Permission denied: group.edit')
    requireGroupInCurrentWorkspace(id)
    const group = db.updateGroup(id, data.name)
    if (group) cloudSync.pushGroup(group).catch((err) => console.warn('[CloudSync] Failed to push group:', err))
    return group
  })
  ipcMain.handle('groups:delete', async (_, id: string) => {
    if (!(await workspaces.hasPermission('group.delete'))) throw new Error('Permission denied: group.delete')
    requireGroupInCurrentWorkspace(id)
    db.deleteGroup(id)
    cloudSync.deleteGroup(id).catch((err) => console.warn('[CloudSync] Failed to delete group:', err))
  })

  // ── Profile handlers ─────────────────────────────────────────────────────
  ipcMain.handle('profiles:getAll', async () => {
    await cloudSync.syncGroupsAndProfiles()
    return db.getProfiles(requireCurrentWorkspaceId())
  })
  ipcMain.handle('profiles:create', async (_, data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!(await workspaces.hasPermission('profile.create'))) throw new Error('Permission denied: profile.create')
    const profile = db.createProfile({ ...data, workspaceId: requireCurrentWorkspaceId() }, workspaces.getCurrentWorkspaceId())
    cloudSync.pushProfile(profile).catch((err) => console.warn('[CloudSync] Failed to push profile:', err))
    return profile
  })
  ipcMain.handle('profiles:update', async (_, id: string, data: Partial<Profile>) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(id)
    const profile = db.updateProfile(id, { ...data, workspaceId: requireCurrentWorkspaceId() })
    if (profile) cloudSync.pushProfile(profile).catch((err) => console.warn('[CloudSync] Failed to push profile:', err))
    return profile
  })
  ipcMain.handle('profiles:delete', async (_, id: string) => {
    if (!(await workspaces.hasPermission('profile.delete'))) throw new Error('Permission denied: profile.delete')
    requireProfileInCurrentWorkspace(id)
    db.deleteProfile(id)
    cloudSync.deleteProfile(id).catch((err) => console.warn('[CloudSync] Failed to delete profile:', err))
  })
  ipcMain.handle('profiles:deleteMany', async (_, ids: string[]) => {
    if (!(await workspaces.hasPermission('profile.delete'))) throw new Error('Permission denied: profile.delete')
    ids.forEach(requireProfileInCurrentWorkspace)
    db.deleteProfiles(ids)
    cloudSync.deleteProfiles(ids).catch((err) => console.warn('[CloudSync] Failed to delete profiles:', err))
  })
  ipcMain.handle('profiles:duplicate', async (_, id: string) => {
    if (!(await workspaces.hasPermission('profile.clone'))) throw new Error('Permission denied: profile.clone')
    requireProfileInCurrentWorkspace(id)
    const profile = db.duplicateProfile(id)
    if (profile) cloudSync.pushProfile(profile).catch((err) => console.warn('[CloudSync] Failed to push profile:', err))
    return profile
  })
  ipcMain.handle('profiles:export', async (_, ids: string[]) => {
    if (!(await workspaces.hasPermission('profile.export'))) throw new Error('Permission denied: profile.export')
    ids.forEach(requireProfileInCurrentWorkspace)
    return db.exportProfiles(ids)
  })
  ipcMain.handle('profiles:import', async (_, jsonData: string) => {
    if (!(await workspaces.hasPermission('profile.import'))) throw new Error('Permission denied: profile.import')
    const profiles = db.importProfiles(jsonData, requireCurrentWorkspaceId())
    for (const profile of profiles) {
      cloudSync.pushProfile(profile).catch((err) => console.warn('[CloudSync] Failed to push imported profile:', err))
    }
    return profiles
  })

  // ── Browser handlers ─────────────────────────────────────────────────────
  ipcMain.handle('browser:launch', async (_, profile: Profile) => {
    if (!(await workspaces.hasPermission('profile.open'))) throw new Error('Permission denied: profile.open')
    const storedProfile = requireProfileInCurrentWorkspace(profile.id)
    return browser.launchProfile(storedProfile)
  })
  ipcMain.handle('browser:close', (_, profileId: string) => {
    requireProfileInCurrentWorkspace(profileId)
    return browser.closeProfile(profileId)
  })
  ipcMain.handle('browser:running', () => browser.getRunningProfiles())
  ipcMain.handle('browser:sync', async () => {
    const profiles = await db.getProfiles(requireCurrentWorkspaceId())
    const profileIds = profiles.map(p => p.id)
    return browser.syncRunningProfiles(profileIds)
  })

  // ── Cookie handlers ──────────────────────────────────────────────────────
  ipcMain.handle('cookies:get', async (_, profileId: string) => {
    requireProfileInCurrentWorkspace(profileId)
    try {
      return await cloudSync.pullCookies(profileId)
    } catch (err) {
      console.warn('[CloudSync] Failed to pull cookies:', err)
      return cookies.getCookies(profileId)
    }
  })
  ipcMain.handle('cookies:set', async (_, profileId: string, cookie: Cookie) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(profileId)
    cookies.setCookie(profileId, cookie)
    const updated = cookies.getCookies(profileId)
    cloudSync.pushCookies(profileId, updated).catch((err) => console.warn('[CloudSync] Failed to push cookies:', err))
  })
  ipcMain.handle('cookies:delete', async (_, profileId: string, domain: string, name: string) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(profileId)
    cookies.deleteCookie(profileId, domain, name)
    const updated = cookies.getCookies(profileId)
    cloudSync.pushCookies(profileId, updated).catch((err) => console.warn('[CloudSync] Failed to push cookies:', err))
  })
  ipcMain.handle('cookies:clear', async (_, profileId: string) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(profileId)
    cookies.clearCookies(profileId)
    cloudSync.deleteCookies(profileId).catch((err) => console.warn('[CloudSync] Failed to clear cloud cookies:', err))
  })

  ipcMain.handle('cookies:import', async (_, profileId: string) => {
    if (!(await workspaces.hasPermission('profile.import'))) throw new Error('Permission denied: profile.import')
    requireProfileInCurrentWorkspace(profileId)
    const result = await dialog.showOpenDialog({
      title: 'Import Cookies',
      filters: [{ name: 'Cookie Files', extensions: ['txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const imported = cookies.importCookies(profileId, result.filePaths[0])
    cloudSync.pushCookies(profileId, imported).catch((err) => console.warn('[CloudSync] Failed to push imported cookies:', err))
    return imported
  })

  ipcMain.handle('cookies:export', async (_, profileId: string) => {
    if (!(await workspaces.hasPermission('profile.export'))) throw new Error('Permission denied: profile.export')
    requireProfileInCurrentWorkspace(profileId)
    const result = await dialog.showSaveDialog({
      title: 'Export Cookies',
      defaultPath: 'cookies.txt',
      filters: [{ name: 'Cookie Files', extensions: ['txt'] }]
    })
    if (result.canceled || !result.filePath) return false
    cookies.exportCookies(profileId, result.filePath)
    return true
  })

  ipcMain.handle('cookies:sync', async (_, profileId: string, chromeCookies: any[]) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(profileId)
    cookies.syncCookiesFromBrowser(profileId, chromeCookies)
    const updated = cookies.getCookies(profileId)
    cloudSync.pushCookies(profileId, updated).catch((err) => console.warn('[CloudSync] Failed to push synced cookies:', err))
  })

  // ── Template handlers ────────────────────────────────────────────────────
  ipcMain.handle('templates:getAll', () => templates.getAllTemplates(requireCurrentWorkspaceId()))
  ipcMain.handle('templates:get', (_, name: string) => templates.getTemplate(name))
  ipcMain.handle('templates:save', (_, template: any) => templates.saveCustomTemplate(template, requireCurrentWorkspaceId()))
  ipcMain.handle('templates:delete', (_, name: string) => templates.deleteCustomTemplate(name, requireCurrentWorkspaceId()))

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
    templates.saveCustomTemplate(template, requireCurrentWorkspaceId())
    return template
  })

  // ── Automation handlers ──────────────────────────────────────────────────
  ipcMain.handle('scripts:getAll', () => scripts.getScripts(requireCurrentWorkspaceId()))
  ipcMain.handle('scripts:get', (_, id: string) => requireScriptInCurrentWorkspace(id))
  ipcMain.handle('scripts:create', async (_, data: { name: string; description: string; code: string }) => {
    if (!(await workspaces.hasPermission('automation.create'))) throw new Error('Permission denied: automation.create')
    return scripts.createScript(data, requireCurrentWorkspaceId())
  })
  ipcMain.handle('scripts:update', async (_, id: string, data: { name?: string; description?: string; code?: string }) => {
    if (!(await workspaces.hasPermission('automation.edit'))) throw new Error('Permission denied: automation.edit')
    requireScriptInCurrentWorkspace(id)
    return scripts.updateScript(id, data, requireCurrentWorkspaceId())
  })
  ipcMain.handle('scripts:delete', async (_, id: string) => {
    if (!(await workspaces.hasPermission('automation.delete'))) throw new Error('Permission denied: automation.delete')
    requireScriptInCurrentWorkspace(id)
    return scripts.deleteScript(id, requireCurrentWorkspaceId())
  })
  ipcMain.handle('scripts:run', async (_, scriptId: string, profile: Profile) => {
    if (!(await workspaces.hasPermission('automation.run'))) return { success: false, error: 'Permission denied: automation.run' }
    const script = requireScriptInCurrentWorkspace(scriptId)
    const storedProfile = requireProfileInCurrentWorkspace(profile.id)
    if (!script) return { success: false, error: 'Script không tồn tại' }
    try {
      const result = await executor.runScript(script, storedProfile)
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
  ipcMain.handle('scheduler:getAll', () => scheduler.getScheduledTasks(requireCurrentWorkspaceId()))
  ipcMain.handle('scheduler:create', async (_, data: Parameters<typeof scheduler.createScheduledTask>[0]) => {
    if (!(await workspaces.hasPermission('automation.create'))) throw new Error('Permission denied: automation.create')
    requireScriptInCurrentWorkspace(data.scriptId)
    data.profileIds.forEach(requireProfileInCurrentWorkspace)
    return scheduler.createScheduledTask(data, requireCurrentWorkspaceId())
  })
  ipcMain.handle('scheduler:update', async (_, id: string, data: Parameters<typeof scheduler.updateScheduledTask>[1]) => {
    if (!(await workspaces.hasPermission('automation.edit'))) throw new Error('Permission denied: automation.edit')
    if (data.scriptId) requireScriptInCurrentWorkspace(data.scriptId)
    data.profileIds?.forEach(requireProfileInCurrentWorkspace)
    return scheduler.updateScheduledTask(id, data, requireCurrentWorkspaceId())
  })
  ipcMain.handle('scheduler:toggle', async (_, id: string, enabled: boolean) => {
    if (!(await workspaces.hasPermission('automation.edit'))) throw new Error('Permission denied: automation.edit')
    return scheduler.toggleScheduledTask(id, enabled, requireCurrentWorkspaceId())
  })
  ipcMain.handle('scheduler:delete', async (_, id: string) => {
    if (!(await workspaces.hasPermission('automation.delete'))) throw new Error('Permission denied: automation.delete')
    return scheduler.deleteScheduledTask(id, requireCurrentWorkspaceId())
  })

  // ── Profile variable handlers ────────────────────────────────────────────
  ipcMain.handle('profiles:setVariables', async (_, profileId: string, variables: Record<string, string>) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(profileId)
    const profile = db.updateProfile(profileId, { variables })
    if (profile) cloudSync.pushProfile(profile).catch((err) => console.warn('[CloudSync] Failed to push profile variables:', err))
    return profile
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
    const profiles = await db.getProfiles(workspaces.getCurrentWorkspaceId())
    const allScripts = await scripts.getScripts(workspaces.getCurrentWorkspaceId())
    const historyRecords = await history.getHistory()
    const tasks = await scheduler.getScheduledTasks(workspaces.getCurrentWorkspaceId())
    return {
      profileCount: profiles.length,
      scriptCount: allScripts.length,
      historyCount: historyRecords.length,
      activeSchedulerCount: tasks.filter(t => t.enabled).length,
      totalRuns: historyRecords.length
    }
  })

  // ── Extension handlers ───────────────────────────────────────────────────
  ipcMain.handle('extensions:getAll', (_, profileId: string) => {
    requireProfileInCurrentWorkspace(profileId)
    return extensions.getExtensions(profileId)
  })
  ipcMain.handle('extensions:toggle', async (_, profileId: string, extId: string, enabled: boolean) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(profileId)
    return extensions.toggleExtension(profileId, extId, enabled)
  })
  ipcMain.handle('extensions:copyTo', async (_, fromProfileId: string, toProfileIds: string[], extIds: string[]) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    requireProfileInCurrentWorkspace(fromProfileId)
    toProfileIds.forEach(requireProfileInCurrentWorkspace)
    return extensions.copyExtensions(fromProfileId, toProfileIds, extIds)
  })

  // ── Browser navigation handler ───────────────────────────────────────────
  ipcMain.handle('browser:navigateTo', async (_, profileId: string, url: string) => {
    requireProfileInCurrentWorkspace(profileId)
    // This will be handled by the executor when we have access to the page
    return { success: false, error: 'Not implemented yet - requires active browser connection' }
  })

  // ── Auth handlers ─────────────────────────────────────────────────────────
  ipcMain.handle('auth:signUp', async (_, email: string, password: string) => {
    return await auth.signUp(email, password)
  })

  ipcMain.handle('auth:signIn', async (_, email: string, password: string) => {
    const result = await auth.signIn(email, password)
    if (result.session) {
      await workspaces.ensureUserProfile()
      await workspaces.acceptPendingInvitations()
      await workspaces.getMyWorkspaces()
      await cloudSync.syncGroupsAndProfiles(true)
    }
    return result
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

  ipcMain.handle('workspaces:getWorkspaces', async () => {
    console.log('[IPC workspaces:getWorkspaces] Received request')
    try {
      const result = await workspaces.getMyWorkspaces()
      console.log('[IPC workspaces:getWorkspaces] Returning workspaces:', result)
      return result
    } catch (error) {
      const normalized = ipcError(error, 'Failed to load workspaces')
      console.error('[IPC workspaces:getWorkspaces] Failed:', {
        message: normalized.message,
        raw: error,
      })
      throw normalized
    }
  })
  ipcMain.handle('workspaces:getCurrent', () => workspaces.getCurrentWorkspace())
  ipcMain.handle('workspaces:switchWorkspace', async (_, workspaceId: string | null) => {
    console.log('[IPC workspaces:switchWorkspace] Received workspaceId:', workspaceId)
    try {
      const result = await workspaces.setCurrentWorkspace(workspaceId)
      try {
        await cloudSync.syncGroupsAndProfiles(true)
      } catch (syncError) {
        console.warn('[IPC workspaces:switchWorkspace] Cloud sync failed after switch:', syncError)
      }
      console.log('[IPC workspaces:switchWorkspace] Returning payload:', result)
      return result
    } catch (error) {
      const normalized = ipcError(error, 'Failed to switch workspace')
      console.error('[IPC workspaces:switchWorkspace] Failed:', {
        message: normalized.message,
        raw: error,
      })
      throw normalized
    }
  })
  ipcMain.handle('workspaces:createWorkspace', async (_, input: any) => {
    console.log('[IPC workspaces:createWorkspace] Received payload:', input)
    try {
      const workspace = await workspaces.createWorkspace(input)
      console.log('[IPC workspaces:createWorkspace] Returning workspace:', workspace)
      return workspace
    } catch (error) {
      const normalized = ipcError(error, 'Failed to create workspace')
      console.error('[IPC workspaces:createWorkspace] Failed:', {
        message: normalized.message,
        raw: error,
      })
      throw normalized
    }
  })
  ipcMain.handle('workspaces:acceptInvitations', () => workspaces.acceptPendingInvitations())
  ipcMain.handle('workspaces:getMembers', (_, workspaceId: string) => workspaces.getWorkspaceMembers(workspaceId))
  ipcMain.handle('workspaces:getInvitations', (_, workspaceId: string) => workspaces.getWorkspaceInvitations(workspaceId))
  ipcMain.handle('workspaces:inviteMember', async (_, input: Parameters<typeof workspaces.inviteMember>[0]) => {
    try {
      return await workspaces.inviteMember(input)
    } catch (error) {
      console.error('[IPC:inviteMember] Error:', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(message)
    }
  })
  ipcMain.handle('workspaces:revokeInvitation', (_, invitationId: string) => workspaces.revokeInvitation(invitationId))
  ipcMain.handle('workspaces:resendInvitation', (_, invitationId: string) => workspaces.resendInvitation(invitationId))
  ipcMain.handle('workspaces:removeMember', (_, memberId: string) => workspaces.removeMember(memberId))
  ipcMain.handle('workspaces:updateMemberRole', (_, memberId: string, role: any) => workspaces.updateMemberRole(memberId, role))
  ipcMain.handle('workspaces:updateMember', (_, memberId: string, input: any) => workspaces.updateMember(memberId, input))
  ipcMain.handle('workspaces:getPermissions', (_, workspaceId?: string) => workspaces.getMyPermissions(workspaceId))
  ipcMain.handle('workspaces:getRolePermissions', (_, workspaceId?: string) => workspaces.getWorkspaceRolePermissions(workspaceId))
  ipcMain.handle('workspaces:updateRolePermissions', (_, workspaceId: string, role: any, permissions: any) => workspaces.updateRolePermissions(workspaceId, role, permissions))
  ipcMain.handle('workspaces:hasPermission', (_, permissionKey: any, workspaceId?: string) => workspaces.hasPermission(permissionKey, workspaceId))
  ipcMain.handle('workspaces:getUserGroups', (_, workspaceId: string) => workspaces.getWorkspaceUserGroups(workspaceId))
  ipcMain.handle('workspaces:createUserGroup', (_, input: any) => workspaces.createWorkspaceUserGroup(input))
  ipcMain.handle('workspaces:updateUserGroup', (_, id: string, name: string, description?: string) => workspaces.updateWorkspaceUserGroup(id, name, description))
  ipcMain.handle('workspaces:deleteUserGroup', (_, id: string) => workspaces.deleteWorkspaceUserGroup(id))
  ipcMain.handle('workspaces:ensureDefaultWorkspace', () => workspaces.ensureDefaultWorkspace())
  ipcMain.handle('workspaces:deleteWorkspace', (_, workspaceId: string) => workspaces.deleteWorkspace(workspaceId))
  ipcMain.handle('workspaces:updateWorkspace', (_, workspaceId: string, updates: any) => workspaces.updateWorkspace(workspaceId, updates))
  ipcMain.handle('workspaces:updateWorkspaceSettings', (_, workspaceId: string, settings: any) => workspaces.updateWorkspaceSettings(workspaceId, settings))

  scheduler.startScheduler(() => db.getProfiles(workspaces.getCurrentWorkspaceId()))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
 
