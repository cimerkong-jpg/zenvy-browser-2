import { useState } from 'react'
import { useTheme, type Theme } from '../store/useTheme'
import { useAuth } from '../store/useAuth'
import { useStore } from '../store/useStore'
import { useWorkspace } from '../store/useWorkspace'
import type { Page, AutoSub } from '../App'
import zenvyLogoDark from '../assets/brand/logo-cropped.png'
import zenvyLogoLight from '../assets/brand/logo-cropped-light.png'

const themeMeta: Record<Theme, { label: string; icon: string }> = {
  light: { label: 'Light', icon: '☀' },
  dark: { label: 'Dark', icon: '☾' },
  auto: { label: 'Auto', icon: '◐' }
}

const AUTO_SUB_ITEMS: { key: AutoSub; label: string }[] = [
  { key: 'scripts', label: 'Quy Trình' },
  { key: 'scheduler', label: 'Lập Lịch' },
  { key: 'history', label: 'Lịch Sử' },
]

interface SidebarProps {
  activePage: Page
  onNavigate: (page: Page) => void
  autoSub: AutoSub
  onAutoSubChange: (sub: AutoSub) => void
  onOpenTemplateManager: () => void
}

export default function Sidebar({ activePage, onNavigate, autoSub, onAutoSubChange, onOpenTemplateManager }: SidebarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, signOut } = useAuth()
  const { profiles } = useStore()
  const { currentWorkspaceId, currentWorkspace, workspaces } = useWorkspace()
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const selectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme)
    setShowThemePicker(false)
  }

  const currentLogo = resolvedTheme === 'light' ? zenvyLogoLight : zenvyLogoDark

  return (
    <aside className="mkt-divider-right h-full w-full flex flex-col bg-[#121922]">
      {/* Drag region */}
      <div className="drag-region h-3 flex-shrink-0" />

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3" style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' } as React.CSSProperties}>
        {/* Logo */}
        <div className="mb-6 px-4 py-4">
          <img
            src={currentLogo}
            alt="Zenvy"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="space-y-2 mb-8" style={{ pointerEvents: 'auto' }}>
          <NavItem 
            icon="▣" 
            label="Hồ sơ" 
            active={activePage === 'profiles'} 
            onClick={() => onNavigate('profiles')} 
          />
          
          <NavItem 
            icon="⇅" 
            label="Automation" 
            active={activePage === 'automation'} 
            onClick={() => {
              if (activePage === 'automation') {
                onNavigate('profiles')
              } else {
                onNavigate('automation')
              }
            }} 
            chevron 
            chevronOpen={activePage === 'automation'} 
          />
          
          {activePage === 'automation' && (
            <div className="ml-6 mt-1 space-y-0.5">
              {AUTO_SUB_ITEMS.map((item) => (
                <SubNavItem
                  key={item.key}
                  label={item.label}
                  active={autoSub === item.key}
                  onClick={() => onAutoSubChange(item.key)}
                />
              ))}
            </div>
          )}
          
          <NavItem 
            icon="↻" 
            label="Đồng bộ thao tác" 
            active={activePage === 'sync'} 
            onClick={() => onNavigate('sync')} 
          />
          
          <NavItem 
            icon="▦" 
            label="Extension" 
            active={activePage === 'extensions'} 
            onClick={() => onNavigate('extensions')} 
          />
          
          <NavItem 
            icon="○" 
            label="Thành viên" 
            active={activePage === 'members'} 
            onClick={() => onNavigate('members')} 
          />
          
          <NavItem 
            icon="⚙" 
            label="Cài đặt" 
            active={activePage === 'settings'} 
            onClick={() => onNavigate('settings')} 
          />
        </nav>

        {/* Tools Section */}
        <div className="mb-4">
          <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Công cụ
          </p>
          <button
            onClick={onOpenTemplateManager}
            className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB] transition-all"
          >
            <span className="w-5 text-center">▤</span>
            <span>Quản lý Templates</span>
          </button>
        </div>
      </div>

      {/* Bottom Section - Fixed */}
      <div className="no-drag flex-shrink-0 px-4 pb-4">
        {/* Stats Box */}
        <div className="mkt-panel mt-3 mb-3 p-4">
          <div className="space-y-4">
            <button
              onClick={() => onNavigate('profiles')}
              className="w-full flex items-center gap-2.5 hover:bg-white/5 rounded-lg p-1.5 -m-1.5 transition-all group"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded bg-[#1F2230] flex items-center justify-center group-hover:bg-[#7C3AED]/20">
                <svg className="w-3.5 h-3.5 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] text-[#6B7280] group-hover:text-[#9CA3AF]">Hồ sơ</p>
                <p className="text-[13px] font-semibold text-[#E5E7EB]">{profiles.length} Profiles</p>
              </div>
              <svg className="w-3 h-3 text-[#4B5563] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              className="w-full flex items-center gap-2.5 hover:bg-white/5 rounded-lg p-1.5 -m-1.5 transition-all group cursor-not-allowed opacity-60"
              disabled
              title="Coming soon"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded bg-[#1F2230] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] text-[#6B7280]">Số dư</p>
                <p className="text-[13px] font-semibold text-[#E5E7EB]">0 VND</p>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-2.5 hover:bg-white/5 rounded-lg p-1.5 -m-1.5 transition-all group cursor-not-allowed opacity-60"
              disabled
              title="Coming soon"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded bg-[#1F2230] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] text-[#6B7280]">Gói</p>
                <p className="text-[13px] font-semibold text-[#E5E7EB]">Free</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('members')}
              className="w-full flex items-center gap-2.5 hover:bg-white/5 rounded-lg p-1.5 -m-1.5 transition-all group"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded bg-[#1F2230] flex items-center justify-center group-hover:bg-[#7C3AED]/20">
                <svg className="w-3.5 h-3.5 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] text-[#6B7280] group-hover:text-[#9CA3AF]">Thành viên</p>
                <p className="text-[13px] font-semibold text-[#E5E7EB]">{currentWorkspace?.memberCount || 1} Members</p>
              </div>
              <svg className="w-3 h-3 text-[#4B5563] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>


        {/* Theme Switcher */}
        <div className="mb-3">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="w-full flex items-center justify-between rounded-lg bg-[#111218] border border-[#1F2230] px-3 py-2 text-[12px] text-[#9CA3AF] hover:bg-[#1A1D24] transition-all"
          >
            <div className="flex items-center gap-2">
              <span>{themeMeta[theme].icon}</span>
              <span>{themeMeta[theme].label}</span>
            </div>
            <span className="text-[10px]">{showThemePicker ? '▲' : '▼'}</span>
          </button>

          {showThemePicker && (
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-[#111218] border border-[#1F2230] p-1">
              {(['light', 'dark', 'auto'] as Theme[]).map((item) => (
                <button
                  key={item}
                  onClick={() => selectTheme(item)}
                  className={`flex h-8 items-center justify-center rounded-md text-[11px] font-medium transition-all ${
                    theme === item
                      ? 'bg-[#7C3AED] text-white'
                      : 'text-[#6B7280] hover:bg-[#1F2230] hover:text-[#9CA3AF]'
                  }`}
                >
                  {themeMeta[item].icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* App Info */}
        <div className="px-2 py-2 text-center">
          <p className="text-[11px] text-[#6B7280]">Zenvy Browser</p>
          <p className="text-[10px] text-[#4B5563]">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ 
  icon, 
  label, 
  active = false, 
  onClick, 
  chevron, 
  chevronOpen 
}: { 
  icon: string
  label: string
  active?: boolean
  onClick?: () => void
  chevron?: boolean
  chevronOpen?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`relative z-10 w-full flex items-center gap-3 rounded-lg px-4 py-3 text-[14px] font-semibold transition-all cursor-pointer ${
        active
          ? 'bg-[#10233D] text-[#60A5FA]'
          : 'text-[#9AA8B8] hover:bg-white/5 hover:text-[#E5E7EB]'
      }`}
      style={{ pointerEvents: 'auto' }}
    >
      <span className={`w-5 text-center ${active ? 'text-[#60A5FA]' : 'text-[#9AA8B8]'}`}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {chevron && (
        <svg
          className={`w-3 h-3 transition-transform ${chevronOpen ? 'rotate-180' : ''} ${
            active ? 'text-[#7C3AED]' : 'text-[#6B7280]'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  )
}

function SubNavItem({ 
  label, 
  active, 
  onClick 
}: { 
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-all ${
        active 
          ? 'bg-white/5 text-[#E5E7EB] font-medium' 
          : 'text-[#6B7280] hover:bg-white/5 hover:text-[#9CA3AF]'
      }`}
    >
      <span className={`w-1 h-1 rounded-full ${active ? 'bg-[#7C3AED]' : 'bg-[#4B5563]'}`} />
      {label}
    </button>
  )
}
