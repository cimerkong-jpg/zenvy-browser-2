import { useMemo, useRef, useState } from 'react'
import { useWorkspace } from '../store/useWorkspace'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import { RoleLabels, type WorkspaceRole, type WorkspaceWithStats } from '../../../shared/workspace-types'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'W'
}

function RoleBadge({ role }: { role: WorkspaceRole }) {
  const classes: Record<WorkspaceRole, string> = {
    owner: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    admin: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    member: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    viewer: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  }
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${classes[role]}`}>{RoleLabels[role]}</span>
}

export default function WorkspaceSwitcher() {
  const {
    currentWorkspace,
    workspaces,
    currentRole,
    loading,
    switching,
    setCurrentWorkspace,
    createWorkspace,
    refreshWorkspaceData,
  } = useWorkspace()
  const { loadAll, clearSelection, setSelectedGroupId, setProfiles, setGroups } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? workspaces.filter((workspace) => workspace.name.toLowerCase().includes(q)) : workspaces
  }, [query, workspaces])

  const owned = filtered.filter((workspace) => workspace.role === 'owner')
  const joined = filtered.filter((workspace) => workspace.role !== 'owner')

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

  if (loading && !currentWorkspace) {
    return <div className="h-9 w-[230px] animate-pulse rounded-lg bg-white/5" />
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-[230px] items-center gap-2 rounded-lg border border-[#1F2230] bg-[#111218] px-2.5 text-left hover:bg-[#171923]"
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#7C3AED] text-[10px] font-bold text-white">
          {initials(currentWorkspace?.name ?? 'Workspace')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-4 text-white">{currentWorkspace?.name ?? 'Select workspace'}</div>
          <div className="text-[10px] leading-3 text-slate-500">{currentRole ? RoleLabels[currentRole] : 'No role'}</div>
        </div>
        {(switching || busyId) && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />}
        <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-[300px] rounded-xl border border-[#1F2230] bg-[#111218] p-2.5 shadow-2xl shadow-black/40">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workspace..."
            className="mb-2.5 h-8 w-full rounded-lg border border-[#1F2230] bg-[#0B0B0F] px-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-[#7C3AED]"
          />
          <WorkspaceSection title="Owned" workspaces={owned} currentId={currentWorkspace?.id} busyId={busyId} onSelect={switchTo} />
          <WorkspaceSection title="Joined" workspaces={joined} currentId={currentWorkspace?.id} busyId={busyId} onSelect={switchTo} />
          <button
            onClick={() => {
              setShowCreate(true)
              setOpen(false)
            }}
            className="mt-2 flex h-8 w-full items-center justify-center rounded-lg border border-dashed border-[#334155] px-3 text-xs font-medium text-slate-300 hover:border-[#7C3AED] hover:text-white"
          >
            + Create Workspace
          </button>
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreate={async (name, description) => {
            let workspace: Awaited<ReturnType<typeof createWorkspace>>
            try {
              workspace = await createWorkspace(name, description)
            } catch (error) {
              console.error('[Workspace] Failed to create workspace:', error)
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

function WorkspaceSection({
  title,
  workspaces,
  currentId,
  busyId,
  onSelect,
}: {
  title: string
  workspaces: WorkspaceWithStats[]
  currentId?: string
  busyId: string | null
  onSelect: (workspace: WorkspaceWithStats) => void
}) {
  if (workspaces.length === 0) return null
  return (
    <div className="mb-2">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="space-y-1">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => onSelect(workspace)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${workspace.id === currentId ? 'bg-[#7C3AED]/10' : 'hover:bg-white/5'}`}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#1F2230] text-[10px] font-bold text-white">
              {initials(workspace.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-white">{workspace.name}</div>
              <div className="text-[11px] text-slate-500">{workspace.memberCount} members · {workspace.profileCount} profiles</div>
            </div>
            <RoleBadge role={workspace.role} />
            {busyId === workspace.id && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function CreateWorkspaceModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
        className="w-[440px] rounded-xl border border-white/10 bg-[#111218] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Create Workspace</h3>
            <p className="mt-1 text-sm text-slate-500">Tạo không gian làm việc riêng cho team hoặc dự án.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">X</button>
        </div>
        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Workspace name *</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus required className="field" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="field resize-none" />
        </label>
        {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#1F2230] px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
          <button disabled={loading || !name.trim()} className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B5CF6] disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  )
}
