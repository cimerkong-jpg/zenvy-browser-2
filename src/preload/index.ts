import { contextBridge, ipcRenderer } from 'electron'
import type { Profile, Group, AutomationScript, ScriptExecution, ScheduledTask, TaskHistoryRecord, AppSettings, UserProfile, UserStats, ExtensionInfo } from '../shared/types'
import type { CreateWorkspaceInput, CreateWorkspaceUserGroupInput, InviteMemberInput, PermissionKey, RolePermissionMap, UpdateWorkspaceMemberInput, Workspace, WorkspaceInvitation, WorkspaceMember, WorkspaceRole, WorkspaceUserGroup, WorkspaceWithStats } from '../shared/workspace-types'

const api = {
  groups: {
    getAll: (): Promise<Group[]> => ipcRenderer.invoke('groups:getAll'),
    create: (name: string): Promise<Group> => ipcRenderer.invoke('groups:create', name),
    update: (id: string, data: { name: string }): Promise<Group | null> =>
      ipcRenderer.invoke('groups:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('groups:delete', id)
  },
  profiles: {
    getAll: (): Promise<Profile[]> => ipcRenderer.invoke('profiles:getAll'),
    create: (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profile> =>
      ipcRenderer.invoke('profiles:create', data),
    update: (id: string, data: Partial<Profile>): Promise<Profile | null> =>
      ipcRenderer.invoke('profiles:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('profiles:delete', id),
    deleteMany: (ids: string[]): Promise<void> => ipcRenderer.invoke('profiles:deleteMany', ids),
    duplicate: (id: string): Promise<Profile | null> => ipcRenderer.invoke('profiles:duplicate', id),
    export: (ids: string[]): Promise<string> => ipcRenderer.invoke('profiles:export', ids),
    import: (jsonData: string): Promise<Profile[]> => ipcRenderer.invoke('profiles:import', jsonData),
    setVariables: (profileId: string, variables: Record<string, string>): Promise<Profile | null> =>
      ipcRenderer.invoke('profiles:setVariables', profileId, variables)
  },
  browser: {
    launch: (profile: Profile): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('browser:launch', profile),
    close: (profileId: string): Promise<void> => ipcRenderer.invoke('browser:close', profileId),
    running: (): Promise<string[]> => ipcRenderer.invoke('browser:running'),
    sync: (): Promise<string[]> => ipcRenderer.invoke('browser:sync'),
    onStatusChanged: (callback: (data: { profileId: string; isRunning: boolean }) => void) => {
      const listener = (_event: any, data: { profileId: string; isRunning: boolean }) => callback(data)
      ipcRenderer.on('browser:status-changed', listener)
      return () => ipcRenderer.removeListener('browser:status-changed', listener)
    },
    onChromeDownloadStatus: (callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('browser:chrome-download-status', listener)
      return () => ipcRenderer.removeListener('browser:chrome-download-status', listener)
    }
  },
  cookies: {
    get: (profileId: string) => ipcRenderer.invoke('cookies:get', profileId),
    set: (profileId: string, cookie: any) => ipcRenderer.invoke('cookies:set', profileId, cookie),
    delete: (profileId: string, domain: string, name: string) => 
      ipcRenderer.invoke('cookies:delete', profileId, domain, name),
    clear: (profileId: string) => ipcRenderer.invoke('cookies:clear', profileId),
    import: (profileId: string) => ipcRenderer.invoke('cookies:import', profileId),
    export: (profileId: string) => ipcRenderer.invoke('cookies:export', profileId),
    sync: (profileId: string, chromeCookies: any[]) => 
      ipcRenderer.invoke('cookies:sync', profileId, chromeCookies)
  },
  templates: {
    getAll: () => ipcRenderer.invoke('templates:getAll'),
    get: (name: string) => ipcRenderer.invoke('templates:get', name),
    save: (template: any) => ipcRenderer.invoke('templates:save', template),
    delete: (name: string) => ipcRenderer.invoke('templates:delete', name),
    export: (template: any) => ipcRenderer.invoke('templates:export', template),
    import: () => ipcRenderer.invoke('templates:import')
  },
  scripts: {
    getAll: (): Promise<AutomationScript[]> => ipcRenderer.invoke('scripts:getAll'),
    get: (id: string): Promise<AutomationScript | null> => ipcRenderer.invoke('scripts:get', id),
    create: (data: Pick<AutomationScript, 'name' | 'description' | 'code'>): Promise<AutomationScript> =>
      ipcRenderer.invoke('scripts:create', data),
    update: (id: string, data: Partial<Pick<AutomationScript, 'name' | 'description' | 'code'>>): Promise<AutomationScript | null> =>
      ipcRenderer.invoke('scripts:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('scripts:delete', id),
    run: (scriptId: string, profile: Profile): Promise<{ success: boolean; data?: ScriptExecution; error?: string }> =>
      ipcRenderer.invoke('scripts:run', scriptId, profile),
    onExecutionUpdate: (callback: (execution: ScriptExecution) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, execution: ScriptExecution) => callback(execution)
      ipcRenderer.on('automation:execution-update', listener)
      return () => ipcRenderer.removeListener('automation:execution-update', listener)
    }
  },
  history: {
    getAll: (): Promise<TaskHistoryRecord[]> => ipcRenderer.invoke('history:getAll'),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('history:delete', id),
    clear: (): Promise<void> => ipcRenderer.invoke('history:clear')
  },
  scheduler: {
    getAll: (): Promise<ScheduledTask[]> => ipcRenderer.invoke('scheduler:getAll'),
    create: (data: Pick<ScheduledTask, 'scriptId' | 'scriptName' | 'profileIds' | 'type' | 'runAt' | 'intervalMs'>): Promise<ScheduledTask> =>
      ipcRenderer.invoke('scheduler:create', data),
    update: (id: string, data: Partial<Pick<ScheduledTask, 'scriptId' | 'scriptName' | 'profileIds' | 'type' | 'runAt' | 'intervalMs' | 'enabled'>>): Promise<ScheduledTask | null> =>
      ipcRenderer.invoke('scheduler:update', id, data),
    toggle: (id: string, enabled: boolean): Promise<ScheduledTask | null> =>
      ipcRenderer.invoke('scheduler:toggle', id, enabled),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('scheduler:delete', id)
  },
  app: {
    reload: (): Promise<void> => ipcRenderer.invoke('app:reload')
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (data: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('settings:update', data),
    getChromePath: (): Promise<string> => ipcRenderer.invoke('settings:getChromePath'),
    browseChrome: (): Promise<string | null> => ipcRenderer.invoke('settings:browseChrome'),
    openDataDir: (): Promise<void> => ipcRenderer.invoke('settings:openDataDir'),
    getDataDir: (): Promise<string> => ipcRenderer.invoke('settings:getDataDir'),
    backup: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:backup'),
    restore: (data: Record<string, unknown>): Promise<void> => ipcRenderer.invoke('settings:restore', data)
  },
  user: {
    get: (): Promise<UserProfile> => ipcRenderer.invoke('user:get'),
    update: (data: Partial<UserProfile>): Promise<UserProfile> => ipcRenderer.invoke('user:update', data),
    getStats: (): Promise<UserStats> => ipcRenderer.invoke('user:getStats')
  },
  extensions: {
    getAll: (profileId: string): Promise<ExtensionInfo[]> => ipcRenderer.invoke('extensions:getAll', profileId),
    toggle: (profileId: string, extId: string, enabled: boolean): Promise<boolean> => 
      ipcRenderer.invoke('extensions:toggle', profileId, extId, enabled),
    copyTo: (fromProfileId: string, toProfileIds: string[], extIds: string[]): Promise<{ success: number; failed: number }> =>
      ipcRenderer.invoke('extensions:copyTo', fromProfileId, toProfileIds, extIds)
  },
  auth: {
    signUp: (email: string, password: string): Promise<{ user: any | null; error: string | null }> =>
      ipcRenderer.invoke('auth:signUp', email, password),
    signIn: (email: string, password: string): Promise<{ session: any | null; error: string | null }> =>
      ipcRenderer.invoke('auth:signIn', email, password),
    signOut: (): Promise<{ error: string | null }> =>
      ipcRenderer.invoke('auth:signOut'),
    getCurrentUser: (): Promise<any | null> =>
      ipcRenderer.invoke('auth:getCurrentUser'),
    getCurrentSession: (): Promise<any | null> =>
      ipcRenderer.invoke('auth:getCurrentSession'),
    isAuthenticated: (): Promise<boolean> =>
      ipcRenderer.invoke('auth:isAuthenticated')
  },
  workspaces: {
    getWorkspaces: (): Promise<WorkspaceWithStats[]> => ipcRenderer.invoke('workspaces:getWorkspaces'),
    getCurrent: (): Promise<WorkspaceWithStats | null> => ipcRenderer.invoke('workspaces:getCurrent'),
    switchWorkspace: (workspaceId: string | null): Promise<{ success: true; workspaceId: string | null }> =>
      ipcRenderer.invoke('workspaces:switchWorkspace', workspaceId),
    createWorkspace: (input: CreateWorkspaceInput): Promise<Workspace> => ipcRenderer.invoke('workspaces:createWorkspace', input),
    acceptInvitations: (): Promise<string | null> => ipcRenderer.invoke('workspaces:acceptInvitations'),
    getMembers: (workspaceId: string): Promise<WorkspaceMember[]> => ipcRenderer.invoke('workspaces:getMembers', workspaceId),
    getInvitations: (workspaceId: string): Promise<WorkspaceInvitation[]> => ipcRenderer.invoke('workspaces:getInvitations', workspaceId),
    inviteMember: (input: InviteMemberInput): Promise<WorkspaceInvitation> => ipcRenderer.invoke('workspaces:inviteMember', input),
    revokeInvitation: (invitationId: string): Promise<void> => ipcRenderer.invoke('workspaces:revokeInvitation', invitationId),
    resendInvitation: (invitationId: string): Promise<void> => ipcRenderer.invoke('workspaces:resendInvitation', invitationId),
    removeMember: (memberId: string): Promise<void> => ipcRenderer.invoke('workspaces:removeMember', memberId),
    updateMemberRole: (memberId: string, role: WorkspaceRole): Promise<void> => ipcRenderer.invoke('workspaces:updateMemberRole', memberId, role),
    updateMember: (memberId: string, input: UpdateWorkspaceMemberInput): Promise<void> => ipcRenderer.invoke('workspaces:updateMember', memberId, input),
    getPermissions: (workspaceId?: string): Promise<RolePermissionMap> => ipcRenderer.invoke('workspaces:getPermissions', workspaceId),
    getRolePermissions: (workspaceId?: string): Promise<Record<WorkspaceRole, RolePermissionMap>> => ipcRenderer.invoke('workspaces:getRolePermissions', workspaceId),
    updateRolePermissions: (workspaceId: string, role: WorkspaceRole, permissions: RolePermissionMap): Promise<RolePermissionMap> =>
      ipcRenderer.invoke('workspaces:updateRolePermissions', workspaceId, role, permissions),
    hasPermission: (permissionKey: PermissionKey, workspaceId?: string): Promise<boolean> => ipcRenderer.invoke('workspaces:hasPermission', permissionKey, workspaceId),
    getUserGroups: (workspaceId: string): Promise<WorkspaceUserGroup[]> => ipcRenderer.invoke('workspaces:getUserGroups', workspaceId),
    createUserGroup: (input: CreateWorkspaceUserGroupInput): Promise<WorkspaceUserGroup> => ipcRenderer.invoke('workspaces:createUserGroup', input),
    updateUserGroup: (id: string, name: string, description?: string): Promise<WorkspaceUserGroup> => ipcRenderer.invoke('workspaces:updateUserGroup', id, name, description),
    deleteUserGroup: (id: string): Promise<void> => ipcRenderer.invoke('workspaces:deleteUserGroup', id),
    ensureDefaultWorkspace: (): Promise<WorkspaceWithStats> => ipcRenderer.invoke('workspaces:ensureDefaultWorkspace'),
    deleteWorkspace: (workspaceId: string): Promise<{ success: true; switchedToWorkspaceId: string | null }> => ipcRenderer.invoke('workspaces:deleteWorkspace', workspaceId),
    updateWorkspace: (workspaceId: string, updates: { name?: string; description?: string }): Promise<void> => ipcRenderer.invoke('workspaces:updateWorkspace', workspaceId, updates),
    updateWorkspaceSettings: (workspaceId: string, settings: { permissionMode?: 'group' | 'profile'; automationMode?: 'flowchart' | 'javascript' }): Promise<void> => ipcRenderer.invoke('workspaces:updateWorkspaceSettings', workspaceId, settings)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ZenvyAPI = typeof api
