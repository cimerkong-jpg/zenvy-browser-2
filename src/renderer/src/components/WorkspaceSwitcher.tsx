import { useMemo, useRef, useState } from 'react'
import { useWorkspace } from '../store/useWorkspace'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import type { WorkspaceWithStats } from '../../../shared/workspace-types'

export default function WorkspaceSwitcher() {
  const {
    currentWorkspace,
    workspaces,
    loading,
    switching,
    setCurrentWorkspace,
    createWorkspace,
    refreshWorkspaceData,
    loadWorkspaces,
  } = useWorkspace()
  const { loadAll, clearSelection, setSelectedGroupId, setProfiles, setGroups } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? workspaces.filter((workspace) => workspace.name.toLowerCase().includes(q)) : workspaces
  }, [query, workspaces])

  const defaultWorkspaceId = useMemo(() => {
    const explicitDefault = workspaces.find((workspace) => workspace.isDefault === true)
    if (explicitDefault) return explicitDefault.id
    if (currentWorkspace?.isDefault === true) return currentWorkspace.id
    return workspaces[0]?.id ?? null
  }, [currentWorkspace, workspaces])

  const isDefaultWorkspace = (workspace: WorkspaceWithStats) =>
    workspace.id === defaultWorkspaceId

  const formatWorkspaceStats = (workspace: WorkspaceWithStats) =>
    `${workspace.profileCount ?? 0} profile · ${workspace.memberCount ?? 0} thành viên`

  const switchTo = async (workspace: WorkspaceWithStats) => {
    if (workspace.id === currentWorkspace?.id) {
      setOpen(false)
      return
    }

    setBusyId(workspace.id)
    clearSelection()
    setSelectedGroupId(null)
    setProfiles([])
    setGroups([])
    try {
      await setCurrentWorkspace(workspace.id)
      await refreshWorkspaceData()
      await loadAll()
      setOpen(false)
      toast.success(`Đã chuyển sang ${workspace.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chuyển workspace')
    } finally {
      setBusyId(null)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadWorkspaces()
      toast.success('Đã làm mới workspace')
    } catch {
      toast.error('Không thể làm mới workspace')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading && !currentWorkspace) {
    return <div className="h-[34px] w-[200px] animate-pulse rounded-md bg-white/5" />
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-[36px] w-[200px] items-center justify-center rounded-lg border border-[#A8B1BD] bg-[#121922] px-8 text-left shadow-sm transition-colors hover:border-white hover:bg-[#18212C]"
      >
        <span className="absolute -top-[7px] left-2 min-w-max whitespace-nowrap bg-[#121922] px-1.5 text-[11px] font-bold leading-none text-white">
          Không gian làm việc
        </span>
        {currentWorkspace && isDefaultWorkspace(currentWorkspace) && (
          <KeyIcon className="absolute left-3 h-4 w-4 text-[#F6B600]" />
        )}
        <span className="max-w-[132px] truncate text-center text-[14px] font-bold leading-none text-white">
          {currentWorkspace?.name ?? 'My Workspace'}
        </span>
        {(switching || busyId) ? (
          <div className="absolute right-3 h-3 w-3 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
        ) : (
          <svg className={`absolute right-3 h-3 w-3 text-[#D7DEE8] transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="mkt-panel absolute left-0 top-[42px] z-50 w-[360px] rounded-t-none p-4 shadow-2xl shadow-black/40">
            <div className="mb-5 flex gap-3 pr-[105px]">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7C8796]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workspace"
                  className="mkt-input h-9 w-full pl-9 pr-3 text-sm placeholder:text-[#7C8796]"
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-[#8EA0B5] hover:bg-white/5 hover:text-white disabled:opacity-50"
                title="Refresh workspace"
              >
                <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => {
                setShowCreate(true)
                setOpen(false)
              }}
              className="absolute right-4 top-4 flex h-9 items-center justify-center rounded-md bg-white px-3 text-xs font-bold text-[#111827] hover:bg-[#E5E7EB]"
            >
              Create new
            </button>
            <div className="space-y-2">
              {filtered.map((workspace) => {
                const isCurrent = workspace.id === currentWorkspace?.id
                const isDefault = isDefaultWorkspace(workspace)

                return (
                  <button
                    key={workspace.id}
                    onClick={() => switchTo(workspace)}
                    className="flex min-h-[52px] w-full items-center gap-3 rounded-md px-2 py-2 text-left text-white transition-colors hover:bg-white/5"
                  >
                    <span className="flex w-5 justify-center">
                      {isDefault ? (
                        <KeyIcon className="h-4 w-4 text-[#F6B600]" />
                      ) : (
                        <WorkspaceIcon className="h-4 w-4 text-[#A8B1BD]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{workspace.name}</span>
                      <span className="mt-1 block truncate text-xs font-medium text-[#8EA0B5]">
                        {formatWorkspaceStats(workspace)}
                      </span>
                    </span>
                    {isCurrent && (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#10B981] text-[#10B981]">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {busyId === workspace.id && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreate={async (name, description) => {
            let workspace: Awaited<ReturnType<typeof createWorkspace>>
            try {
              workspace = await createWorkspace(name, description)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Không thể tạo workspace')
              throw error
            }
            clearSelection()
            setSelectedGroupId(null)
            setProfiles([])
            setGroups([])
            await loadAll()
            toast.success(`Đã tạo workspace ${workspace.name}`)
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

function CreateWorkspaceModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) return
          setLoading(true)
          setError('')
          try {
            await onCreate(name.trim(), description.trim())
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Không thể tạo workspace')
          } finally {
            setLoading(false)
          }
        }}
        className="mkt-panel w-[440px] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Create Workspace</h3>
            <p className="mt-1 text-sm text-[#7C8796]">Tạo không gian làm việc riêng cho team hoặc dự án.</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#7C8796] hover:text-white">X</button>
        </div>
        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium text-[#D7DEE8]">Workspace name *</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus required className="field" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#D7DEE8]">Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="field resize-none" />
        </label>
        {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#344153] px-4 py-2 text-sm text-[#D7DEE8] hover:bg-white/5">Cancel</button>
          <button disabled={loading || !name.trim()} className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6] disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  )
}

function KeyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.75 10V8.25a4.25 4.25 0 018.5 0V10" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 10h10.5A1.75 1.75 0 0119 11.75v6.5A1.75 1.75 0 0117.25 20H6.75A1.75 1.75 0 015 18.25v-6.5A1.75 1.75 0 016.75 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v2" />
    </svg>
  )
}

function WorkspaceIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8m-8 6h8m-8 6h8M5 4h14v16H5V4z" />
    </svg>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}
