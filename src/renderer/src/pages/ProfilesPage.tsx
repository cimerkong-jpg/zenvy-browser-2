import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useStore } from '../store/useStore'
import ProfileModal from '../components/ProfileModal'
import ProfileRow from '../components/ProfileRow'
import { CreateGroupModal, EditGroupModal, DeleteGroupModal } from '../components/GroupModals'
import type { Profile } from '../../../shared/types'

type StatusFilter = 'all' | 'open' | 'closed'

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

  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [moveTargetGroupId, setMoveTargetGroupId] = useState('')
  const [showMoveGroupModal, setShowMoveGroupModal] = useState(false)
  const [groupPanelCollapsed, setGroupPanelCollapsed] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  
  // Group modals state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<{ id: string; name: string } | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return profiles.filter((profile) => {
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
  }, [profiles, runningIds, searchQuery, selectedGroupId, statusFilter])

  const selectedGroup = selectedGroupId ? groups.find((group) => group.id === selectedGroupId) : null
  const allSelected = filtered.length > 0 && filtered.every((profile) => selectedIds.includes(profile.id))
  
  // Calculate stats based on filtered profiles (current group)
  const openCount = filtered.filter(p => runningIds.includes(p.id)).length
  const closedCount = filtered.filter(p => !runningIds.includes(p.id)).length
  const selectedCount = filtered.filter(p => selectedIds.includes(p.id)).length

  // Group handlers
  const handleCreateGroup = async (name: string) => {
    await window.api.groups.create(name)
    await loadAll()
  }

  const handleUpdateGroup = async (groupId: string, newName: string) => {
    await window.api.groups.update(groupId, { name: newName })
    await loadAll()
  }

  const handleDeleteGroup = async (groupId: string) => {
    await window.api.groups.delete(groupId)
    if (selectedGroupId === groupId) setSelectedGroupId(null)
    await loadAll()
  }

  const deleteSelected = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Xóa ${selectedIds.length} hồ sơ đã chọn?`)) return
    await window.api.profiles.deleteMany(selectedIds)
    clearSelection()
    await loadAll()
  }

  const exportSelected = async () => {
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

  const importProfiles = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const imported = await window.api.profiles.import(await file.text())
        await loadAll()
        alert(`Đã import ${imported.length} hồ sơ`)
      } catch (error) {
        alert('Lỗi import: ' + (error as Error).message)
      }
    }
    input.click()
  }

  return (
    <div className="flex h-full min-w-0">
      <GroupPanel
        groups={groups}
        profiles={profiles}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        collapsed={groupPanelCollapsed}
        setCollapsed={setGroupPanelCollapsed}
        onCreateGroup={() => setShowCreateGroupModal(true)}
        onEditGroup={(group) => setEditingGroup(group)}
        onDeleteGroup={(group) => setDeletingGroup(group)}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="drag-region h-8 flex-shrink-0" />

        <div className="no-drag flex items-center justify-between px-6 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Hồ sơ</h1>
            <p className="mt-1 text-xs text-slate-500">
              {selectedGroup?.name ?? 'Tất cả nhóm'} · {filtered.length} hồ sơ đang hiển thị
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setIsReloading(true)
                await loadAll()
                setTimeout(() => setIsReloading(false), 500)
              }}
              disabled={isReloading}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isReloading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Làm mới
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(168,85,247,0.22)] hover:bg-purple-400"
            >
              + Tạo hồ sơ
            </button>
          </div>
        </div>

        <div className="no-drag grid grid-cols-4 gap-3 px-6 pb-4">
          <CompactStat label="Tổng hồ sơ" value={filtered.length} />
          <CompactStat label="Đang mở" value={openCount} tone="purple" />
          <CompactStat label="Đã đóng" value={closedCount} tone="orange" />
          <CompactStat label="Đã chọn" value={selectedCount} tone="purple" />
        </div>

        <div className="no-drag px-6 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <FieldShell label="Tìm kiếm" className="min-w-[320px] flex-1">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tên, ghi chú, proxy..."
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#111827]/70 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-purple-400/60"
                />
              </div>
            </FieldShell>

            <FieldShell label="Trạng thái hồ sơ" className="w-56">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#111827]/70 px-3 text-sm text-white outline-none focus:border-purple-400/60"
              >
                <option value="all">Tất cả</option>
                <option value="open">Đang mở</option>
                <option value="closed">Đã đóng</option>
              </select>
            </FieldShell>

            <FieldShell label="Chế độ hiển thị" className="w-52">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#111827]/70 px-3 text-sm text-slate-300">
                <span className="text-purple-400">◉</span>
                Hồ sơ
              </div>
            </FieldShell>
          </div>
        </div>

        <div className="no-drag flex flex-wrap items-center justify-between gap-3 px-6 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <BulkButton disabled={!selectedIds.length}>Automation</BulkButton>
            <BulkButton disabled={!selectedIds.length}>Mở</BulkButton>
            <BulkButton disabled={!selectedIds.length}>Đóng</BulkButton>
            <BulkButton
              onClick={() => {
                setMoveTargetGroupId('')
                setShowMoveGroupModal(true)
              }}
              disabled={!selectedIds.length}
            >
              Chuyển nhóm
            </BulkButton>
            <BulkButton onClick={exportSelected} disabled={!selectedIds.length}>Xuất</BulkButton>
            <BulkButton onClick={deleteSelected} disabled={!selectedIds.length} danger>Xóa</BulkButton>
            {selectedIds.length > 0 && (
              <button
                onClick={clearSelection}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white/5 hover:text-white"
              >
                Bỏ chọn
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={importProfiles}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]"
            >
              Nhập tài nguyên
            </button>
            <button className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]">
              Sắp xếp
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-6 pb-5">
          <div className="h-full overflow-hidden rounded-xl border border-purple-500/15 bg-[#111827]/70 shadow-[0_0_40px_rgba(0,0,0,0.18)]">
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="sticky top-0 z-10 bg-[#111827]">
                  <tr className="border-b border-white/6">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => (allSelected ? clearSelection() : selectAll(filtered.map((profile) => profile.id)))}
                        className="h-4 w-4 accent-purple-500"
                      />
                    </th>
                    <HeaderCell>Profile ID</HeaderCell>
                    <HeaderCell>Nhóm</HeaderCell>
                    <HeaderCell>Tên</HeaderCell>
                    <HeaderCell>Ghi chú</HeaderCell>
                    <HeaderCell>Proxy</HeaderCell>
                    <HeaderCell>Thời hạn</HeaderCell>
                    <HeaderCell>Hành động</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-24 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 text-2xl text-purple-200">
                            ▣
                          </div>
                          <p className="text-sm font-medium text-white">Chưa có hồ sơ nào</p>
                          <p className="text-xs text-slate-500">Tạo hồ sơ đầu tiên để bắt đầu quản lý tài khoản.</p>
                          <button
                            onClick={() => setShowCreate(true)}
                            className="rounded-lg bg-purple-500 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-400"
                          >
                            Tạo hồ sơ đầu tiên
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
                        isRunning={runningIds.includes(profile.id)}
                        isSelected={selectedIds.includes(profile.id)}
                        onEdit={setEditProfile}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-3 text-xs text-slate-500">
            1-{filtered.length} trên {filtered.length}
          </div>
        </div>

        {showCreate && <ProfileModal profile={null} onClose={() => setShowCreate(false)} />}
        {editProfile && <ProfileModal profile={editProfile} onClose={() => setEditProfile(null)} />}
        
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

  // Calculate menu position when it opens
  useEffect(() => {
    if (isMenuOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect()
      setMenuPosition({
        top: rect.top,
        left: rect.left - 176 // 176px = w-44 (11rem = 176px)
      })
    }
  }, [isMenuOpen, buttonRef])

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all ${
          isSelected ? 'bg-purple-500/15 text-white' : 'text-slate-300 hover:bg-white/5'
        }`}
      >
        <span className="truncate pr-8">{group.name}</span>
      </button>
      
      <button
        ref={setButtonRef}
        onClick={onToggleMenu}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white"
        title="Tùy chọn"
      >
        ⋮
      </button>
      
      {isMenuOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={onCloseMenu}
          />
          <div 
            className="fixed z-50 w-44 rounded-lg border border-white/10 bg-[#1F2937] py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-purple-500/10 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Chỉnh sửa</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Xóa</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

function GroupPanel({
  groups,
  profiles,
  selectedGroupId,
  setSelectedGroupId,
  collapsed,
  setCollapsed,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup
}: {
  groups: Array<{ id: string; name: string }>
  profiles: Profile[]
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  onCreateGroup: () => void
  onEditGroup: (group: { id: string; name: string }) => void
  onDeleteGroup: (group: { id: string; name: string }) => void
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const noGroupCount = profiles.filter((profile) => !profile.groupId).length

  if (collapsed) {
    return (
      <aside className="group-panel no-drag flex w-12 flex-shrink-0 flex-col items-center border-r border-purple-500/10 bg-[#0F1020]/70 pb-4">
        <div className="drag-region h-8 w-full flex-shrink-0" />
        <button
          onClick={() => setCollapsed(false)}
          className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
          title="Mở nhóm hồ sơ"
        >
          ›
        </button>
        <div className="mt-4 writing-mode-vertical text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Nhóm
        </div>
      </aside>
    )
  }

  return (
    <aside className="group-panel no-drag flex w-64 flex-shrink-0 flex-col border-r border-purple-500/10 bg-[#0F1020]/70 px-4 pb-4">
      <div className="drag-region h-8 flex-shrink-0" />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Nhóm hồ sơ</h2>
          <p className="mt-1 text-xs text-slate-500">{groups.length + 2} nhóm</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateGroup}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
          >
            + Mới
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
            title="Thu gọn nhóm hồ sơ"
          >
            ‹
          </button>
        </div>
      </div>

      <div className="mb-3">
        <button
          onClick={() => setSelectedGroupId(null)}
          className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all ${
            selectedGroupId === null ? 'bg-purple-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Tất cả
        </button>
        <button 
          onClick={() => setSelectedGroupId('no-group')}
          className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all ${
            selectedGroupId === 'no-group' ? 'bg-purple-500/15 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          Không có nhóm
        </button>
      </div>

      <div className="space-y-1 overflow-y-auto">
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
    </aside>
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

        <select
          value={moveTargetGroupId}
          onChange={(event) => setMoveTargetGroupId(event.target.value)}
          className="mt-6 h-14 w-full rounded-lg border border-slate-600/70 bg-[#202B38] px-4 text-sm text-white outline-none transition-colors focus:border-purple-400"
        >
          <option value="">Chọn nhóm hồ sơ</option>
          <option value="none">Không có nhóm</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

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

function CompactStat({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'violet' | 'orange' | 'purple' }) {
  const toneClass = {
    slate: 'text-slate-200',
    violet: 'text-violet-300',
    orange: 'text-orange-300',
    purple: 'text-purple-300'
  }[tone]

  return (
    <div className="rounded-xl border border-purple-500/15 bg-purple-500/[0.08] px-4 py-3">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
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
      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? 'border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20'
          : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.09]'
      }`}
    >
      {children}
    </button>
  )
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  )
}
