import { useState } from 'react'
import { useTheme, type Theme } from '../store/useTheme'
import TemplateManager from './TemplateManager'
import appIcon from '../assets/brand/faticon-logo.png'
import zenvyLogoDark from '../assets/brand/logo-cropped.png'
import zenvyLogoLight from '../assets/brand/logo-cropped-light.png'

const themeMeta: Record<Theme, { label: string; icon: string }> = {
  light: { label: 'Light', icon: '☀' },
  dark: { label: 'Dark', icon: '☾' },
  auto: { label: 'Auto', icon: '◐' }
}

export default function Sidebar() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)

  const selectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme)
    setShowThemePicker(false)
  }

  // Chọn logo dựa trên theme hiện tại
  const currentLogo = resolvedTheme === 'light' ? zenvyLogoLight : zenvyLogoDark

  return (
    <>
      <aside className="app-sidebar w-60 flex-shrink-0 flex flex-col border-r border-purple-500/10 bg-[#0D0B1A]/95">
        <div className="drag-region h-3 flex-shrink-0" />

        <div className="no-drag min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          <div className="brand-logo-shell mb-5 inline-flex w-fit max-w-full px-1 py-1">
            <img
              src={currentLogo}
              alt="Zenvy"
              className="h-12 w-auto max-w-full object-contain"
            />
          </div>

          <nav className="space-y-1">
            <NavItem icon="▣" label="Hồ sơ" active />
            <NavItem icon="⇅" label="Automation" />
            <NavItem icon="↻" label="Đồng bộ thao tác" />
            <NavItem icon="▦" label="Extension" />
            <NavItem icon="○" label="Thành viên" />
            <NavItem icon="⚙" label="Cài đặt" />

            <div className="pt-5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Templates
              </p>
              <button
                onClick={() => setShowTemplateManager(true)}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              >
                <span className="w-5 text-center text-base">▤</span>
                Quản lý Templates
              </button>
            </div>
          </nav>

          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-purple-500/10 bg-white/[0.03] p-4 space-y-3">
              <Metric label="Số dư chính" value="0 VND" />
              <Metric label="Gói đang dùng" value="Personal" />
              <Metric label="Hồ sơ hiện có" value="Local" />
            </div>

            <div className="space-y-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Giao diện
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowThemePicker((open) => !open)}
                  className="flex h-10 w-full items-center gap-2 rounded-xl border border-purple-500/15 bg-white/[0.045] px-3 text-xs font-semibold text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                  title="Mở chọn Light / Dark / Auto"
                  aria-expanded={showThemePicker}
                >
                  <span className="text-base">{themeMeta[theme].icon}</span>
                  <span>{themeMeta[theme].label}</span>
                  <span className="ml-auto text-[10px] text-slate-500">{showThemePicker ? '▲' : '▼'}</span>
                </button>

                {showThemePicker && (
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-purple-500/10 bg-white/[0.035] p-1">
                    {(['light', 'dark', 'auto'] as Theme[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => selectTheme(item)}
                        className={`flex h-8 items-center justify-center rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-400/50 ${
                          theme === item
                            ? 'bg-purple-500/25 text-white shadow-[0_0_18px_rgba(124,58,237,0.22)]'
                            : 'text-slate-500 hover:bg-white/5 hover:text-white'
                        }`}
                        title={item === 'auto' ? 'Auto: 06:00-18:00 Light, 18:00-06:00 Dark' : themeMeta[item].label}
                      >
                        {themeMeta[item].icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="px-1 text-[11px] text-slate-500">
                Auto: 06:00-18:00 Light, 18:00-06:00 Dark. Hiện tại đang dùng {resolvedTheme === 'dark' ? 'Dark' : 'Light'}.
              </p>
            </div>

            <div className="flex items-center gap-2 px-2 py-1.5">
              <img src={appIcon} alt="" className="h-7 w-7 rounded-md object-contain" />
              <div>
                <p className="text-xs font-medium text-white">Zenvy</p>
                <p className="text-[10px] text-slate-500">Personal</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {showTemplateManager && (
        <TemplateManager onClose={() => setShowTemplateManager(false)} />
      )}
    </>
  )
}

function NavItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-400/50 ${
        active
          ? 'bg-purple-500/15 text-white shadow-[inset_3px_0_0_rgba(249,115,22,0.9)]'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className={`w-5 text-center text-base ${active ? 'text-orange-300' : 'text-slate-500'}`}>
        {icon}
      </span>
      {label}
    </button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
