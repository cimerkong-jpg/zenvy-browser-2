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

async function requireAuthorizedProfileInCurrentWorkspace(profileId: string): Promise<Profile> {
  const profile = requireProfileInCurrentWorkspace(profileId)
  await workspaces.assertProfileAuthorized(profile)
  return profile
}

async function getAuthorizedProfilesInCurrentWorkspace(): Promise<Profile[]> {
  const workspaceId = requireCurrentWorkspaceId()
  return workspaces.filterAuthorizedProfiles(db.getProfiles(workspaceId))
}

async function getHistoryScope(): Promise<{ workspaceId: string; allowedProfileIds?: Set<string> }> {
  const workspaceId = requireCurrentWorkspaceId()
  const currentMember = await workspaces.getCurrentWorkspaceMember(workspaceId)
  if (!currentMember) throw new Error('Permission denied: not an active workspace member')
  if (currentMember.role === 'owner') return { workspaceId }
  const profiles = await workspaces.filterAuthorizedProfiles(db.getProfiles(workspaceId))
  return { workspaceId, allowedProfileIds: new Set(profiles.map((profile) => profile.id)) }
}

function requireGroupInCurrentWorkspace(groupId: string): void {
  const workspaceId = requireCurrentWorkspaceId()
  if (!db.getGroups(workspaceId).some((item) => item.id === groupId)) {
    throw new Error('Group does not belong to current workspace')
  }
}

async function requireAuthorizedGroupInCurrentWorkspace(groupId: string): Promise<void> {
  const workspaceId = requireCurrentWorkspaceId()
  const group = db.getGroups(workspaceId).find((item) => item.id === groupId)
  if (!group) throw new Error('Group does not belong to current workspace')
  await workspaces.assertGroupAuthorized(group, db.getProfiles(workspaceId))
}

