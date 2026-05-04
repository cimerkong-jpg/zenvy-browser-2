import { useState, useEffect } from 'react'

interface CreateGroupModalProps {
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}

export function CreateGroupModal({ onClose, onCreate }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!groupName.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onCreate(groupName.trim())
      onClose()
    } catch (error) {
      console.error('Failed to create group:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A12]/78 backdrop-blur-[2px]">
      <div className="w-[500px] max-w-[calc(100vw-48px)] rounded-2xl border border-white/10 bg-[#1B2431] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <h3 className="text-lg font-bold text-white">Tạo nhóm</h3>

        <div className="mt-6">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Tên nhóm *</span>
            <input
              autoFocus
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Nhập tên nhóm..."
              className="h-12 w-full rounded-lg border border-slate-600/70 bg-[#202B38] px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-purple-400"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={!groupName.trim() || isSubmitting}
            className="rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Tạo
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditGroupModalProps {
  groupId: string
  currentName: string
  onClose: () => void
  onUpdate: (groupId: string, newName: string) => Promise<void>
}

export function EditGroupModal({ groupId, currentName, onClose, onUpdate }: EditGroupModalProps) {
  const [groupName, setGroupName] = useState(currentName)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setGroupName(currentName)
  }, [currentName])

  const handleSubmit = async () => {
    if (!groupName.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onUpdate(groupId, groupName.trim())
      onClose()
    } catch (error) {
      console.error('Failed to update group:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A12]/78 backdrop-blur-[2px]">
      <div className="w-[500px] max-w-[calc(100vw-48px)] rounded-2xl border border-white/10 bg-[#1B2431] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <h3 className="text-lg font-bold text-white">Sửa nhóm</h3>

        <div className="mt-6">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Tên nhóm *</span>
            <input
              autoFocus
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Nhập tên nhóm..."
              className="h-12 w-full rounded-lg border border-slate-600/70 bg-[#202B38] px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-purple-400"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={!groupName.trim() || isSubmitting}
            className="rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  )
}

interface DeleteGroupModalProps {
  groupName: string
  onClose: () => void
  onDelete: () => Promise<void>
}

export function DeleteGroupModal({ groupName, onClose, onDelete }: DeleteGroupModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDelete = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      console.error('Failed to delete group:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A12]/78 backdrop-blur-[2px]">
      <div className="w-[500px] max-w-[calc(100vw-48px)] rounded-2xl border border-white/10 bg-[#1B2431] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <h3 className="text-lg font-bold text-white">Xóa nhóm {groupName}</h3>

        <div className="mt-6">
          <p className="text-sm text-slate-300">
            Bạn có chắc chắn muốn xóa nhóm hồ sơ này không?
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Sau khi xóa tất cả các hồ sơ trong nhóm này sẽ được chuyển sang nhóm Ungrouped.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            onClick={handleDelete}
            disabled={isSubmitting}
            className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}
