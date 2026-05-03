import { useState, useEffect } from 'react'
import type { Profile, Fingerprint, Proxy } from '../../../shared/types'
import { useStore } from '../store/useStore'
import TagInput from './TagInput'

const UA_PRESETS: Record<string, string> = {
  'Chrome 120 / Windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Chrome 120 / macOS': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Chrome 120 / Linux': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Firefox 121 / Windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Safari 17 / macOS': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
}

const defaultFingerprint: Fingerprint = {
  os: 'Windows',
  userAgent: UA_PRESETS['Chrome 120 / Windows'],
  timezone: 'Asia/Ho_Chi_Minh',
  language: 'vi-VN',
  screenWidth: 1920,
  screenHeight: 1080,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  webRTC: 'disabled', // Force disabled by default for 100/100 antidetect score
  canvas: 'noise',
  webGL: 'noise',
  deviceName: '',
  macAddress: ''
}

const defaultProxy: Proxy = {
  type: 'none',
  host: '',
  port: '',
  username: '',
  password: ''
}

interface Props {
  profile: Profile | null
  onClose: () => void
}

export default function ProfileModal({ profile, onClose }: Props) {
  const { loadAll, groups, selectedGroupId } = useStore()
  const isEdit = !!profile

  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState<string>('')
  
  // Auto-select current group when creating new profile
  useEffect(() => {
    if (!profile && selectedGroupId && selectedGroupId !== 'no-group') {
      setGroupId(selectedGroupId)
    }
  }, [profile, selectedGroupId])
  const [notes, setNotes] = useState('')
  const [cookies, setCookies] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [fingerprint, setFingerprint] = useState<Fingerprint>(defaultFingerprint)
  const [proxy, setProxy] = useState<Proxy>(defaultProxy)
  const [tab, setTab] = useState<'basic' | 'fingerprint' | 'proxy'>('basic')
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templateIcon, setTemplateIcon] = useState('⭐')

  useEffect(() => {
    window.api.templates.getAll().then(setTemplates)
  }, [])

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setGroupId(profile.groupId ?? '')
      setNotes(profile.notes)
      setCookies(profile.cookies)
      setTags(profile.tags || [])
      setFingerprint(profile.fingerprint)
      setProxy(profile.proxy)
    }
  }, [profile])

  const fp = (key: keyof Fingerprint, val: string | number) =>
    setFingerprint((f) => ({ ...f, [key]: val }))

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      alert('Vui lòng nhập tên template')
      return
    }

    try {
      await window.api.templates.save({
        name: templateName.trim(),
        description: templateDesc.trim() || `Custom template: ${templateName}`,
        icon: templateIcon,
        fingerprint,
        proxy
      })

      // Reload templates
      const updated = await window.api.templates.getAll()
      setTemplates(updated)

      setShowSaveTemplate(false)
      setTemplateName('')
      setTemplateDesc('')
      setTemplateIcon('⭐')

      alert('✅ Template đã được lưu!')
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Lỗi khi lưu template')
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        groupId: groupId || null,
        notes,
        cookies,
        fingerprint,
        proxy,
        tags,
        status: profile?.status ?? 'closed' as const
      }
      let savedProfile: any
      if (isEdit && profile) {
        savedProfile = await window.api.profiles.update(profile.id, data)
      } else {
        savedProfile = await window.api.profiles.create(data)
      }

      // Import cookies if JSON provided
      if (cookies.trim()) {
        try {
          const cookieData = JSON.parse(cookies)
          if (Array.isArray(cookieData) && cookieData.length > 0) {
            const profileId = savedProfile?.id || profile?.id
            if (profileId) {
              await window.api.cookies.sync(profileId, cookieData)
              console.log('Cookies imported successfully')
            }
          }
        } catch (e) {
          console.warn('Invalid cookie JSON, skipping import:', e)
        }
      }

      await loadAll()
      onClose()
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert('Lỗi khi lưu hồ sơ: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { key: 'basic', label: 'Cơ bản' },
    { key: 'fingerprint', label: 'Fingerprint' },
    { key: 'proxy', label: 'Proxy' }
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-purple-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ mới'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {tab === 'basic' && (
            <>
              <Field label="Tên hồ sơ *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Facebook Account 1"
                  className="input-field"
                />
              </Field>

              <Field label="Nhóm">
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Không có nhóm</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Ghi chú">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Thông tin tài khoản, mật khẩu, ghi chú..."
                  className="input-field resize-none"
                />
              </Field>

              <Field label="Tags">
                <TagInput selectedTags={tags} onChange={setTags} />
              </Field>

              <Field label="Cookies (JSON)">
                <textarea
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  rows={4}
                  placeholder='[{"name":"c_user","value":"...","domain":".facebook.com"}]'
                  className="input-field resize-none font-mono text-xs"
                />
              </Field>
            </>
          )}

          {tab === 'fingerprint' && (
            <>
              {!isEdit && templates.length > 0 && (
                <Field label="Template">
                  <div className="grid grid-cols-5 gap-2">
                    {templates.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => {
                          setFingerprint(t.fingerprint)
                          setProxy(t.proxy)
                        }}
                        className="p-3 rounded-lg border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-center"
                        title={t.description}
                      >
                        <div className="text-2xl mb-1">{t.icon}</div>
                        <div className="text-xs text-white/80">{t.name}</div>
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <Field label="User Agent">
                <select
                  onChange={(e) => fp('userAgent', UA_PRESETS[e.target.value] || '')}
                  className="input-field mb-2"
                >
                  <option value="">Chọn preset...</option>
                  {Object.keys(UA_PRESETS).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <textarea
                  value={fingerprint.userAgent}
                  onChange={(e) => fp('userAgent', e.target.value)}
                  rows={2}
                  className="input-field resize-none font-mono text-xs"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Hệ điều hành">
                  <select value={fingerprint.os} onChange={(e) => fp('os', e.target.value)} className="input-field">
                    <option>Windows</option>
                    <option>macOS</option>
                    <option>Linux</option>
                  </select>
                </Field>
                <Field label="Ngôn ngữ">
                  <input value={fingerprint.language} onChange={(e) => fp('language', e.target.value)} className="input-field" />
                </Field>
                <Field label="Múi giờ">
                  <input value={fingerprint.timezone} onChange={(e) => fp('timezone', e.target.value)} className="input-field" />
                </Field>
                <Field label="Hardware Concurrency">
                  <select value={fingerprint.hardwareConcurrency} onChange={(e) => fp('hardwareConcurrency', Number(e.target.value))} className="input-field">
                    {[2, 4, 6, 8, 10, 12, 16].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="WebRTC">
                  <select value={fingerprint.webRTC} onChange={(e) => fp('webRTC', e.target.value)} className="input-field">
                    <option value="disabled">Vô hiệu hóa</option>
                    <option value="real">Thực</option>
                  </select>
                </Field>
                <Field label="Canvas">
                  <select value={fingerprint.canvas} onChange={(e) => fp('canvas', e.target.value)} className="input-field">
                    <option value="noise">Nhiễu</option>
                    <option value="real">Thực</option>
                  </select>
                </Field>
                <Field label="WebGL">
                  <select value={fingerprint.webGL} onChange={(e) => fp('webGL', e.target.value)} className="input-field">
                    <option value="noise">Nhiễu</option>
                    <option value="real">Thực</option>
                  </select>
                </Field>
              </div>

              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-white/90 mb-3">Advanced Fingerprinting</h3>

                <Field label="Fonts">
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        const WINDOWS_FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact', 'Tahoma', 'Calibri', 'Cambria', 'Consolas', 'Segoe UI', 'Palatino Linotype']
                        setFingerprint(f => ({ ...f, fonts: WINDOWS_FONTS }))
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
                    >
                      Windows
                    </button>
                    <button
                      onClick={() => {
                        const MACOS_FONTS = ['Helvetica', 'Times', 'Courier', 'Arial', 'Verdana', 'Georgia', 'Helvetica Neue', 'Lucida Grande', 'Monaco', 'Menlo', 'San Francisco', 'Apple Symbols', 'Avenir', 'Baskerville', 'Didot']
                        setFingerprint(f => ({ ...f, fonts: MACOS_FONTS }))
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                    >
                      macOS
                    </button>
                    <button
                      onClick={() => {
                        const LINUX_FONTS = ['DejaVu Sans', 'Liberation Sans', 'Ubuntu', 'Noto Sans', 'FreeSans', 'DejaVu Serif', 'Liberation Serif', 'Noto Serif', 'FreeSerif', 'DejaVu Sans Mono', 'Liberation Mono', 'Ubuntu Mono']
                        setFingerprint(f => ({ ...f, fonts: LINUX_FONTS }))
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30"
                    >
                      Linux
                    </button>
                    <button
                      onClick={() => setFingerprint(f => ({ ...f, fonts: undefined }))}
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                    >
                      Clear
                    </button>
                  </div>
                  {fingerprint.fonts && (
                    <div className="mt-2 text-xs text-white/60">
                      {fingerprint.fonts.length} fonts selected
                    </div>
                  )}
                </Field>

                <Field label="Screen Resolution">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      onChange={(e) => {
                        const presets: Record<string, any> = {
                          '1920x1080': { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
                          '1366x768': { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24 },
                          '1440x900': { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24 }
                        }
                        if (e.target.value && presets[e.target.value]) {
                          setFingerprint(f => ({ ...f, screen: presets[e.target.value] }))
                        }
                      }}
                      className="input-field"
                    >
                      <option value="">Default</option>
                      <option value="1920x1080">1920x1080</option>
                      <option value="1366x768">1366x768</option>
                      <option value="1440x900">1440x900</option>
                    </select>
                    <button
                      onClick={() => setFingerprint(f => ({ ...f, screen: undefined }))}
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                    >
                      Clear
                    </button>
                  </div>
                </Field>

                <Field label="Audio Context">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={fingerprint.audioContext?.sampleRate || ''}
                      onChange={(e) => {
                        const rate = e.target.value ? Number(e.target.value) as 44100 | 48000 : undefined
                        setFingerprint(f => ({
                          ...f,
                          audioContext: rate ? { sampleRate: rate, channelCount: 2, maxChannelCount: 2 } : undefined
                        }))
                      }}
                      className="input-field"
                    >
                      <option value="">Default</option>
                      <option value="44100">44100 Hz</option>
                      <option value="48000">48000 Hz</option>
                    </select>
                    <button
                      onClick={() => setFingerprint(f => ({ ...f, audioContext: undefined }))}
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                    >
                      Clear
                    </button>
                  </div>
                </Field>

                <Field label="Geolocation">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Latitude"
                      value={fingerprint.geolocation?.latitude || ''}
                      onChange={(e) => {
                        const lat = e.target.value ? Number(e.target.value) : undefined
                        setFingerprint(f => ({
                          ...f,
                          geolocation: lat !== undefined ? { latitude: lat, longitude: f.geolocation?.longitude || 0, accuracy: 10 } : undefined
                        }))
                      }}
                      className="input-field"
                    />
                    <input
                      type="number"
                      placeholder="Longitude"
                      value={fingerprint.geolocation?.longitude || ''}
                      onChange={(e) => {
                        const lng = e.target.value ? Number(e.target.value) : undefined
                        setFingerprint(f => ({
                          ...f,
                          geolocation: lng !== undefined ? { latitude: f.geolocation?.latitude || 0, longitude: lng, accuracy: 10 } : undefined
                        }))
                      }}
                      className="input-field"
                    />
                    <button
                      onClick={() => setFingerprint(f => ({ ...f, geolocation: undefined }))}
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                    >
                      Clear
                    </button>
                  </div>
                </Field>

                <Field label="Battery Status">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={fingerprint.battery?.charging ? 'true' : 'false'}
                      onChange={(e) => {
                        const charging = e.target.value === 'true'
                        setFingerprint(f => ({
                          ...f,
                          battery: { charging, level: f.battery?.level || 0.8, chargingTime: Infinity, dischargingTime: 3600 }
                        }))
                      }}
                      className="input-field"
                    >
                      <option value="">Default</option>
                      <option value="true">Charging</option>
                      <option value="false">Not Charging</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Level (0-1)"
                      step="0.1"
                      min="0"
                      max="1"
                      value={fingerprint.battery?.level || ''}
                      onChange={(e) => {
                        const level = e.target.value ? Number(e.target.value) : 0.8
                        setFingerprint(f => ({
                          ...f,
                          battery: f.battery ? { ...f.battery, level } : undefined
                        }))
                      }}
                      className="input-field"
                    />
                    <button
                      onClick={() => setFingerprint(f => ({ ...f, battery: undefined }))}
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                    >
                      Clear
                    </button>
                  </div>
                </Field>
              </div>
            </>
          )}

          {tab === 'proxy' && (
            <>
              <Field label="Loại Proxy">
                <div className="flex gap-2">
                  {(['none', 'http', 'socks5'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setProxy((p) => ({ ...p, type: t }))}
                      className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                        proxy.type === t
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'text-slate-500 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t === 'none' ? 'Không dùng' : t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </Field>

              {proxy.type !== 'none' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Field label="Host / IP">
                        <input value={proxy.host} onChange={(e) => setProxy((p) => ({ ...p, host: e.target.value }))} placeholder="192.168.1.1" className="input-field" />
                      </Field>
                    </div>
                    <Field label="Port">
                      <input value={proxy.port} onChange={(e) => setProxy((p) => ({ ...p, port: e.target.value }))} placeholder="8080" className="input-field" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Username">
                      <input value={proxy.username} onChange={(e) => setProxy((p) => ({ ...p, username: e.target.value }))} className="input-field" />
                    </Field>
                    <Field label="Password">
                      <input type="password" value={proxy.password} onChange={(e) => setProxy((p) => ({ ...p, password: e.target.value }))} className="input-field" />
                    </Field>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
          <button
            onClick={() => setShowSaveTemplate(true)}
            className="px-4 py-2 text-sm text-purple-400 hover:text-purple-300 rounded-lg hover:bg-purple-500/10 transition-all"
          >
            💾 Lưu làm Template
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="btn-primary text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo hồ sơ'}
            </button>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="glass rounded-xl w-96 p-6">
            <h3 className="text-lg font-semibold mb-4">Lưu làm Template</h3>
            <div className="space-y-3">
              <Field label="Tên Template *">
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="VD: My Custom Template"
                  className="input-field"
                />
              </Field>
              <Field label="Mô tả">
                <input
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Mô tả ngắn gọn..."
                  className="input-field"
                />
              </Field>
              <Field label="Icon">
                <input
                  value={templateIcon}
                  onChange={(e) => setTemplateIcon(e.target.value)}
                  placeholder="⭐"
                  className="input-field text-2xl"
                  maxLength={2}
                />
              </Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveTemplate(false)}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="flex-1 btn-primary px-4 py-2 text-sm rounded-lg"
              >
                Lưu Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
