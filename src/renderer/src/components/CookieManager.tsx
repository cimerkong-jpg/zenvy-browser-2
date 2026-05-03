import { useState, useEffect } from 'react'

interface Cookie {
  domain: string
  name: string
  value: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

interface Props {
  profileId: string
  onClose: () => void
}

export default function CookieManager({ profileId, onClose }: Props) {
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCookies()
  }, [profileId])

  const loadCookies = async () => {
    setLoading(true)
    const data = await window.api.cookies.get(profileId)
    setCookies(data || [])
    setLoading(false)
  }

  const handleImport = async () => {
    const result = await window.api.cookies.import(profileId)
    if (result) {
      setCookies(result)
    }
  }

  const handleExport = async () => {
    await window.api.cookies.export(profileId)
  }

  const handleDelete = async (domain: string, name: string) => {
    await window.api.cookies.delete(profileId, domain, name)
    await loadCookies()
  }

  const handleClear = async () => {
    if (confirm('Xóa tất cả cookies?')) {
      await window.api.cookies.clear(profileId)
      setCookies([])
    }
  }

  const filtered = cookies.filter(c =>
    c.domain.includes(search) || c.name.includes(search)
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass rounded-2xl w-[900px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Cookie Manager</h2>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleImport} className="btn-primary px-4 py-2 rounded-lg text-sm">
              📥 Import
            </button>
            <button onClick={handleExport} className="btn-primary px-4 py-2 rounded-lg text-sm">
              📤 Export
            </button>
            <button onClick={handleClear} className="px-4 py-2 rounded-lg text-sm bg-red-500/20 hover:bg-red-500/30">
              🗑️ Clear All
            </button>
            <input
              type="text"
              placeholder="Search cookies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field flex-1 ml-auto"
            />
          </div>
        </div>

        {/* Cookie List */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-white/60">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              {search ? 'No cookies found' : 'No cookies yet. Import or add cookies.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((cookie, i) => (
                <div key={i} className="glass p-4 rounded-lg flex items-center justify-between hover:bg-white/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold">{cookie.name}</span>
                      <span className="text-xs text-white/40">{cookie.domain}</span>
                      {cookie.secure && <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded">🔒 Secure</span>}
                      {cookie.httpOnly && <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded">HTTP Only</span>}
                    </div>
                    <div className="text-sm text-white/60 truncate max-w-[600px]">
                      {cookie.value}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      Path: {cookie.path} • Expires: {new Date(cookie.expires).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(cookie.domain, cookie.name)}
                    className="ml-4 px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between items-center">
          <span className="text-sm text-white/60">
            {filtered.length} cookie{filtered.length !== 1 ? 's' : ''}
          </span>
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
