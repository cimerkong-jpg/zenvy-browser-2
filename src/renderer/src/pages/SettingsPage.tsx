import { useEffect, useState } from 'react'
import { useToast } from '../store/useToast'
import type { AppSettings } from '../../../shared/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [chromePath, setChromePath] = useState('')
  const [autoClose, setAutoClose] = useState(true)
  const [retries, setRetries] = useState(3)
  const [dataDir, setDataDir] = useState('')
  const [loading, setLoading] = useState(false)
  const addToast = useToast((s) => s.addToast)

  useEffect(() => {
    loadSettings()
    loadDataDir()
  }, [])

  const loadSettings = async () => {
    const data = await window.api.settings.get()
    setSettings(data)
    setChromePath(data.chromePath)
    setAutoClose(data.autoCloseOnExit)
    setRetries(data.chromeRetries)
  }

  const loadDataDir = async () => {
    const dir = await window.api.settings.getDataDir()
    setDataDir(dir)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await window.api.settings.update({
        chromePath,
        autoCloseOnExit: autoClose,
        chromeRetries: retries
      })
      addToast('success', 'Đã lưu cài đặt')
      await loadSettings()
    } catch (err) {
      addToast('error', 'Lỗi khi lưu cài đặt')
    } finally {
      setLoading(false)
    }
  }

  const handleBrowseChrome = async () => {
    const path = await window.api.settings.browseChrome()
    if (path) setChromePath(path)
  }

  const handleDetectChrome = async () => {
    const path = await window.api.settings.getChromePath()
    setChromePath(path)
    addToast('success', 'Đã phát hiện Chrome')
  }

  const handleOpenDataDir = async () => {
    await window.api.settings.openDataDir()
  }

  const handleBackup = async () => {
    setLoading(true)
    try {
      const data = await window.api.settings.backup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zenvy-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast('success', 'Đã xuất backup')
    } catch (err) {
      addToast('error', 'Lỗi khi backup')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setLoading(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await window.api.settings.restore(data)
        addToast('success', 'Đã khôi phục backup')
        await loadSettings()
        window.api.app.reload()
      } catch (err) {
        addToast('error', 'Lỗi khi khôi phục')
      } finally {
        setLoading(false)
      }
    }
    input.click()
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 border-b border-purple-500/10 bg-[#0D0B1A]/80 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Cài đặt</h1>
        <p className="text-xs text-slate-400 mt-1">Cấu hình vận hành ứng dụng</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Chrome Settings */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white">Chrome</h2>
          
          <div>
            <label className="block text-xs text-slate-400 mb-2">Đường dẫn Chrome</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={chromePath}
                onChange={(e) => setChromePath(e.target.value)}
                className="flex-1 rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors"
                placeholder="/Applications/Google Chrome.app"
              />
              <button
                onClick={handleBrowseChrome}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                Chọn
              </button>
              <button
                onClick={handleDetectChrome}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Số lần retry</label>
            <input
              type="number"
              min="1"
              max="10"
              value={retries}
              onChange={(e) => setRetries(parseInt(e.target.value) || 3)}
              className="w-24 rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-300 focus:border-purple-500/30 focus:outline-none transition-colors"
            />
          </div>
        </section>

        {/* Data Settings */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white">Dữ liệu</h2>
          
          <div>
            <label className="block text-xs text-slate-400 mb-2">Thư mục dữ liệu</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dataDir}
                readOnly
                className="flex-1 rounded-lg border border-purple-500/10 bg-white/5 px-3 py-2 text-sm text-slate-400"
              />
              <button
                onClick={handleOpenDataDir}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                Mở
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleBackup}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-purple-500/10 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
            >
              Backup
            </button>
            <button
              onClick={handleRestore}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Restore
            </button>
          </div>
        </section>

        {/* Startup Settings */}
        <section className="bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl p-4">
          <h2 className="text-sm font-medium text-white mb-3">Khởi động</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoClose}
              onChange={(e) => setAutoClose(e.target.checked)}
              className="w-4 h-4 rounded border-purple-500/30 bg-white/5 text-purple-500 focus:ring-1 focus:ring-purple-400/20"
            />
            <span className="text-sm text-slate-300">Tự động đóng browser khi tắt app</span>
          </label>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </div>
  )
}
