import { contextBridge, ipcRenderer } from 'electron'
import type { Profile, Group, Tag } from '../shared/types'

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
    import: (jsonData: string): Promise<Profile[]> => ipcRenderer.invoke('profiles:import', jsonData)
  },
  tags: {
    getAll: (): Promise<Tag[]> => ipcRenderer.invoke('tags:getAll'),
    create: (name: string, color: string): Promise<Tag> => ipcRenderer.invoke('tags:create', name, color),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tags:delete', id)
  },
  browser: {
    launch: (profile: Profile): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('browser:launch', profile),
    close: (profileId: string): Promise<void> => ipcRenderer.invoke('browser:close', profileId),
    running: (): Promise<string[]> => ipcRenderer.invoke('browser:running')
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
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ZenvyAPI = typeof api
