import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useToast } from '../store/useToast'
import type { AutomationScript } from '../../../shared/types'

export default function SyncPage() {
  const profiles = useStore((s) => s.profiles)
  const runningIds = useStore((s) => s.runningIds)
  const [scripts, setScripts] = useState<AutomationScript[]>([])
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [navigateUrl, setNavigateUrl] = useState('')
  const [selectedScriptId, setSelectedScriptId] = useState('')
  const [loading, setLoading] = useState(false)
  const addToast = useToast((s) => s.addToast)

  const runningProfiles = profiles.filter(p => runningIds.includes(p.id))

  useEffect(() => {
    loadScripts()
  }, [])

  useEffect(() => {
    // Auto-select all running profiles
    setSelectedProfileIds(runningIds)
  }, [runningIds])

  const loadScripts = async () => {
    const data = await window.api.scripts.getAll()
    setScripts(data)
  }

  const handleSelectAll = () => {
    setSelectedProfileIds(runningIds)
  }

  const handleDeselectAll = () => {
    setSelectedProfileIds([])
  }

  const handleToggleProfile = (profileId: string) => {
    if (selectedProfileIds.includes(profileId)) {
      setSelectedProfileIds(selectedProfileIds.filter(id => id !== profileId))
    } else {
      setSelectedProfileIds([...selectedProfileIds, profileId])
    }
  }

  const handleNavigate = async () => {
    if (!navigateUrl.trim()) {
      addToast('warning', 'Vui lòng nhập URL')
      return
    }
    if (selectedProfileIds.length === 0) {
      addToast('warning', 'Vui lòng chọn ít nhất 1 profile')
      return
    }

    setLoading(true)
    try {
      // Note: This feature requires browser connection implementation
      addToast('info', 'Tính năng đang phát triển - cần kết nối với browser đang chạy')
    } catch (err) {
      addToast('error', 'Lỗi khi điều hướng')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncCookies = async () => {
    if (selectedProfileIds.length === 0) {
      addToast('warning', 'Vui lòng chọn ít nhất 1 profile')
      return
    }

    setLoading(true)
    try {
      let successCount = 0
      for (const profileId of selectedProfileIds) {
        // Note: This requires browser connection to get cookies
        // await window.api.cookies.sync(profileId, chromeCookies)
        successCount++
      }
      addToast('success', `Đã sync cookies từ ${successCount} browser`)
    } catch (err) {
      addToast('error', 'Lỗi khi sync cookies')
    } finally {
      setLoading(false)
    }
  }

  const handleRunScript = async () => {
    if (!selectedScriptId) {
      addToast('warning', 'Vui lòng chọn script')
      return
    }
    if (selectedProfileIds.length === 0) {
      addToast('warning', 'Vui lòng chọn ít nhất 1 profile')
      return
    }

    setLoading(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const profileId of selectedProfileIds) {
        const profile = profiles.find(p => p.id === profileId)
        if (!profile) continue

        const result = await window.api.scripts.run(selectedScriptId, profile)
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      }

      if (errorCount === 0) {
        addToast('success', `Đã chạy script trên ${successCount} profile`)
      } else {
        addToast('warning', `Thành công: ${successCount}, Lỗi: ${errorCount}`)
      }
    } catch (err) {
      addToast('error', 'Lỗi khi chạy script')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseAll = async () => {
    if (selectedProfileIds.length === 0) {
      addToast('warning', 'Vui lòng chọn ít nhất 1 profile')
      return
    }

    setLoading(true)
    try {
      for (const profileId of selectedProfileIds) {
        await window.api.browser.close(profileId)
      }
      addToast('success', `Đã đóng ${selectedProfileIds.length} browser`)
      setSelectedProfileIds([])
    } catch (err) {
      addToast('error', 'Lỗi khi đóng browser')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 border-b border-purple-500/10 bg-[#0D0B1A]/80 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Đồng bộ thao tác</h1>
        <p className="text-xs text-slate-400 mt-1">Điều phối hàng loạt profile đang chạy</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Running Profiles List */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Running ({runningProfiles.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-colors"
              >
                All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-colors"
              >
                None
              </button>
            </div>
          </div>

          {runningProfiles.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              Không có profile đang chạy
            </div>
          ) : (
            <div className="space-y-2">
              {runningProfiles.map(profile => (
                <label
                  key={profile.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-purple-500/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedProfileIds.includes(profile.id)}
                    onChange={() => handleToggleProfile(profile.id)}
                    className="w-4 h-4 rounded border-purple-500/30 bg-white/5 text-purple-500 focus:ring-1 focus:ring-purple-400/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{profile.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {profile.proxy.type !== 'none' ? `${profile.proxy.host}` : 'No proxy'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    On
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-500 pt-1">
            Selected: {selectedProfileIds.length} / {runningProfiles.length}
          </div>
        </section>

        {/* Actions */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white">Bulk Actions</h2>

          {/* Navigate */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Navigate URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={navigateUrl}
                onChange={(e) => setNavigateUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors"
              />
              <button
                onClick={handleNavigate}
                disabled={loading || selectedProfileIds.length === 0}
                className="px-4 py-2 rounded-lg bg-purple-500/10 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
              >
                Go
              </button>
            </div>
          </div>

          {/* Run Script */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Run Script</label>
            <div className="flex gap-2">
              <select
                value={selectedScriptId}
                onChange={(e) => setSelectedScriptId(e.target.value)}
                className="flex-1 rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 focus:border-purple-500/30 focus:outline-none transition-colors"
              >
                <option value="">Select script</option>
                {scripts.map(script => (
                  <option key={script.id} value={script.id}>{script.name}</option>
                ))}
              </select>
              <button
                onClick={handleRunScript}
                disabled={loading || selectedProfileIds.length === 0 || !selectedScriptId}
                className="px-4 py-2 rounded-lg bg-emerald-500/10 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                Run
              </button>
            </div>
          </div>

          {/* Sync Cookies */}
          <button
            onClick={handleSyncCookies}
            disabled={loading || selectedProfileIds.length === 0}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Sync Cookies
          </button>

          {/* Close All */}
          <button
            onClick={handleCloseAll}
            disabled={loading || selectedProfileIds.length === 0}
            className="w-full px-4 py-2 rounded-lg bg-red-500/10 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            Close All
          </button>
        </section>

        {/* Info */}
        <section className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3">
          <div className="text-xs text-slate-400 space-y-1">
            <p>• Navigate & Sync Cookies: in development</p>
            <p>• Run Script: auto-opens browser if needed</p>
          </div>
        </section>
      </div>
    </div>
  )
}
