import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useWorkspace } from '../store/useWorkspace'
import { toast } from '../store/useToast'
import type { WorkspaceWithStats } from '../../../shared/workspace-types'

type TabType = 'general' | 'info'

export default function WorkspaceSettingsPage() {
  const { currentWorkspace, currentRole, workspaces, updateWorkspace, deleteWorkspace } = useWorkspace()
  const [activeTab, setActiveTab] = useState<TabType>('info')

  if (!currentWorkspace) {
    return (
      <div className="mkt-shell flex h-full items-center justify-center">
        <p className="text-[#7C8796]">Không có workspace nào được chọn</p>
      </div>
    )
  }

  const isOwner = currentRole === 'owner'
  const defaultWorkspaceId =
    workspaces.find((workspace) => workspace.isDefault === true)?.id ??
    (currentWorkspace.isDefault === true ? currentWorkspace.id : null) ??
    workspaces[0]?.id ??
    null

  return (
    <div className="mkt-shell h-full overflow-y-auto px-6 py-5">
      <div className="mx-auto max-w-[1152px]">
        <div className="mkt-panel flex min-h-[520px] overflow-hidden">
          <aside className="w-[202px] shrink-0 border-r border-solid border-[#2C3746] px-4 py-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-bold transition-colors ${
                  activeTab === 'general'
                    ? 'bg-[#384452] text-white'
                    : 'text-[#8EA0B5] hover:bg-white/5 hover:text-white'
                }`}
              >
                <SlidersIcon className="h-4 w-4" />
                Chung
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-bold transition-colors ${
                  activeTab === 'info'
                    ? 'bg-[#384452] text-white'
                    : 'text-[#8EA0B5] hover:bg-white/5 hover:text-white'
                }`}
              >
                <InfoIcon className="h-4 w-4" />
                Thông tin
              </button>
            </nav>
          </aside>

          <main className="flex-1 px-10 py-7">
            {activeTab === 'general' && (
              <GeneralTab
                workspace={currentWorkspace}
                defaultWorkspaceId={defaultWorkspaceId}
                isOwner={isOwner}
                onDelete={deleteWorkspace}
              />
            )}
            {activeTab === 'info' && (
              <InfoTab
                workspace={currentWorkspace}
                defaultWorkspaceId={defaultWorkspaceId}
                isOwner={isOwner}
                onUpdate={updateWorkspace}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function isDefaultWorkspace(workspace: Pick<WorkspaceWithStats, 'isDefault'>) {
  return workspace.isDefault === true
}

function GeneralTab({
  workspace,
  defaultWorkspaceId,
  isOwner,
  onDelete
}: {
  workspace: WorkspaceWithStats
  defaultWorkspaceId: string | null
  isOwner: boolean
  onDelete: (workspaceId: string) => Promise<any>
}) {
  const [permissionMode, setPermissionMode] = useState<'group' | 'profile'>(
    workspace.settings?.permissionMode || 'profile'
  )
  const [automationMode, setAutomationMode] = useState<'flowchart' | 'javascript'>(
    workspace.settings?.automationMode || 'javascript'
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const defaultWorkspace = useMemo(
    () => isDefaultWorkspace(workspace) || workspace.id === defaultWorkspaceId,
    [defaultWorkspaceId, workspace]
  )

  useEffect(() => {
    const changed =
      permissionMode !== (workspace.settings?.permissionMode || 'profile') ||
      automationMode !== (workspace.settings?.automationMode || 'javascript')
    setHasChanges(changed)
  }, [permissionMode, automationMode, workspace.settings])

  const handleSave = async () => {
    if (!hasChanges) return
    setIsSaving(true)
    try {
      await window.api.workspaces.updateWorkspaceSettings(workspace.id, {
        permissionMode,
        automationMode
      })
      toast.success('Đã lưu cài đặt')
      setHasChanges(false)
    } catch (error) {
      toast.error('Lỗi lưu cài đặt: ' + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isOwner) {
      toast.error('Chỉ owner mới có thể xóa workspace')
      return
    }

    if (defaultWorkspace) {
      toast.error('Không thể xóa workspace mặc định')
      return
    }

    if (deleteConfirmText !== workspace.name) {
      toast.error('Tên workspace không khớp')
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(workspace.id)
      toast.success('Đã xóa workspace')
      setShowDeleteModal(false)
    } catch (error) {
      toast.error('Lỗi xóa workspace: ' + (error as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-[720px] space-y-8">
      <SettingSection title="Phương pháp phân quyền">
        <ChoiceCard
          selected={permissionMode === 'group'}
          disabled={!isOwner}
          title="Chia theo nhóm"
          description="Phân quyền theo nhóm người dùng trong workspace."
          icon={<UsersIcon className="h-5 w-5" />}
          onClick={() => setPermissionMode('group')}
        />
        <ChoiceCard
          selected={permissionMode === 'profile'}
          disabled={!isOwner}
          title="Chia theo hồ sơ"
          description="Phân quyền theo từng hồ sơ riêng lẻ."
          icon={<UserIcon className="h-5 w-5" />}
          onClick={() => setPermissionMode('profile')}
        />
      </SettingSection>

      <SettingSection title="Chế độ tạo quy trình">
        <ChoiceCard
          selected={automationMode === 'flowchart'}
          disabled={!isOwner}
          title="Sơ đồ"
          description="Tạo quy trình bằng sơ đồ trực quan."
          icon={<FlowIcon className="h-5 w-5" />}
          onClick={() => setAutomationMode('flowchart')}
        />
        <ChoiceCard
          selected={automationMode === 'javascript'}
          disabled={!isOwner}
          title="Mã Javascript"
          description="Viết code Javascript trực tiếp."
          icon={<CodeIcon className="h-5 w-5" />}
          onClick={() => setAutomationMode('javascript')}
        />
      </SettingSection>

      {defaultWorkspace && (
        <div className="mkt-panel-soft flex items-start gap-3 p-4">
          <DefaultWorkspaceIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#F6B600]" />
          <div>
            <p className="text-sm font-bold text-white">Workspace mặc định</p>
            <p className="mt-1 text-xs font-medium text-[#8EA0B5]">
              My Workspace là không gian mặc định của bạn và không thể xóa.
            </p>
          </div>
        </div>
      )}

      {isOwner && !defaultWorkspace && (
        <section className="border-t border-dashed border-[#2C3746] pt-6">
          <h3 className="text-sm font-bold text-red-300">Xóa không gian làm việc</h3>
          <p className="mt-2 text-xs font-medium text-[#8EA0B5]">
            Hành động này không thể hoàn tác. Tất cả dữ liệu trong workspace sẽ bị xóa vĩnh viễn.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="mt-4 flex h-9 items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 text-sm font-bold text-red-300 hover:bg-red-500/20"
          >
            <TrashIcon className="h-4 w-4" />
            Xóa workspace
          </button>
        </section>
      )}

      <button
        onClick={handleSave}
        disabled={!hasChanges || isSaving || !isOwner}
        className="h-9 rounded-md bg-[#384452] px-4 text-sm font-bold text-[#9AA7B7] transition-colors enabled:bg-[#2563EB] enabled:text-white enabled:hover:bg-[#3478F6] disabled:cursor-not-allowed"
      >
        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>

      {showDeleteModal && (
        <DeleteWorkspaceModal
          workspaceName={workspace.name}
          value={deleteConfirmText}
          isDeleting={isDeleting}
          onChange={setDeleteConfirmText}
          onCancel={() => {
            setShowDeleteModal(false)
            setDeleteConfirmText('')
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function InfoTab({
  workspace,
  defaultWorkspaceId,
  isOwner,
  onUpdate
}: {
  workspace: WorkspaceWithStats
  defaultWorkspaceId: string | null
  isOwner: boolean
  onUpdate: (workspaceId: string, updates: { name?: string; settings?: any }) => Promise<void>
}) {
  const [name, setName] = useState(workspace.name || '')
  const [description, setDescription] = useState(workspace.settings?.description || '')
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const defaultWorkspace = useMemo(
    () => isDefaultWorkspace(workspace) || workspace.id === defaultWorkspaceId,
    [defaultWorkspaceId, workspace]
  )

  useEffect(() => {
    const changed =
      name !== (workspace.name || '') ||
      description !== (workspace.settings?.description || '')
    setHasChanges(changed)
  }, [name, description, workspace.name, workspace.settings])

  const handleSave = async () => {
    if (!hasChanges || !isOwner) return

    if (!name.trim()) {
      toast.error('Tên workspace không được để trống')
      return
    }

    setIsSaving(true)
    try {
      await onUpdate(workspace.id, {
        name: name.trim(),
        settings: {
          ...workspace.settings,
          description: description.trim()
        }
      })
      toast.success('Đã lưu thông tin workspace')
      setEditingName(false)
      setEditingDescription(false)
      setHasChanges(false)
    } catch (error) {
      toast.error('Lỗi lưu thông tin: ' + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="relative flex min-h-[460px] max-w-[720px] flex-col">
      <section>
        <h2 className="text-[20px] font-extrabold leading-tight text-white">
          Tên không gian làm việc
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#8EA0B5]">
          Không gian làm việc mặc định được đánh dấu bởi
          <DefaultWorkspaceIcon className="h-4 w-4 text-[#F6B600]" />
        </p>

        <div className="mt-5 flex items-center gap-3">
          {defaultWorkspace && <DefaultWorkspaceIcon className="h-5 w-5 shrink-0 text-[#F6B600]" />}
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!isOwner}
            readOnly={!editingName}
            className="h-8 min-w-[160px] max-w-[420px] rounded-md border border-transparent bg-transparent px-0 text-[16px] font-bold text-[#1677FF] outline-none transition-colors placeholder:text-[#64748B] enabled:focus:border-[#2F3B4B] enabled:focus:bg-[#121922] enabled:focus:px-3 disabled:cursor-not-allowed"
            placeholder="Tên workspace"
          />
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setEditingName(true)
                window.requestAnimationFrame(() => {
                  nameInputRef.current?.focus()
                  nameInputRef.current?.select()
                })
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8EA0B5] transition-colors hover:bg-white/5 hover:text-white"
              title="Sửa tên workspace"
            >
              <EditIcon className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px] font-extrabold leading-tight text-white">
          Mô tả không gian làm việc
        </h2>
        <div className="mt-5 flex items-start gap-3">
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setEditingDescription(true)
                window.requestAnimationFrame(() => descriptionRef.current?.focus())
              }}
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8EA0B5] transition-colors hover:bg-white/5 hover:text-white"
              title="Sửa mô tả workspace"
            >
              <EditIcon className="h-[18px] w-[18px]" />
            </button>
          )}
          <textarea
            ref={descriptionRef}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!isOwner}
            readOnly={!editingDescription}
            rows={4}
            className="mkt-input min-h-[104px] w-full max-w-[560px] resize-none px-3 py-2 text-sm font-medium placeholder:text-[#64748B] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Nhập mô tả workspace"
          />
        </div>
      </section>

      {!isOwner && (
        <div className="mkt-panel-soft mt-8 flex items-start gap-3 p-4">
          <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" />
          <div>
            <p className="text-sm font-bold text-white">Chỉ xem</p>
            <p className="mt-1 text-xs font-medium text-[#8EA0B5]">
              Chỉ owner mới có thể chỉnh sửa thông tin workspace.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!hasChanges || isSaving || !isOwner}
        className="mt-auto h-9 w-fit rounded-md bg-[#384452] px-4 text-sm font-bold text-[#9AA7B7] transition-colors enabled:bg-[#2563EB] enabled:text-white enabled:hover:bg-[#3478F6] disabled:cursor-not-allowed"
      >
        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  )
}

function SettingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[18px] font-extrabold text-white">{title}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  )
}

function ChoiceCard({
  selected,
  disabled,
  title,
  description,
  icon,
  onClick
}: {
  selected: boolean
  disabled: boolean
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mkt-panel-soft flex items-center gap-3 p-4 text-left transition-colors ${
        selected ? 'border-solid border-[#2F80ED] bg-[#10233D]' : 'hover:bg-[#202B38]'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className={selected ? 'text-[#60A5FA]' : 'text-[#8EA0B5]'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-1 block text-xs font-medium text-[#8EA0B5]">{description}</span>
      </span>
      <span className={`h-4 w-4 rounded-full border ${selected ? 'border-[#60A5FA] bg-[#60A5FA]' : 'border-[#627086]'}`} />
    </button>
  )
}

function DeleteWorkspaceModal({
  workspaceName,
  value,
  isDeleting,
  onChange,
  onCancel,
  onDelete
}: {
  workspaceName: string
  value: string
  isDeleting: boolean
  onChange: (value: string) => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mkt-panel w-[480px] p-6 shadow-2xl shadow-black/50">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <WarningIcon className="h-6 w-6 text-red-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-300">Xóa workspace</h3>
            <p className="mt-2 text-sm font-medium text-[#8EA0B5]">
              Hành động này không thể hoàn tác. Tất cả dữ liệu trong workspace <span className="font-bold text-white">"{workspaceName}"</span> sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        </div>

        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-bold text-white">
            Nhập tên workspace để xác nhận: <span className="text-red-300">"{workspaceName}"</span>
          </span>
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Nhập tên workspace"
            className="mkt-input h-10 w-full px-3 text-sm"
            autoFocus
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="h-9 rounded-md border border-[#344153] px-4 text-sm font-bold text-[#D7DEE8] hover:bg-white/5 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting || value !== workspaceName}
            className="flex h-9 items-center gap-2 rounded-md bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DefaultWorkspaceIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.75 10V8.25a4.25 4.25 0 018.5 0V10" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 10h10.5A1.75 1.75 0 0119 11.75v6.5A1.75 1.75 0 0117.25 20H6.75A1.75 1.75 0 015 18.25v-6.5A1.75 1.75 0 016.75 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v2" />
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

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )
}

function SlidersIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h7m4 0h5M9 7a2 2 0 104 0 2 2 0 00-4 0zm-5 10h5m4 0h7m-9 0a2 2 0 104 0 2 2 0 00-4 0z" />
    </svg>
  )
}

function UsersIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H2v-2a4 4 0 014-4h3m6-4a4 4 0 10-8 0 4 4 0 008 0zm6 1a3 3 0 10-6 0 3 3 0 006 0z" />
    </svg>
  )
}

function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function FlowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h6v6H6V4zm6 10h6v6h-6v-6zM9 10v3a3 3 0 003 3h0" />
    </svg>
  )
}

function CodeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  )
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3m-9 0h12" />
    </svg>
  )
}

function WarningIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
}
