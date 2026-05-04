import { create } from 'zustand'
import type { Profile, Group } from '../../../shared/types'

interface AppState {
  profiles: Profile[]
  groups: Group[]
  runningIds: string[]
  selectedGroupId: string | null
  selectedIds: string[]
  searchQuery: string

  setProfiles: (profiles: Profile[]) => void
  setGroups: (groups: Group[]) => void
  setRunningIds: (ids: string[]) => void
  setSelectedGroupId: (id: string | null) => void
  toggleSelect: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setSearchQuery: (q: string) => void

  loadAll: () => Promise<void>
  syncRunning: () => Promise<void>
  updateProfileStatus: (profileId: string, isRunning: boolean) => void
  setupStatusListener: () => () => void
}

export const useStore = create<AppState>((set, get) => ({
  profiles: [],
  groups: [],
  runningIds: [],
  selectedGroupId: null,
  selectedIds: [],
  searchQuery: '',

  setProfiles: (profiles) => set({ profiles }),
  setGroups: (groups) => set({ groups }),
  setRunningIds: (runningIds) => set({ runningIds }),
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId, selectedIds: [] }),
  toggleSelect: (id) => {
    const { selectedIds } = get()
    set({
      selectedIds: selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    })
  },
  selectAll: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  loadAll: async () => {
    const [profiles, groups, runningIds] = await Promise.all([
      window.api.profiles.getAll(),
      window.api.groups.getAll(),
      window.api.browser.running()
    ])
    set({ profiles, groups, runningIds })
  },

  syncRunning: async () => {
    const runningIds = await window.api.browser.sync()
    set({ runningIds })
  },

  updateProfileStatus: (profileId, isRunning) => {
    const { runningIds } = get()
    if (isRunning && !runningIds.includes(profileId)) {
      set({ runningIds: [...runningIds, profileId] })
    } else if (!isRunning && runningIds.includes(profileId)) {
      set({ runningIds: runningIds.filter(id => id !== profileId) })
    }
  },

  setupStatusListener: () => {
    const unsubscribe = window.api.browser.onStatusChanged(({ profileId, isRunning }) => {
      get().updateProfileStatus(profileId, isRunning)
    })
    return unsubscribe
  }
}))
