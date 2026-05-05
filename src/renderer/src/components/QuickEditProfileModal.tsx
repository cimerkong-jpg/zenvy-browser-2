import { useState } from 'react'
import type { Profile } from '../../../shared/types'

interface QuickEditProfileModalProps {
  profile: Profile
  field: 'name' | 'notes'
  onClose: () => void
  onSave: (profileId: string, updates: Partial<Profile>) => Promise<void>
}

export default function QuickEditProfileModal({
  profile,
  field,
  onClose,
  onSave
}: QuickEditProfileModalProps) {
  const [value, setValue] = useState(field === 'name' ? profile.name : profile.notes)
  const [saving, setSaving] = useState(false)

  const title = field === 'name' ? 'Cập nhật tên' : 'Cập nhật ghi chú'
  const label = field === 'name' ? 'Tên hồ sơ' : 'Ghi chú'
  const isValid = field === 'name' ? value.trim().length > 0 : true

  const handleSave = async () => {
    if (!isValid) return
    
    setSaving(true)
    try {
      const updates = field === 'name' 
        ? { name: value.trim() }
        : { notes: value }
      
      await onSave(profile.id, updates)
      onClose()
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Lỗi khi cập nhật: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isValid) {
      handleSave()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1F2230] bg-[#111218] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2230] px-6 py-3.5">
          <h3 className="text-base font-semibold text-[#E5E7EB]">{title}</h3>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#1F2230] hover:text-[#E5E7EB] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
            {label} {field === 'name' && <span className="text-red-400">*</span>}
          </label>
          
          {field === 'name' ? (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="VD: Facebook Account 1"
              autoFocus
              className="input-field"
            />
          ) : (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder="Thông tin tài khoản, mật khẩu, ghi chú..."
              autoFocus
              className="input-field resize-none"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#1F2230] px-6 py-4">
          <button 
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#1F2230] bg-[#0B0B0F] px-4 py-2 text-sm font-medium text-[#9CA3AF] hover:bg-[#1F2230] hover:text-[#E5E7EB] disabled:opacity-50 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-medium text-white hover:bg-[#8B5CF6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  )
}
