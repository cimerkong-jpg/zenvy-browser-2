import { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useStore } from '../store/useStore'
import { useWorkspace } from '../store/useWorkspace'
import ProfileModal from '../components/ProfileModal'
import ProfileRow from '../components/ProfileRow'
import QuickEditProfileModal from '../components/QuickEditProfileModal'
import { CreateGroupModal, EditGroupModal, DeleteGroupModal } from '../components/GroupModals'
import Select from '../components/ui/Select'
import type { Profile, AutomationScript } from '../../../shared/types'

type StatusFilter = 'all' | 'open' | 'closed'
type SortBy = 'default' | 'name-asc' | 'name-desc' | 'created-newest' | 'created-oldest' | 'status'

const SORT_LABELS: Record<SortBy, string> = {
  default: 'Mặc định',
  'name-asc': 'Tên A→Z',
  'name-desc': 'Tên Z→A',
  'created-newest': 'Mới nhất',
  'created-oldest': 'Cũ nhất',
  status: 'Đang mở trước',
}

export default function ProfilesPage() {
  const {
    profiles,
    groups,
    runningIds,
    selectedGroupId,
    selectedIds,
    searchQuery,
    setSelectedGroupId,
    selectAll,
    clearSelection,
    setSearchQuery,
    loadAll
  } = useStore()
  const { hasPermission } = useWorkspace()

  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('default')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [sortMenuPos, setSortMenuPos] = useState({ x: 0, y: 0 })
  const [importData, setImportData] = useState<{ profiles: any[]; rawText: string } | null>(null)
  const sortRef = useRef<HTMLButtonElement>(null)
  const [moveTargetGroupId, setMoveTargetGroupId] = useState('')
  const [showMoveGroupModal, setShowMoveGroupModal] = useState(false)
  const [groupPanelCollapsed, setGroupPanelCollapsed] = useState(false)
  const [groupPanelWidth, setGroupPanelWidth] = useState(304)
  const [isReloading, setIsReloading] = useState(false)
  const [showAutoModal, setShowAutoModal] = useState(false)
  
  // Group modals state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<{ id: string; name: string } | null>(null)

  // Quick edit state
  const [quickEditProfile, setQuickEditProfile] = useState<{ profile: Profile; field: 'name' | 'notes' | 'group' } | null>(null)

  // Quick edit handler
  const handleQuickEdit = (profile: Profile, field: 'name' | 'notes' | 'group') => {
    if (!hasPermission('profile.edit')) return
    setQuickEditProfile({ profile, field })
  }

  // Quick edit save handler
  const handleQuickEditSave = async (profileId: string, updates: Partial<Profile>) => {
    await window.api.profiles.update(profileId, updates)
    await loadAll()
  }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    const base = profiles.filter((profile) => {
      const matchGroup =
        selectedGroupId === null ||
        (selectedGroupId === 'no-group' && !profile.groupId) ||
        profile.groupId === selectedGroupId
      const matchSearch =
        !q ||
        profile.name.toLowerCase().includes(q) ||
        profile.notes.toLowerCase().includes(q) ||
        profile.proxy.host.toLowerCase().includes(q)
      const isRunning = runningIds.includes(profile.id)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && isRunning) ||
        (statusFilter === 'closed' && !isRunning)

      return matchGroup && matchSearch && matchStatus
    })

    const sorted = [...base]
    switch (sortBy) {
      case 'default':
        // Default: Sort by newest first (createdAt descending)
        sorted.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'vi'))
        break
      case 'created-oldest':
        sorted.sort((a, b) => a.createdAt - b.createdAt)
        break
      case 'status':
        sorted.sort((a, b) => {
          const aR = runningIds.includes(a.id) ? 1 : 0
          const bR = runningIds.includes(b.id) ? 1 : 0
          return bR - aR
        })
        break
    }
    return sorted
  }, [profiles, runningIds, searchQuery, selectedGroupId, statusFilter, sortBy])

  const allSelected = filtered.length > 0 && filtered.every((profile) => selectedIds.includes(profile.id))
  
  // Calculate stats based on filtered profiles (current group)
  const openCount = filtered.filter(p => runningIds.includes(p.id)).length
  const closedCount = filtered.filter(p => !runningIds.includes(p.id)).length
  const selectedCount = filtered.filter(p => selectedIds.includes(p.id)).length

  // Group handlers
  const handleCreateGroup = async (name: string) => {
    if (!hasPermission('group.create')) return
    await window.api.groups.create(name)
    await loadAll()
  }

  const handleUpdateGroup = async (groupId: string, newName: string) => {
    if (!hasPermission('group.edit')) return
    await window.api.groups.update(groupId, { name: newName })
    await loadAll()
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!hasPermission('group.delete')) return
    await window.api.groups.delete(groupId)
    if (selectedGroupId === groupId) setSelectedGroupId(null)
    await loadAll()
  }

  const deleteSelected = async () => {
    if (!hasPermission('profile.delete')) return
    if (!selectedIds.length) return
    if (!confirm(`Xóa ${selectedIds.length} hồ sơ đã chọn?`)) return
    await window.api.profiles.deleteMany(selectedIds)
    clearSelection()
    await loadAll()
  }

  const exportSelected = async () => {
    if (!hasPermission('profile.export')) return
    if (!selectedIds.length) return
    const json = await window.api.profiles.export(selectedIds)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profiles-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const moveSelectedToGroup = async () => {
    if (!hasPermission('profile.edit')) return
    if (!selectedIds.length || !moveTargetGroupId) return

    const groupId = moveTargetGroupId === 'none' ? null : moveTargetGroupId
    await Promise.all(
      selectedIds.map((id) => window.api.profiles.update(id, { groupId }))
    )
    setMoveTargetGroupId('')
    setShowMoveGroupModal(false)
    clearSelection()
    await loadAll()
  }

  const importProfiles = () => {
    if (!hasPermission('profile.import')) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const rawText = await file.text()
        const parsed = JSON.parse(rawText)
        if (!parsed.profiles || !Array.isArray(parsed.profiles)) {
          alert('File không hợp lệ')
          return
        }
        setImportData({ profiles: parsed.profiles, rawText })
      } catch (error) {
        alert('Lỗi đọc file: ' + (error as Error).message)
      }
    }
    input.click()
  }

  const handleConfirmImport = async (selectedProfiles: any[]) => {
    try {
      const payload = JSON.stringify({ version: '1.0.0', exportDate: Date.now(), profiles: selectedProfiles })
      const imported = await window.api.profiles.import(payload)
      setImportData(null)
      await loadAll()
      alert(`Đã import ${imported.length} hồ sơ`)
    } catch (error) {
      alert('Lỗi import: ' + (error as Error).message)
    }
  }

  return (
    <div className="flex h-full min-w-0">
      <GroupPanel
        profiles={profiles}
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        collapsed={groupPanelCollapsed}
        setCollapsed={setGroupPanelCollapsed}
        width={groupPanelWidth}
        onWidthChange={setGroupPanelWidth}
        onCreateGroup={() => setShowCreateGroupModal(true)}
        onEditGroup={(group) => setEditingGroup(group)}
        onDeleteGroup={(group) => setDeletingGroup(group)}
      />

        <section className="flex min-w-0 flex-1 flex-col">
          {/* ── Header + Actions ── */}
          <div className="no-drag border-b border-[#1F2230] px-6 py-4">
          {/* Search + Filters + Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[320px] flex-1">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search profiles..."
                className="h-9 w-full rounded-lg border border-[#1F2230] bg-[#111218] pl-10 pr-3 text-sm text-[#E5E7EB] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[#7C3AED]/50"
              />
            </div>

            {/* Status Filter */}
            <div className="w-[130px] flex-shrink-0">
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'open', label: 'Open' },
                  { value: 'closed', label: 'Closed' }
                ]}
                className="h-9"
              />
            </div>

            {/* Sort */}
            <button
              ref={sortRef}
              onClick={() => {
                if (sortRef.current) {
                  const rect = sortRef.current.getBoundingClientRect()
                  const windowWidth = window.innerWidth
                  // Align to right if near screen edge
                  const alignRight = rect.right > windowWidth - 200
                  setSortMenuPos({ 
                    x: alignRight ? rect.right - 200 : rect.left, 
                    y: rect.bottom + 4 
                  })
                }
                setShowSortMenu(v => !v)
              }}
              className={`h-9 flex items-center gap-1.5 flex-shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors ${
                sortBy !== 'default'
                  ? 'border-[#7C3AED]/50 bg-[#7C3AED]/10 text-[#7C3AED]'
                  : 'border-[#1F2230] bg-[#111218] text-[#9CA3AF] hover:text-[#E5E7EB]'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>{sortBy !== 'default' ? SORT_LABELS[sortBy] : 'Sort'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={async () => {
                setIsReloading(true)
                await loadAll()
                setTimeout(() => setIsReloading(false), 500)
              }}
              disabled={isReloading}
              className="h-9 w-9 flex items-center justify-center flex-shrink-0 rounded-lg border border-[#1F2230] bg-[#111218] text-[#9CA3AF] hover:text-[#E5E7EB] disabled:opacity-50 transition-colors"
              title="Refresh"
            >
              {isReloading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowCreate(true)}
              disabled={!hasPermission('profile.create')}
              className="h-9 flex-shrink-0 rounded-lg bg-[#7C3AED] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-50"
              title={!hasPermission('profile.create') ? 'Bạn không có quyền tạo profile' : undefined}
            >
              + New Profile
            </button>
          </div>

          {/* Bulk Actions - Premium Selection Toolbar */}
          {selectedIds.length > 0 && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#1F2230] bg-[#111218] px-4 py-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Selected Count Badge */}
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[#7C3AED]/10 px-3 py-1 border border-[#7C3AED]/20">
                  <span className="text-xs font-semibold text-[#7C3AED]">
                    {selectedIds.length} đã chọn
                  </span>
                </div>
                <div className="h-5 w-px bg-[#1F2230]" />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Open */}
                <button
                  onClick={async () => {
                    if (!hasPermission('profile.open')) return
                    const toOpen = selectedIds.filter(id => !runningIds.includes(id))
                    const profile = profiles.find(p => toOpen.includes(p.id))
                    if (profile) await window.api.browser.launch(profile)
                    useStore.getState().setRunningIds(await window.api.browser.running())
                  }}
                  disabled={!hasPermission('profile.open')}
                  className="flex items-center gap-1.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 px-3 py-1.5 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Open
                </button>

                {/* Close */}
                <button
                  onClick={async () => {
                    const toClose = selectedIds.filter(id => runningIds.includes(id))
                    await Promise.all(toClose.map(id => window.api.browser.close(id)))
                    useStore.getState().setRunningIds(await window.api.browser.running())
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-[#1F2230] bg-[#0B0B0F] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] hover:bg-[#1F2230] hover:text-[#E5E7EB] transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Close
                </button>

                {/* Move */}
                <button
                  onClick={() => { setMoveTargetGroupId(''); setShowMoveGroupModal(true) }}
                  disabled={!hasPermission('profile.edit')}
                  className="flex items-center gap-1.5 rounded-lg border border-[#1F2230] bg-[#0B0B0F] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] hover:bg-[#1F2230] hover:text-[#E5E7EB] transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Move
                </button>

                {/* Export */}
                <button
                  onClick={exportSelected}
                  disabled={!hasPermission('profile.export')}
                  className="flex items-center gap-1.5 rounded-lg border border-[#1F2230] bg-[#0B0B0F] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] hover:bg-[#1F2230] hover:text-[#E5E7EB] transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>

                {/* Delete */}
                <button
                  onClick={deleteSelected}
                  disabled={!hasPermission('profile.delete')}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Clear Button */}
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[#1F2230] transition-all"
                title="Clear selection"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ── Stats — Compact ── */}
        <div className="no-drag grid grid-cols-4 gap-2.5 px-6 py-3">
          <CompactStat label="Total" value={filtered.length} />
          <CompactStat label="Open" value={openCount} tone="green" />
          <CompactStat label="Closed" value={closedCount} tone="orange" />
          <CompactStat label="Selected" value={selectedCount} tone="blue" />
        </div>

        <div className="min-h-0 flex-1 px-4 pb-4">
          <div className="h-full overflow-hidden rounded-xl border border-purple-500/10 bg-surface/50 backdrop-blur-md">
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="sticky top-0 z-20 bg-[#0B0B0F] border-b border-[#1F2230]">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => (allSelected ? clearSelection() : selectAll(filtered.map((profile) => profile.id)))}
                        className="h-4 w-4 rounded border-[#1F2230] bg-[#111218] text-purple-500 focus:ring-purple-500/20"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">ID</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Name</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Group</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Notes</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Status</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Proxy</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 text-xl text-purple-300">
                            <EmptyProfilesIcon className="h-6 w-6" />
                          </div>
                          <button
                            onClick={() => setShowCreate(true)}
                            className="mt-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all"
                          >
                            Create Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((profile) => (
                      <ProfileRow
                        key={profile.id}
                        profile={profile}
                        groups={groups}
                        allProfiles={profiles}
                        isRunning={runningIds.includes(profile.id)}
                        isSelected={selectedIds.includes(profile.id)}
                        onEdit={setEditProfile}
                        onQuickEdit={handleQuickEdit}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-2 text-xs text-slate-500">
            {filtered.length} total
          </div>
        </div>

        {showCreate && <ProfileModal profile={null} onClose={() => setShowCreate(false)} />}
        {editProfile && <ProfileModal profile={editProfile} onClose={() => setEditProfile(null)} />}
        
        {/* Quick Edit Modal */}
        {quickEditProfile && (
          <QuickEditProfileModal
            profile={quickEditProfile.profile}
            field={quickEditProfile.field}
            groups={groups}
            onClose={() => setQuickEditProfile(null)}
            onSave={handleQuickEditSave}
          />
        )}
        
        {/* Group Modals */}
        {showCreateGroupModal && (
          <CreateGroupModal
            onClose={() => setShowCreateGroupModal(false)}
            onCreate={handleCreateGroup}
          />
        )}
        {editingGroup && (
          <EditGroupModal
            groupId={editingGroup.id}
            currentName={editingGroup.name}
            onClose={() => setEditingGroup(null)}
            onUpdate={handleUpdateGroup}
          />
        )}
        {deletingGroup && (
          <DeleteGroupModal
            groupName={deletingGroup.name}
            onClose={() => setDeletingGroup(null)}
            onDelete={() => handleDeleteGroup(deletingGroup.id)}
          />
        )}
        
        {showAutoModal && (
          <AutomationQuickModal
            selectedProfiles={profiles.filter(p => selectedIds.includes(p.id))}
            onClose={() => setShowAutoModal(false)}
          />
        )}

        {showMoveGroupModal && (
          <MoveGroupModal
            selectedIds={selectedIds}
            groups={groups}
            moveTargetGroupId={moveTargetGroupId}
            setMoveTargetGroupId={setMoveTargetGroupId}
            onConfirm={moveSelectedToGroup}
            onClose={() => {
              setShowMoveGroupModal(false)
              setMoveTargetGroupId('')
            }}
          />
        )}

        {showSortMenu && (
          <SortMenu
            pos={sortMenuPos}
            current={sortBy}
            onSelect={setSortBy}
            onClose={() => setShowSortMenu(false)}
          />
        )}

        {importData && (
          <ImportPreviewModal
            importProfiles={importData.profiles}
            existingProfiles={profiles}
            onConfirm={handleConfirmImport}
            onClose={() => setImportData(null)}
          />
        )}
      </section>
    </div>
  )
}

function GroupItem({
  group,
  isSelected,
  isMenuOpen,
  onSelect,
  onToggleMenu,
  onEdit,
  onDelete,
  onCloseMenu
}: {
  group: { id: string; name: string }
  isSelected: boolean
  isMenuOpen: boolean
  onSelect: () => void
  onToggleMenu: (e: React.MouseEvent) => void
  onEdit: () => void
  onDelete: () => void
  onCloseMenu: () => void
}) {
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (isMenuOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect()
      setMenuPosition({
        top: rect.top,
        left: Math.max(8, rect.left - 176)
      })
    }
  }, [isMenuOpen, buttonRef])

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all ${
          isSelected ? 'bg-[#243752] text-white' : 'text-[#D7DEE8] hover:bg-white/5 hover:text-white'
        }`}
      >
        <FolderIcon className={isSelected ? 'h-4 w-4 shrink-0 text-[#60A5FA]' : 'h-4 w-4 shrink-0 text-[#8EA0B5]'} />
        <span className="min-w-0 flex-1 truncate">{group.name}</span>
      </button>

      <button
        ref={setButtonRef}
        onClick={onToggleMenu}
        className="absolute right-2 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[#8EA0B5] hover:bg-white/10 hover:text-white"
        title={'T\u00f9y ch\u1ecdn'}
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>

      {isMenuOpen && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
          <div
            className="fixed z-50 w-44 rounded-lg border border-dashed border-[#344153] bg-[#1B2431] py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#D7DEE8] transition-colors hover:bg-[#243752] hover:text-white"
            >
              <EditIcon className="h-4 w-4" />
              <span>{'Ch\u1ec9nh s\u1eeda'}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <TrashIcon className="h-4 w-4" />
              <span>{'X\u00f3a'}</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
function GroupPanel({
  profiles,
  groups,
  selectedGroupId,
  setSelectedGroupId,
  collapsed,
  setCollapsed,
  width,
  onWidthChange,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup
}: {
  profiles: Profile[]
  groups: Array<{ id: string; name: string }>
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  width: number
  onWidthChange: (w: number) => void
  onCreateGroup: () => void
  onEditGroup: (group: { id: string; name: string }) => void
  onDeleteGroup: (group: { id: string; name: string }) => void
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(280, Math.min(400, startW + ev.clientX - startX))
      onWidthChange(next)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  if (collapsed) {
    return (
      <aside className="group-panel no-drag flex w-14 flex-shrink-0 flex-col items-center bg-transparent px-2 py-5">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-[#344153] bg-[#171F2A] text-[#8EA0B5] hover:bg-[#202B38] hover:text-white"
          title={'M\u1edf nh\u00f3m h\u1ed3 s\u01a1'}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <div className="mt-4 writing-mode-vertical text-[11px] font-bold uppercase tracking-[0.18em] text-[#7C8796]">
          {'Nh\u00f3m'}
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="group-panel no-drag relative flex flex-shrink-0 bg-transparent px-4 py-5"
      style={{ width }}
    >
      <div
        onMouseDown={startResize}
        className="absolute bottom-5 right-4 top-5 z-20 w-2 cursor-col-resize rounded-r-xl transition-colors hover:bg-[#2F80ED]/12 group/resizer"
        title={'Kéo để thay đổi chiều rộng nhóm'}
      >
        <div className="absolute right-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-[#2F80ED]/0 transition-colors group-hover/resizer:bg-[#2F80ED]/70" />
      </div>

      <div className="mkt-panel absolute inset-x-4 bottom-5 top-5 z-0" />
      <div className="relative z-10 flex min-h-0 w-full flex-col px-3 py-3">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="whitespace-nowrap text-[17px] font-extrabold leading-tight text-white">{'Nh\u00f3m h\u1ed3 s\u01a1'}</h2>
            <p className="mt-1 text-xs font-medium text-[#8EA0B5]">{groups.length} {'nh\u00f3m'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateGroup}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-[#111827] hover:bg-[#E5E7EB]"
            >
              <PlusCircleIcon className="h-4 w-4" />
              {'M\u1edbi'}
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[#344153] bg-[#171F2A] text-[#8EA0B5] hover:bg-[#202B38] hover:text-white"
              title={'Thu g\u1ecdn nh\u00f3m h\u1ed3 s\u01a1'}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-3 space-y-1">
          <GroupFilterItem
            label={'T\u1ea5t c\u1ea3'}
            active={selectedGroupId === null}
            onClick={() => setSelectedGroupId(null)}
          />
          <GroupFilterItem
            label={'Kh\u00f4ng c\u00f3 nh\u00f3m'}
            active={selectedGroupId === 'no-group'}
            onClick={() => setSelectedGroupId('no-group')}
          />
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {groups.map((group) => {
            const isMenuOpen = openMenuId === group.id
            return (
              <GroupItem
                key={group.id}
                group={group}
                isSelected={selectedGroupId === group.id}
                isMenuOpen={isMenuOpen}
                onSelect={() => setSelectedGroupId(group.id)}
                onToggleMenu={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(isMenuOpen ? null : group.id)
                }}
                onEdit={() => {
                  setOpenMenuId(null)
                  onEditGroup({ id: group.id, name: group.name })
                }}
                onDelete={() => {
                  setOpenMenuId(null)
                  onDeleteGroup({ id: group.id, name: group.name })
                }}
                onCloseMenu={() => setOpenMenuId(null)}
              />
            )
          })}
        </div>
      </div>
    </aside>
  )
}
function GroupFilterItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all ${
        active ? 'bg-[#243752] text-white' : 'text-[#D7DEE8] hover:bg-white/5 hover:text-white'
      }`}
    >
      <FolderIcon className={active ? 'h-4 w-4 shrink-0 text-[#60A5FA]' : 'h-4 w-4 shrink-0 text-[#8EA0B5]'} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

function PlusCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
    </svg>
  )
}

function ChevronLeftIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function ChevronRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6l6 6-6 6" />
    </svg>
  )
}

function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h6l1.5 2h9v8.5a2 2 0 01-2 2H5.75a2 2 0 01-2-2V6.75z" />
    </svg>
  )
}

function MoreVerticalIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 6.75h.01M12 12h.01M12 17.25h.01" />
    </svg>
  )
}

function EditIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.86 4.49l2.65 2.65a1.67 1.67 0 010 2.36L10.1 18.91 5 20l1.09-5.1 9.41-9.41a1.67 1.67 0 012.36 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.5 6.85l2.65 2.65" />
    </svg>
  )
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7V5.75A1.75 1.75 0 0110.75 4h2.5A1.75 1.75 0 0115 5.75V7m-8 0h10m-9 0l.8 11.2A2 2 0 0010.8 20h2.4a2 2 0 002-1.8L16 7" />
    </svg>
  )
}

function EmptyProfilesIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 6.75A1.75 1.75 0 016.75 5h10.5A1.75 1.75 0 0119 6.75v10.5A1.75 1.75 0 0117.25 19H6.75A1.75 1.75 0 015 17.25V6.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 9.5h8M8 13h5" />
    </svg>
  )
}

function MoveGroupModal({
  selectedIds,
  groups,
  moveTargetGroupId,
  setMoveTargetGroupId,
  onConfirm,
  onClose
}: {
  selectedIds: string[]
  groups: Array<{ id: string; name: string }>
  moveTargetGroupId: string
  setMoveTargetGroupId: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A12]/78 backdrop-blur-[2px]">
      <div className="w-[600px] max-w-[calc(100vw-48px)] rounded-2xl border border-white/10 bg-[#1B2431] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <h3 className="text-lg font-bold text-white">Chuyển nhóm hồ sơ</h3>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-200">Các hồ sơ có ID sẽ bị chuyển đi:</p>
          <div className="mt-3 flex max-h-28 flex-wrap gap-3 overflow-auto pr-1">
            {selectedIds.map((id) => (
              <span
                key={id}
                className="rounded-md bg-purple-500/16 px-4 py-2 font-mono text-sm font-bold text-purple-300"
              >
                {id.slice(0, 6).toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Select
            value={moveTargetGroupId}
            onChange={setMoveTargetGroupId}
            options={[
              { value: '', label: 'Chọn nhóm hồ sơ' },
              { value: 'none', label: 'Không có nhóm' },
              ...groups.map(group => ({ value: group.id, label: group.name }))
            ]}
            placeholder="Chọn nhóm hồ sơ"
            className="h-12 w-full"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-200"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={!moveTargetGroupId}
            className="rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Chuyển
          </button>
        </div>
      </div>
    </div>
  )
}

function CompactStat({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'green' | 'orange' | 'blue' }) {
  const toneClass = {
    slate: {
      value: 'text-[#E5EDF7]',
      label: 'text-[#8EA0B5]',
      accent: 'bg-[#64748B]',
      glow: 'shadow-[0_0_18px_rgba(100,116,139,0.16)]',
    },
    green: {
      value: 'text-[#6EE7B7]',
      label: 'text-[#8EA0B5]',
      accent: 'bg-[#10B981]',
      glow: 'shadow-[0_0_18px_rgba(16,185,129,0.18)]',
    },
    orange: {
      value: 'text-[#FDBA74]',
      label: 'text-[#8EA0B5]',
      accent: 'bg-[#F59E0B]',
      glow: 'shadow-[0_0_18px_rgba(245,158,11,0.18)]',
    },
    blue: {
      value: 'text-[#93C5FD]',
      label: 'text-[#8EA0B5]',
      accent: 'bg-[#3B82F6]',
      glow: 'shadow-[0_0_18px_rgba(59,130,246,0.18)]',
    },
  }[tone]

  return (
    <div className="group flex h-[58px] items-center gap-3 rounded-lg border border-[#243044] bg-[#151E2A] px-3.5 transition-colors hover:border-[#334155] hover:bg-[#182332]">
      <span className={`h-8 w-1 rounded-full ${toneClass.accent} ${toneClass.glow}`} />
      <div className="min-w-0">
        <p className={`text-[22px] font-bold leading-6 ${toneClass.value}`}>{value}</p>
        <p className={`mt-0.5 text-[11px] font-semibold uppercase ${toneClass.label}`}>{label}</p>
      </div>
    </div>
  )
}

function FieldShell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function BulkButton({
  children,
  disabled,
  danger = false,
  onClick
}: {
  children: ReactNode
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
      {children}
    </th>
  )
}

// ── Automation Quick Modal ────────────────────────────────────────────────────

type AutoTab = 'options' | 'config' | 'input' | 'info'

function AutomationQuickModal({ selectedProfiles, onClose }: {
  selectedProfiles: Profile[]
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<AutoTab>('options')
  const [scripts, setScripts] = useState<AutomationScript[]>([])
  const [scriptGroup, setScriptGroup] = useState('all')
  const [scriptId, setScriptId] = useState('')
  const [taskType, setTaskType] = useState<'now' | 'schedule'>('now')
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    window.api.scripts.getAll().then(setScripts)
  }, [])

  const filtered = scriptGroup === 'all' ? scripts : scripts.filter(s => s.name.toLowerCase().includes(scriptGroup.toLowerCase()))
  const selectedScript = scripts.find(s => s.id === scriptId)

  const handleCreate = async () => {
    if (!scriptId) return
    if (taskType === 'now') {
      setIsRunning(true)
      for (const profile of selectedProfiles) {
        await window.api.scripts.run(scriptId, profile)
      }
      setIsRunning(false)
      onClose()
    } else {
      await window.api.scheduler.create({
        scriptId,
        scriptName: selectedScript?.name ?? '',
        profileIds: selectedProfiles.map(p => p.id),
        type: 'interval',
        intervalMs: 60 * 60 * 1000,
      })
      onClose()
    }
  }

  const TABS: { key: AutoTab; label: string }[] = [
    { key: 'options', label: 'Tùy chọn' },
    { key: 'config', label: 'Cấu hình chạy' },
    { key: 'input', label: 'Đầu vào' },
    { key: 'info', label: 'Thông tin' },
  ]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[680px] max-w-[calc(100vw-48px)] rounded-2xl border border-white/10 bg-[#1B2333] shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <h3 className="text-base font-semibold text-white">Automation</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.07] px-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.key === 'options' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-5 min-h-[260px]">
          {activeTab === 'options' && (
            <>
              {/* Hồ sơ */}
              <div className="flex items-start gap-4">
                <div className="w-28 shrink-0 pt-1">
                  <span className="text-sm text-slate-400">Hồ sơ</span>
                  <span className="ml-2 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300">{selectedProfiles.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProfiles.map(p => (
                    <span key={p.id} className="rounded-md bg-purple-500/20 px-3 py-1 font-mono text-xs font-semibold text-purple-200">
                      {p.id.slice(0, 6).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quy trình */}
              <div className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-sm text-slate-400">Quy trình</span>
                <div className="flex flex-1 gap-2">
                  <Select
                    value={scriptGroup}
                    onChange={setScriptGroup}
                    options={[
                      { value: 'all', label: 'All' }
                    ]}
                    className="w-28"
                  />
                  <Select
                    value={scriptId}
                    onChange={setScriptId}
                    options={[
                      { value: '', label: 'Vui lòng chọn quy trình' },
                      ...filtered.map(s => ({ value: s.id, label: s.name }))
                    ]}
                    placeholder="Vui lòng chọn quy trình"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Loại nhiệm vụ */}
              <div className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-sm text-slate-400">Loại nhiệm vụ</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTaskType('now')}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                      taskType === 'now'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white'
                        : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
                    }`}
                  >Thực hiện ngay</button>
                  <button
                    onClick={() => setTaskType('schedule')}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                      taskType === 'schedule'
                        ? 'border-purple-500/50 bg-purple-500/10 text-white'
                        : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
                    }`}
                  >Lên lịch thực hiện</button>
                </div>
              </div>

              {scripts.length === 0 && (
                <p className="text-xs text-slate-600 pl-32">Chưa có quy trình nào. Tạo script trong trang Automation trước.</p>
              )}
            </>
          )}

          {activeTab !== 'options' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <span className="text-3xl">🔧</span>
              <p className="text-sm text-slate-600">Chức năng đang được phát triển</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/[0.07] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-5 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] transition-colors"
          >Đóng</button>
          <button
            onClick={handleCreate}
            disabled={!scriptId || isRunning}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? 'Đang chạy...' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Sort Menu ─────────────────────────────────────────────────────────────────

function SortMenu({
  pos,
  current,
  onSelect,
  onClose,
}: {
  pos: { x: number; y: number }
  current: SortBy
  onSelect: (sort: SortBy) => void
  onClose: () => void
}) {
  const items: { value: SortBy; label: string }[] = [
    { value: 'default', label: 'Mặc định (Mới nhất)' },
    { value: 'name-asc', label: 'Tên A → Z' },
    { value: 'name-desc', label: 'Tên Z → A' },
    { value: 'created-oldest', label: 'Ngày tạo: Cũ nhất' },
    { value: 'status', label: 'Đang mở lên đầu' },
  ]

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-52 rounded-xl border border-white/10 bg-[#1F2937] py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        style={{ top: pos.y, left: pos.x }}
      >
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => { onSelect(item.value); onClose() }}
            className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
              current === item.value
                ? 'bg-purple-500/10 text-purple-200'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.label}
            {current === item.value && <span className="text-purple-400 text-xs">✓</span>}
          </button>
        ))}
      </div>
    </>,
    document.body
  )
}

// ── Import Preview Modal ──────────────────────────────────────────────────────

function ImportPreviewModal({
  importProfiles,
  existingProfiles,
  onConfirm,
  onClose,
}: {
  importProfiles: any[]
  existingProfiles: Profile[]
  onConfirm: (selected: any[]) => Promise<void>
  onClose: () => void
}) {
  const existingNames = useMemo(
    () => new Set(existingProfiles.map((p) => p.name.toLowerCase())),
    [existingProfiles]
  )
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(importProfiles.map((_, i) => i))
  )
  const [isImporting, setIsImporting] = useState(false)

  const toggleRow = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const allSelected = selected.size === importProfiles.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(importProfiles.map((_, i) => i)))

  const conflictCount = importProfiles.filter((p) =>
    existingNames.has(p.name?.toLowerCase?.())
  ).length

  const handleConfirm = async () => {
    setIsImporting(true)
    await onConfirm(importProfiles.filter((_, i) => selected.has(i)))
    setIsImporting(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-[700px] max-w-[calc(100vw-48px)] flex-col rounded-2xl border border-white/10 bg-[#1B2333] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">Xem trước nhập hồ sơ</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {importProfiles.length} hồ sơ trong file · {selected.size} được chọn nhập
              {conflictCount > 0 && (
                <span className="ml-2 text-orange-400">{conflictCount} tên trùng</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-lg leading-none text-slate-500 hover:text-white">
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 border-b border-white/[0.07] bg-[#1B2333]">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-purple-500"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tên hồ sơ
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Proxy
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {importProfiles.map((profile, i) => {
                const isConflict = existingNames.has(profile.name?.toLowerCase?.())
                const isSelected = selected.has(i)
                return (
                  <tr
                    key={i}
                    onClick={() => toggleRow(i)}
                    className={`cursor-pointer border-b border-white/[0.04] transition-colors ${
                      isSelected
                        ? 'bg-purple-500/[0.05] hover:bg-purple-500/[0.08]'
                        : 'opacity-40 hover:opacity-60'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(i)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-purple-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{profile.name || '—'}</span>
                        {isConflict && (
                          <span className="rounded bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                            Tên trùng
                          </span>
                        )}
                      </div>
                      {profile.notes && (
                        <span className="line-clamp-1 text-xs text-slate-600">{profile.notes}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {profile.proxy?.type !== 'none' && profile.proxy?.host ? (
                        <span className="font-mono text-xs text-slate-300">
                          {profile.proxy.host}:{profile.proxy.port}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">Không</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isConflict ? (
                        <span className="text-xs text-orange-400">Nhập thêm</span>
                      ) : (
                        <span className="text-xs text-emerald-400">Mới</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.07] px-6 py-4">
          <p className="text-xs text-slate-500">Hồ sơ trùng tên sẽ được nhập thêm (không ghi đè)</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] px-5 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0 || isImporting}
              className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
            >
              {isImporting ? 'Đang nhập...' : `Nhập ${selected.size} hồ sơ`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
