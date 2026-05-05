import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useToast } from '../store/useToast'
import type { ExtensionInfo } from '../../../shared/types'

export default function ExtensionPage() {
  const profiles = useStore((s) => s.profiles)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [selectedExtIds, setSelectedExtIds] = useState<string[]>([])
  const [targetProfileIds, setTargetProfileIds] = useState<string[]>([])
  const addToast = useToast((s) => s.addToast)

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id)
    }
  }, [profiles, selectedProfileId])

  useEffect(() => {
    if (selectedProfileId) {
      loadExtensions()
    }
  }, [selectedProfileId])

  const loadExtensions = async () => {
    if (!selectedProfileId) return
    setLoading(true)
    try {
      const data = await window.api.extensions.getAll(selectedProfileId)
      setExtensions(data)
    } catch (err) {
      addToast('error', 'Lỗi khi tải extensions')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (extId: string, enabled: boolean) => {
    try {
      await window.api.extensions.toggle(selectedProfileId, extId, enabled)
      addToast('success', enabled ? 'Đã bật extension' : 'Đã tắt extension')
      await loadExtensions()
    } catch (err) {
      addToast('error', 'Lỗi khi thay đổi trạng thái')
    }
  }

  const handleCopyExtensions = async () => {
    if (selectedExtIds.length === 0 || targetProfileIds.length === 0) {
      addToast('warning', 'Vui lòng chọn extension và profile đích')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.extensions.copyTo(selectedProfileId, targetProfileIds, selectedExtIds)
      addToast('success', `Đã copy ${result.success} extension thành công`)
      setShowCopyModal(false)
      setSelectedExtIds([])
      setTargetProfileIds([])
    } catch (err) {
      addToast('error', 'Lỗi khi copy extensions')
    } finally {
      setLoading(false)
    }
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 border-b border-purple-500/10 bg-[#0D0B1A]/80 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Extension</h1>
        <p className="text-xs text-slate-400 mt-1">Quản lý Chrome extension per-profile</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Profile Selector */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white">Profile</h2>
          
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 focus:border-purple-500/30 focus:outline-none transition-colors"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {selectedProfile && (
            <div className="text-xs text-slate-400">
              Profile: <span className="text-slate-300">{selectedProfile.name}</span>
            </div>
          )}
        </section>

        {/* Extensions List */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Extensions ({extensions.length})</h2>
            <button
              onClick={() => setShowCopyModal(true)}
              disabled={extensions.length === 0}
              className="px-4 py-2 rounded-lg bg-purple-500/10 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          {loading ? (
            <div className="text-center py-6 text-slate-400 text-sm">Đang tải...</div>
          ) : extensions.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              Không có extension
            </div>
          ) : (
            <div className="space-y-2">
              {extensions.map(ext => (
                <div
                  key={ext.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-purple-500/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{ext.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{ext.description || 'No description'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      v{ext.version}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={ext.enabled}
                      onChange={(e) => handleToggle(ext.id, e.target.checked)}
                      className="w-4 h-4 rounded border-purple-500/30 bg-white/5 text-purple-500 focus:ring-1 focus:ring-purple-400/20"
                    />
                    <span className="text-xs text-slate-300">
                      {ext.enabled ? 'On' : 'Off'}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Info */}
        <section className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3">
          <div className="text-xs text-slate-400 space-y-1">
            <p>• Extensions quản lý per-profile</p>
            <p>• Toggle có hiệu lực sau khi restart browser</p>
            <p>• Cài extension mới trực tiếp trong Chrome</p>
          </div>
        </section>
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4 rounded-xl border border-purple-500/20 bg-[#0D0B1A] shadow-2xl">
            <div className="border-b border-purple-500/10 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Copy Extensions</h3>
              <p className="text-sm text-slate-400 mt-1">Chọn extensions và profiles đích</p>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Select Extensions */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Chọn extensions muốn copy
                </label>
                <div className="space-y-2">
                  {extensions.map(ext => (
                    <label key={ext.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={selectedExtIds.includes(ext.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExtIds([...selectedExtIds, ext.id])
                          } else {
                            setSelectedExtIds(selectedExtIds.filter(id => id !== ext.id))
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500/30 bg-white/5 text-purple-500"
                      />
                      <span className="text-sm text-white">{ext.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Select Target Profiles */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Chọn profiles đích
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {profiles.filter(p => p.id !== selectedProfileId).map(profile => (
                    <label key={profile.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={targetProfileIds.includes(profile.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTargetProfileIds([...targetProfileIds, profile.id])
                          } else {
                            setTargetProfileIds(targetProfileIds.filter(id => id !== profile.id))
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500/30 bg-white/5 text-purple-500"
                      />
                      <span className="text-sm text-white">{profile.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-purple-500/10 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setSelectedExtIds([])
                  setTargetProfileIds([])
                }}
                className="px-4 py-2 rounded-lg border border-purple-500/20 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCopyExtensions}
                disabled={loading || selectedExtIds.length === 0 || targetProfileIds.length === 0}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
              >
                {loading ? 'Đang copy...' : `Copy ${selectedExtIds.length} extension(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