async function requireDeletableGroupInCurrentWorkspace(groupId: string): Promise<void> {
  const workspaceId = requireCurrentWorkspaceId()
  const group = db.getGroups(workspaceId).find((item) => item.id === groupId)
  if (!group) throw new Error('Group does not belong to current workspace')
  await workspaces.assertGroupDeleteAuthorized(group, db.getProfiles(workspaceId))
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
    const workspaceId = requireCurrentWorkspaceId()
    return workspaces.filterAuthorizedGroups(db.getGroups(workspaceId), db.getProfiles(workspaceId))
  })
  ipcMain.handle('groups:create', async (_, name: string) => {
    if (!(await workspaces.hasPermission('group.create'))) throw new Error('Permission denied: group.create')
    const group = db.createGroup(name, requireCurrentWorkspaceId())
    try {
      await cloudSync.pushGroup(group)
      return group
    } catch (error) {
      db.deleteGroup(group.id)
      throw ipcError(error, 'Không thể đồng bộ nhóm hồ sơ')
    }
  })
  ipcMain.handle('groups:update', async (_, id: string, data: { name: string }) => {
    if (!(await workspaces.hasPermission('group.edit'))) throw new Error('Permission denied: group.edit')
    await requireAuthorizedGroupInCurrentWorkspace(id)
    const previous = db.getGroups(requireCurrentWorkspaceId()).find((group) => group.id === id)
    const group = db.updateGroup(id, data.name)
    if (!group) throw new Error('Không tìm thấy nhóm hồ sơ')
    try {
      await cloudSync.pushGroup(group)
    } catch (error) {
      if (previous) db.updateGroup(previous.id, previous.name)
      throw ipcError(error, 'Không thể đồng bộ nhóm hồ sơ')
    }
    return group
  })
  ipcMain.handle('groups:delete', async (_, id: string) => {
    const workspaceId = requireCurrentWorkspaceId()
    const currentMember = await workspaces.getCurrentWorkspaceMember(workspaceId)
    if (!(await workspaces.hasPermission('group.delete'))) throw new Error('Permission denied: group.delete')
    await requireDeletableGroupInCurrentWorkspace(id)
    console.log('[IPC:deleteProfileGroup] Authorization result:', {
      action: 'deleteProfileGroup',
      workspaceId,
      groupId: id,
      currentMemberId: currentMember?.id ?? null,
      currentMemberIsOwner: currentMember?.role === 'owner',
      currentMemberUserGroupId: currentMember?.user_group_id ?? null,
      authorized: true,
    })
    const deletedRow = await cloudSync.deleteGroup(id)
    console.log('[IPC:deleteProfileGroup] Deleted row result:', {
      action: 'deleteProfileGroup',
      workspaceId,
      groupId: id,
      currentMemberId: currentMember?.id ?? null,
      currentMemberIsOwner: currentMember?.role === 'owner',
      currentMemberUserGroupId: currentMember?.user_group_id ?? null,
      deletedRow: deletedRow ? { id: deletedRow.id, workspace_id: deletedRow.workspace_id, name: deletedRow.name } : null,
    })
    db.deleteGroup(id)
  })

  // ── Profile handlers ─────────────────────────────────────────────────────
  ipcMain.handle('profiles:getAll', async () => {
    await cloudSync.syncGroupsAndProfiles()
    return workspaces.filterAuthorizedProfiles(db.getProfiles(requireCurrentWorkspaceId()))
  })
  ipcMain.handle('profiles:create', async (_, data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!(await workspaces.hasPermission('profile.create'))) throw new Error('Permission denied: profile.create')
    if (data.groupId) await requireAuthorizedGroupInCurrentWorkspace(data.groupId)
    const profile = db.createProfile({ ...data, workspaceId: requireCurrentWorkspaceId() }, workspaces.getCurrentWorkspaceId())
    try {
      await cloudSync.pushProfile(profile)
      return profile
    } catch (error) {
      db.deleteProfile(profile.id)
      throw ipcError(error, 'Không thể đồng bộ hồ sơ')
    }
  })
  ipcMain.handle('profiles:update', async (_, id: string, data: Partial<Profile>) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    await requireAuthorizedProfileInCurrentWorkspace(id)
    const previous = db.getProfiles(requireCurrentWorkspaceId()).find((profile) => profile.id === id)
    const profile = db.updateProfile(id, { ...data, workspaceId: requireCurrentWorkspaceId() })
    if (!profile) throw new Error('Không tìm thấy hồ sơ')
    try {
      await cloudSync.pushProfile(profile)
    } catch (error) {
      if (previous) db.updateProfile(previous.id, previous)
      throw ipcError(error, 'Không thể đồng bộ hồ sơ')
    }
    return profile
  })
  ipcMain.handle('profiles:delete', async (_, id: string) => {
    const workspaceId = requireCurrentWorkspaceId()
    const currentMember = await workspaces.getCurrentWorkspaceMember(workspaceId)
    if (!(await workspaces.hasPermission('profile.delete'))) throw new Error('Permission denied: profile.delete')
    await requireAuthorizedProfileInCurrentWorkspace(id)
    console.log('[IPC:deleteProfile] Authorization result:', {
      action: 'deleteProfile',
      workspaceId,
      profileId: id,
      currentMemberId: currentMember?.id ?? null,
      currentMemberIsOwner: currentMember?.role === 'owner',
      currentMemberUserGroupId: currentMember?.user_group_id ?? null,
      authorized: true,
    })
    const deletedRow = await cloudSync.deleteProfile(id)
    console.log('[IPC:deleteProfile] Deleted row result:', {
      action: 'deleteProfile',
      workspaceId,
      profileId: id,
      currentMemberId: currentMember?.id ?? null,
      currentMemberIsOwner: currentMember?.role === 'owner',
      currentMemberUserGroupId: currentMember?.user_group_id ?? null,
      deletedRow: deletedRow ? { id: deletedRow.id, workspace_id: deletedRow.workspace_id, group_id: deletedRow.group_id, name: deletedRow.name } : null,
    })
    db.deleteProfile(id)
  })
  ipcMain.handle('profiles:deleteMany', async (_, ids: string[]) => {
    const workspaceId = requireCurrentWorkspaceId()
    const currentMember = await workspaces.getCurrentWorkspaceMember(workspaceId)
    if (!(await workspaces.hasPermission('profile.delete'))) throw new Error('Permission denied: profile.delete')
    await Promise.all(ids.map(requireAuthorizedProfileInCurrentWorkspace))
    console.log('[IPC:deleteProfile] Authorization result:', {
      action: 'deleteProfile',
      workspaceId,
      profileIds: ids,
      currentMemberId: currentMember?.id ?? null,
      currentMemberIsOwner: currentMember?.role === 'owner',
      currentMemberUserGroupId: currentMember?.user_group_id ?? null,
      authorized: true,
    })
    const deletedRows = await cloudSync.deleteProfiles(ids)
    console.log('[IPC:deleteProfile] Deleted row result:', {
      action: 'deleteProfile',
      workspaceId,
      profileIds: ids,
      currentMemberId: currentMember?.id ?? null,
      currentMemberIsOwner: currentMember?.role === 'owner',
      currentMemberUserGroupId: currentMember?.user_group_id ?? null,
      deletedRows: deletedRows.map((row) => ({ id: row.id, workspace_id: row.workspace_id, group_id: row.group_id, name: row.name })),
    })
    db.deleteProfiles(ids)
  })
  ipcMain.handle('profiles:duplicate', async (_, id: string) => {
    if (!(await workspaces.hasPermission('profile.clone'))) throw new Error('Permission denied: profile.clone')
    await requireAuthorizedProfileInCurrentWorkspace(id)
    const profile = db.duplicateProfile(id)
    if (!profile) throw new Error('Không tìm thấy hồ sơ')
    try {
      await cloudSync.pushProfile(profile)
    } catch (error) {
      db.deleteProfile(profile.id)
      throw ipcError(error, 'Không thể đồng bộ hồ sơ')
    }
    return profile
  })
  ipcMain.handle('profiles:export', async (_, ids: string[]) => {
    if (!(await workspaces.hasPermission('profile.export'))) throw new Error('Permission denied: profile.export')
    await Promise.all(ids.map(requireAuthorizedProfileInCurrentWorkspace))
    return db.exportProfiles(ids)
  })
  ipcMain.handle('profiles:import', async (_, jsonData: string) => {
    if (!(await workspaces.hasPermission('profile.import'))) throw new Error('Permission denied: profile.import')
    const parsed = JSON.parse(jsonData) as { profiles?: Profile[] }
    for (const profile of parsed.profiles ?? []) {
      if (profile.groupId) await requireAuthorizedGroupInCurrentWorkspace(profile.groupId)
    }
    const profiles = db.importProfiles(jsonData, requireCurrentWorkspaceId())
    try {
      await Promise.all(profiles.map((profile) => cloudSync.pushProfile(profile)))
    } catch (error) {
      db.deleteProfiles(profiles.map((profile) => profile.id))
      throw ipcError(error, 'Không thể đồng bộ hồ sơ đã import')
    }
    return profiles
  })

  // ── Browser handlers ─────────────────────────────────────────────────────
  ipcMain.handle('browser:launch', async (_, profile: Profile) => {
    if (!(await workspaces.hasPermission('profile.open'))) throw new Error('Permission denied: profile.open')
    const storedProfile = await requireAuthorizedProfileInCurrentWorkspace(profile.id)
    return browser.launchProfile(storedProfile)
  })
  ipcMain.handle('browser:close', async (_, profileId: string) => {
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    return browser.closeProfile(profileId)
  })
  ipcMain.handle('browser:running', async () => {
    const profiles = await getAuthorizedProfilesInCurrentWorkspace()
    const allowedProfileIds = new Set(profiles.map((profile) => profile.id))
    return browser.getRunningProfiles().filter((profileId) => allowedProfileIds.has(profileId))
  })
  ipcMain.handle('browser:sync', async () => {
    const profiles = await getAuthorizedProfilesInCurrentWorkspace()
    const profileIds = profiles.map(p => p.id)
    return browser.syncRunningProfiles(profileIds)
  })

  // ── Cookie handlers ──────────────────────────────────────────────────────
  ipcMain.handle('cookies:get', async (_, profileId: string) => {
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    try {
      return await cloudSync.pullCookies(profileId)
    } catch (err) {
      console.warn('[CloudSync] Failed to pull cookies:', err)
      return cookies.getCookies(profileId)
    }
  })
  ipcMain.handle('cookies:set', async (_, profileId: string, cookie: Cookie) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    const previous = cookies.getCookies(profileId)
    cookies.setCookie(profileId, cookie)
    const updated = cookies.getCookies(profileId)
    try {
      await cloudSync.pushCookies(profileId, updated)
    } catch (error) {
      cookies.replaceCookies(profileId, previous)
      throw ipcError(error, 'Không thể đồng bộ cookie')
    }
  })
  ipcMain.handle('cookies:delete', async (_, profileId: string, domain: string, name: string) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    const previous = cookies.getCookies(profileId)
    cookies.deleteCookie(profileId, domain, name)
    const updated = cookies.getCookies(profileId)
    try {
      await cloudSync.pushCookies(profileId, updated)
    } catch (error) {
      cookies.replaceCookies(profileId, previous)
      throw ipcError(error, 'Không thể đồng bộ cookie')
    }
  })
  ipcMain.handle('cookies:clear', async (_, profileId: string) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    const previous = cookies.getCookies(profileId)
    cookies.clearCookies(profileId)
    try {
      await cloudSync.deleteCookies(profileId)
    } catch (error) {
      cookies.replaceCookies(profileId, previous)
      throw ipcError(error, 'Không thể đồng bộ cookie')
    }
  })

  ipcMain.handle('cookies:import', async (_, profileId: string) => {
    if (!(await workspaces.hasPermission('profile.import'))) throw new Error('Permission denied: profile.import')
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    const result = await dialog.showOpenDialog({
      title: 'Import Cookies',
      filters: [{ name: 'Cookie Files', extensions: ['txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const previous = cookies.getCookies(profileId)
    const imported = cookies.importCookies(profileId, result.filePaths[0])
    try {
      await cloudSync.pushCookies(profileId, imported)
    } catch (error) {
      cookies.replaceCookies(profileId, previous)
      throw ipcError(error, 'Không thể đồng bộ cookie')
    }
    return imported
  })

  ipcMain.handle('cookies:export', async (_, profileId: string) => {
    if (!(await workspaces.hasPermission('profile.export'))) throw new Error('Permission denied: profile.export')
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
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
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    const previous = cookies.getCookies(profileId)
    cookies.syncCookiesFromBrowser(profileId, chromeCookies)
    const updated = cookies.getCookies(profileId)
    try {
      await cloudSync.pushCookies(profileId, updated)
    } catch (error) {
      cookies.replaceCookies(profileId, previous)
      throw ipcError(error, 'Không thể đồng bộ cookie')
    }
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
    const deleted = scripts.deleteScript(id, requireCurrentWorkspaceId())
    if (!deleted) throw new Error('Không tìm thấy script hoặc không có quyền xóa')
    return deleted
  })
  ipcMain.handle('scripts:run', async (_, scriptId: string, profile: Profile) => {
    if (!(await workspaces.hasPermission('automation.run'))) return { success: false, error: 'Permission denied: automation.run' }
    const script = requireScriptInCurrentWorkspace(scriptId)
    const storedProfile = await requireAuthorizedProfileInCurrentWorkspace(profile.id)
    if (!script) return { success: false, error: 'Script không tồn tại' }
    try {
      const result = await executor.runScript(script, storedProfile)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ── History handlers ─────────────────────────────────────────────────────
  ipcMain.handle('history:getAll', async () => {
    const scope = await getHistoryScope()
    return history.getHistory(scope.workspaceId, scope.allowedProfileIds)
  })
  ipcMain.handle('history:delete', async (_, id: string) => {
    const scope = await getHistoryScope()
    const deleted = history.deleteHistoryRecord(id, scope.workspaceId, scope.allowedProfileIds)
    if (!deleted) throw new Error('History record not found or not authorized')
  })
  ipcMain.handle('history:clear', async () => {
    const scope = await getHistoryScope()
    return history.clearHistory(scope.workspaceId, scope.allowedProfileIds)
  })

  // ── Scheduler handlers ───────────────────────────────────────────────────
  ipcMain.handle('scheduler:getAll', async () => {
    const tasks = scheduler.getScheduledTasks(requireCurrentWorkspaceId())
    const profiles = await workspaces.filterAuthorizedProfiles(db.getProfiles(requireCurrentWorkspaceId()))
    const allowedProfileIds = new Set(profiles.map((profile) => profile.id))
    return tasks.filter((task) => task.profileIds.every((profileId) => allowedProfileIds.has(profileId)))
  })
  ipcMain.handle('scheduler:create', async (_, data: Parameters<typeof scheduler.createScheduledTask>[0]) => {
    if (!(await workspaces.hasPermission('automation.create'))) throw new Error('Permission denied: automation.create')
    requireScriptInCurrentWorkspace(data.scriptId)
    await Promise.all(data.profileIds.map(requireAuthorizedProfileInCurrentWorkspace))
    return scheduler.createScheduledTask(data, requireCurrentWorkspaceId())
  })
  ipcMain.handle('scheduler:update', async (_, id: string, data: Parameters<typeof scheduler.updateScheduledTask>[1]) => {
    if (!(await workspaces.hasPermission('automation.edit'))) throw new Error('Permission denied: automation.edit')
    const existing = scheduler.getScheduledTasks(requireCurrentWorkspaceId()).find((task) => task.id === id)
    if (!existing) throw new Error('Không tìm thấy lịch chạy hoặc không có quyền cập nhật')
    if (data.scriptId) requireScriptInCurrentWorkspace(data.scriptId)
    if (data.profileIds) await Promise.all(data.profileIds.map(requireAuthorizedProfileInCurrentWorkspace))
    const updated = scheduler.updateScheduledTask(id, data, requireCurrentWorkspaceId())
    if (!updated) throw new Error('Không tìm thấy lịch chạy hoặc không có quyền cập nhật')
    return updated
  })
  ipcMain.handle('scheduler:toggle', async (_, id: string, enabled: boolean) => {
    if (!(await workspaces.hasPermission('automation.edit'))) throw new Error('Permission denied: automation.edit')
    const updated = scheduler.toggleScheduledTask(id, enabled, requireCurrentWorkspaceId())
    if (!updated) throw new Error('Không tìm thấy lịch chạy hoặc không có quyền cập nhật')
    return updated
  })
  ipcMain.handle('scheduler:delete', async (_, id: string) => {
    if (!(await workspaces.hasPermission('automation.delete'))) throw new Error('Permission denied: automation.delete')
    const deleted = scheduler.deleteScheduledTask(id, requireCurrentWorkspaceId())
    if (!deleted) throw new Error('Không tìm thấy lịch chạy hoặc không có quyền xóa')
    return deleted
  })

  // ── Profile variable handlers ────────────────────────────────────────────
  ipcMain.handle('profiles:setVariables', async (_, profileId: string, variables: Record<string, string>) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    const previous = db.getProfiles(requireCurrentWorkspaceId()).find((profile) => profile.id === profileId)
    const profile = db.updateProfile(profileId, { variables })
    if (!profile) throw new Error('Không tìm thấy hồ sơ')
    try {
      await cloudSync.pushProfile(profile)
    } catch (error) {
      if (previous) db.updateProfile(previous.id, previous)
      throw ipcError(error, 'Không thể đồng bộ biến hồ sơ')
    }
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
    const profiles = await workspaces.filterAuthorizedProfiles(db.getProfiles(workspaces.getCurrentWorkspaceId()))
    const allScripts = await scripts.getScripts(workspaces.getCurrentWorkspaceId())
    const historyScope = await getHistoryScope()
    const historyRecords = await history.getHistory(historyScope.workspaceId, historyScope.allowedProfileIds)
    const allowedProfileIds = new Set(profiles.map((profile) => profile.id))
    const tasks = scheduler.getScheduledTasks(workspaces.getCurrentWorkspaceId()).filter((task) =>
      task.profileIds.every((profileId) => allowedProfileIds.has(profileId))
    )
    return {
      profileCount: profiles.length,
      scriptCount: allScripts.length,
      historyCount: historyRecords.length,
      activeSchedulerCount: tasks.filter(t => t.enabled).length,
      totalRuns: historyRecords.length
    }
  })

  // ── Extension handlers ───────────────────────────────────────────────────
  ipcMain.handle('extensions:getAll', async (_, profileId: string) => {
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    return extensions.getExtensions(profileId)
  })
  ipcMain.handle('extensions:toggle', async (_, profileId: string, extId: string, enabled: boolean) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
    return extensions.toggleExtension(profileId, extId, enabled)
  })
  ipcMain.handle('extensions:copyTo', async (_, fromProfileId: string, toProfileIds: string[], extIds: string[]) => {
    if (!(await workspaces.hasPermission('profile.edit'))) throw new Error('Permission denied: profile.edit')
    await requireAuthorizedProfileInCurrentWorkspace(fromProfileId)
    await Promise.all(toProfileIds.map(requireAuthorizedProfileInCurrentWorkspace))
    return extensions.copyExtensions(fromProfileId, toProfileIds, extIds)
  })

  // ── Browser navigation handler ───────────────────────────────────────────
  ipcMain.handle('browser:navigateTo', async (_, profileId: string, url: string) => {
    await requireAuthorizedProfileInCurrentWorkspace(profileId)
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
    try {
      return await workspaces.getMyWorkspaces()
    } catch (error) {
      const normalized = ipcError(error, 'Failed to load workspaces')
      console.error('[IPC workspaces:getWorkspaces] Failed:', normalized.message)
      throw normalized
    }
  })
  ipcMain.handle('workspaces:getCurrent', () => workspaces.getCurrentWorkspace())
  ipcMain.handle('workspaces:switchWorkspace', async (_, workspaceId: string | null) => {
    try {
      const result = await workspaces.setCurrentWorkspace(workspaceId)
      try {
        await cloudSync.syncGroupsAndProfiles(true)
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : String(syncError)
        console.warn('[IPC workspaces:switchWorkspace] Cloud sync failed after switch:', message)
      }
      return result
    } catch (error) {
      const normalized = ipcError(error, 'Failed to switch workspace')
      console.error('[IPC workspaces:switchWorkspace] Failed:', normalized.message)
      throw normalized
    }
  })
  ipcMain.handle('workspaces:createWorkspace', async (_, input: any) => {
    try {
      return await workspaces.createWorkspace(input)
    } catch (error) {
      const normalized = ipcError(error, 'Failed to create workspace')
      console.error('[IPC workspaces:createWorkspace] Failed:', normalized.message)
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
      const message = error instanceof Error ? error.message : String(error)
      console.error('[IPC:inviteMember] Error:', message)
      throw new Error(message)
    }
  })
  ipcMain.handle('workspaces:revokeInvitation', async (_, invitationId: string) => {
    try {
      return await workspaces.revokeInvitation(invitationId)
    } catch (error) {
      throw ipcError(error, 'Failed to revoke invitation')
    }
  })
  ipcMain.handle('workspaces:resendInvitation', async (_, invitationId: string) => {
    try {
      return await workspaces.resendInvitation(invitationId)
    } catch (error) {
      throw ipcError(error, 'Failed to resend invitation')
    }
  })
  ipcMain.handle('workspaces:removeMember', async (_, memberId: string) => {
    try {
      return await workspaces.removeMember(memberId)
    } catch (error) {
      throw ipcError(error, 'Failed to remove member')
    }
  })
  ipcMain.handle('workspaces:updateMemberRole', async (_, memberId: string, role: any) => {
    try {
      return await workspaces.updateMemberRole(memberId, role)
    } catch (error) {
      throw ipcError(error, 'Failed to update member role')
    }
  })
  ipcMain.handle('workspaces:updateMember', async (_, memberId: string, input: any) => {
    try {
      return await workspaces.updateMember(memberId, input)
    } catch (error) {
      throw ipcError(error, 'Failed to update member')
    }
  })
  ipcMain.handle('workspaces:getMemberAuthorizations', async (_, memberId: string) => {
    try {
      return await workspaces.getMemberAuthorizations(memberId)
    } catch (error) {
      throw ipcError(error, 'Failed to get member authorizations')
    }
  })
  ipcMain.handle('workspaces:updateMemberAuthorizations', async (_, memberId: string, input: any) => {
    try {
      return await workspaces.updateMemberAuthorizations(memberId, input)
    } catch (error) {
      throw ipcError(error, 'Failed to update member authorizations')
    }
  })
  ipcMain.handle('workspaces:getPermissions', (_, workspaceId?: string) => workspaces.getMyPermissions(workspaceId))
  ipcMain.handle('workspaces:getRolePermissions', (_, workspaceId?: string) => workspaces.getWorkspaceRolePermissions(workspaceId))
  ipcMain.handle('workspaces:updateRolePermissions', (_, workspaceId: string, role: any, permissions: any) => workspaces.updateRolePermissions(workspaceId, role, permissions))
  ipcMain.handle('workspaces:hasPermission', (_, permissionKey: any, workspaceId?: string) => workspaces.hasPermission(permissionKey, workspaceId))
  ipcMain.handle('workspaces:getUserGroups', (_, workspaceId: string) => workspaces.getWorkspaceUserGroups(workspaceId))
  ipcMain.handle('workspaces:createUserGroup', (_, input: any) => workspaces.createWorkspaceUserGroup(input))
  ipcMain.handle('workspaces:updateUserGroup', (_, id: string, name: string, description?: string, permissionOverrides?: any) =>
    workspaces.updateWorkspaceUserGroup(id, name, description, permissionOverrides)
  )
  ipcMain.handle('workspaces:deleteUserGroup', (_, id: string) => workspaces.deleteWorkspaceUserGroup(id))
  ipcMain.handle('workspaces:ensureDefaultWorkspace', () => workspaces.ensureDefaultWorkspace())
  ipcMain.handle('workspaces:deleteWorkspace', (_, workspaceId: string) => workspaces.deleteWorkspace(workspaceId))
  ipcMain.handle('workspaces:updateWorkspace', (_, workspaceId: string, updates: any) => workspaces.updateWorkspace(workspaceId, updates))
  ipcMain.handle('workspaces:updateWorkspaceSettings', (_, workspaceId: string, settings: any) => workspaces.updateWorkspaceSettings(workspaceId, settings))

  scheduler.startScheduler({
    getProfiles: (workspaceId) => db.getProfiles(workspaceId),
    authorizeProfileRun: (workspaceId, profile) => workspaces.assertAutomationProfileRunAuthorized(workspaceId, profile),
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
