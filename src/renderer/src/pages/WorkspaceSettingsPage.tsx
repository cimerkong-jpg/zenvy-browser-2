import { useState, useEffect } from 'react'
import { useWorkspace } from '../store/useWorkspace'
import { toast } from '../store/useToast'
import type { Page } from '../App'

type TabType = 'general' | 'info'

interface WorkspaceSettingsPageProps {
  onNavigate?: (page: Page) => void
}

export default function WorkspaceSettingsPage({ onNavigate }: WorkspaceSettingsPageProps) {
  console.log('[WorkspaceSettingsPage] Component mounted/rendered')
  const { currentWorkspace, currentRole, deleteWorkspace } = useWorkspace()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [loading, setLoading] = useState(false)
  
  // General tab state
  const [permissionMode, setPermissionMode] = useState<'group' | 'profile'>('group')
  const [automationMode, setAutomationMode] = useState<'flowchart' | 'javascript'>('javascript')
  
  // Info tab state
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceDescription, setWorkspaceDescription] = useState('')
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name)
      setWorkspaceDescription(currentWorkspace.settings?.description || '')
      setPermissionMode(currentWorkspace.settings?.permissionMode || 'group')
      setAutomationMode(currentWorkspace.settings?.automationMode || 'javascript')
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (!currentWorkspace) return
    const changed = 
      workspaceName !== currentWorkspace.name ||
      workspaceDescription !== (currentWorkspace.settings?.description || '') ||
      permissionMode !== (currentWorkspace.settings?.permissionMode || 'group') ||
      automationMode !== (currentWorkspace.settings?.automationMode || 'javascript')
    setHasChanges(changed)
  }, [workspaceName, workspaceDescription, permissionMode, automationMode, currentWorkspace])

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Không có workspace nào được chọn</div>
      </div>
    )
  }

  const isOwner = currentRole === 'owner'
  const isDefault = currentWorkspace.isDefault || currentWorkspace.name === 'My Workspace'
  const canDelete = isOwner && !isDefault

  const handleSaveGeneral = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      await window.api.workspaces.updateWorkspaceSettings(currentWorkspace.id, {
        permissionMode,
        automationMode,
      })
      toast.success('Đã lưu cài đặt')
      setHasChanges(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu cài đặt')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInfo = async () => {
    if (!currentWorkspace) return
    if (!workspaceName.trim()) {
      toast.error('Tên workspace không được để trống')
      return
    }
    setLoading(true)
    try {
      await window.api.workspaces.updateWorkspace(currentWorkspace.id, {
        name: workspaceName.trim(),
        description: workspaceDescription.trim(),
      })
      toast.success('Đã cập nhật thông tin')
      setHasChanges(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thông tin')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentWorkspace || deleteConfirmName !== currentWorkspace.name) return
    setLoading(true)
    try {
      await deleteWorkspace(currentWorkspace.id)
      toast.success('Đã xóa workspace')
      setShowDeleteModal(false)
      if (onNavigate) onNavigate('profiles')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-purple-500/10 bg-[#0D0B1A]/80 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Cài Đặt Workspace</h1>
        <p className="text-xs text-slate-400 mt-1">
          {currentWorkspace.name}
          {isDefault && <span className="ml-2 text-amber-400">• Mặc định</span>}
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Card with sidebar */}
          <div className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl overflow-hidden flex">
            {/* Sidebar */}
            <div className="w-48 border-r border-purple-500/10 bg-black/20 p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === 'general'
                      ? 'bg-purple-500/20 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ⚙️ Chung
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === 'info'
                      ? 'bg-purple-500/20 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ℹ️ Thông tin
                </button>
              </nav>
            </div>

            {/* Content area */}
            <div className="flex-1 p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Permission Mode */}
                  <section>
                    <h3 className="text-sm font-medium text-white mb-3">Phương pháp phân quyền</h3>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          checked={permissionMode === 'group'}
                          onChange={() => setPermissionMode('group')}
                          className="mt-0.5 w-4 h-4 text-purple-500 border-purple-500/30 bg-white/5 focus:ring-1 focus:ring-purple-400/20"
                        />
                        <div>
                          <div className="text-sm text-white group-hover:text-purple-300 transition-colors">Chia theo nhóm</div>
                          <div className="text-xs text-slate-500">Cấp cho người dùng quyền truy cập vào các nhóm hồ sơ cụ thể</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          checked={permissionMode === 'profile'}
                          onChange={() => setPermissionMode('profile')}
                          className="mt-0.5 w-4 h-4 text-purple-500 border-purple-500/30 bg-white/5 focus:ring-1 focus:ring-purple-400/20"
                        />
                        <div>
                          <div className="text-sm text-white group-hover:text-purple-300 transition-colors">Chia theo hồ sơ</div>
                          <div className="text-xs text-slate-500">Cấp cho người dùng quyền truy cập vào hồ sơ cụ thể</div>
                        </div>
                      </label>
                    </div>
                  </section>

                  {/* Automation Mode */}
                  <section>
                    <h3 className="text-sm font-medium text-white mb-3">Chế độ tạo quy trình</h3>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          checked={automationMode === 'flowchart'}
                          onChange={() => setAutomationMode('flowchart')}
                          className="mt-0.5 w-4 h-4 text-purple-500 border-purple-500/30 bg-white/5 focus:ring-1 focus:ring-purple-400/20"
                        />
                        <div>
                          <div className="text-sm text-white group-hover:text-purple-300 transition-colors">Sơ đồ</div>
                          <div className="text-xs text-slate-500">Sử dụng giao diện kéo thả của Flowchart</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          checked={automationMode === 'javascript'}
                          onChange={() => setAutomationMode('javascript')}
                          className="mt-0.5 w-4 h-4 text-purple-500 border-purple-500/30 bg-white/5 focus:ring-1 focus:ring-purple-400/20"
                        />
                        <div>
                          <div className="text-sm text-white group-hover:text-purple-300 transition-colors">Mã Javascript</div>
                          <div className="text-xs text-slate-500">Sử dụng các lệnh lập trình ngôn ngữ Javascript</div>
                        </div>
                      </label>
                    </div>
                  </section>

                  {/* Delete Section */}
                  <section className="pt-4 border-t border-purple-500/10">
                    <h3 className="text-sm font-medium text-white mb-3">Xóa không gian làm việc</h3>
                    {isDefault ? (
                      <div className="text-sm text-slate-400 mb-3">
                        My Workspace là không gian làm việc mặc định và không thể xóa.
                      </div>
                    ) : !isOwner ? (
                      <div className="text-sm text-slate-400 mb-3">
                        Chỉ owner mới có thể xóa workspace.
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 mb-3">
                        Sau khi xóa, không gian làm việc sẽ biến mất vĩnh viễn cùng với dữ liệu của nó.
                      </div>
                    )}
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={!canDelete}
                      className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Xóa không gian làm việc
                    </button>
                  </section>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveGeneral}
                      disabled={loading || !hasChanges}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'info' && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-medium text-white mb-4">Tên không gian làm việc</h3>
                    <div className="flex items-center gap-2 mb-2">
                      {isDefault && <span className="text-amber-400">🔑</span>}
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        disabled={isDefault || !isOwner}
                        className="flex-1 rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Tên workspace"
                      />
                    </div>
                    {isDefault && (
                      <p className="text-xs text-slate-500">
                        Không gian làm việc mặc định được đánh dấu bởi 🔑
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className="text-sm font-medium text-white mb-4">Mô tả không gian làm việc</h3>
                    <textarea
                      value={workspaceDescription}
                      onChange={(e) => setWorkspaceDescription(e.target.value)}
                      disabled={!isOwner}
                      rows={4}
                      className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Mô tả về workspace này..."
                    />
                  </section>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveInfo}
                      disabled={loading || !hasChanges || !isOwner}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[440px] rounded-xl border border-white/10 bg-[#111218] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Xóa không gian làm việc?</h3>
            <p className="text-sm text-slate-400 mb-4">
              Để xác nhận xóa, hãy gõ <span className="text-white font-medium">'{currentWorkspace.name}'</span> vào ô bên dưới
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Lưu ý: Khi xóa không gian làm việc, tất cả hồ sơ được lưu trữ trong không gian làm việc sẽ bị xóa và không thể khôi phục.
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Nhập tên không gian làm việc để xác nhận"
              className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmName('')
                }}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || deleteConfirmName !== currentWorkspace.name}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xóa...' : 'Xóa không gian làm việc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
