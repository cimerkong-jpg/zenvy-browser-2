import { useState } from 'react'
import { useTheme, type Theme } from '../store/useTheme'
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
  const [showThemePicker, setShowThemePicker] = useState(false)

  const selectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme)
    setShowThemePicker(false)
  }

  const currentLogo = resolvedTheme === 'light' ? zenvyLogoLight : zenvyLogoDark

  return (
    <aside className="w-full h-full flex flex-col bg-[#0B0B0F] border-r border-[#1F2230]">
      {/* Drag region */}
      <div className="drag-region h-3 flex-shrink-0" />

      {/* Scrollable content */}
      <div className="no-drag min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        {/* Logo */}
        <div className="mb-6 px-2 py-2">
          <img
            src={currentLogo}
            alt="Zenvy"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="space-y-1 mb-8">
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
        <div className="mb-8">
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

        {/* Theme Switcher */}
        <div className="mb-4">
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
      className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] font-medium transition-all ${
        active
          ? 'bg-white/10 text-[#E5E7EB]'
          : 'text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB]'
      }`}
    >
      <span className={`w-5 text-center ${active ? 'text-[#7C3AED]' : 'text-[#6B7280]'}`}>
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
