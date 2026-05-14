import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../store/useAuth'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import type { Page } from '../App'

interface TopbarProps {
  activePage: Page
  onNavigate: (page: Page) => void
}

function TopNavButton({
  active,
  title,
  children,
  onClick,
}: {
  active?: boolean
  title: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto', cursor: 'pointer' } as any}
      className={`flex h-9 items-center rounded-md px-4 text-sm font-bold transition-all ${
        active ? 'bg-[#1B2A42] text-white' : 'text-white hover:bg-white/5'
      }`}
      title={title}
    >
      {children}
    </button>
  )
}

export default function Topbar({ activePage, onNavigate }: TopbarProps) {
  const { user, signOut } = useAuth()
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  return (
    <div className="drag-region flex h-[88px] flex-shrink-0 items-center justify-between bg-[#0E141C] px-10 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
      <div className="no-drag flex items-center gap-5">
        <WorkspaceSwitcher />
        <nav className="flex items-center gap-2">
          <TopNavButton active={activePage === 'workspace-settings'} title="Cài đặt workspace" onClick={() => onNavigate('workspace-settings')}>
            Cài Đặt Workspace
          </TopNavButton>
          <TopNavButton title="Nạp tiền">Nạp Tiền</TopNavButton>
          <TopNavButton title="Mua gói">Mua Gói</TopNavButton>
          <TopNavButton title="Kênh hỗ trợ">Kênh Hỗ Trợ</TopNavButton>
          <TopNavButton title="Tiếp thị liên kết">Tiếp Thị Liên Kết</TopNavButton>
        </nav>
      </div>

      <div className="no-drag flex items-center gap-4">
        {user && (
          <>
            <span className="flex h-6 w-8 items-center justify-center rounded bg-red-600 text-sm">★</span>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white" title="Thông báo">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M9 17V9a3 3 0 016 0v8M7 17h10l-1.2-1.6A3 3 0 0115.2 14V9a3.2 3.2 0 00-6.4 0v5a3 3 0 01-.6 1.8L7 17z" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B3D] text-[10px] font-bold text-white">1</span>
            </button>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white" title="Cài đặt nhanh">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FF6B3D]" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-[#183449] bg-[#06A9D8] text-lg font-bold text-white transition-all hover:scale-105"
              >
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </button>

              {showAccountMenu && createPortal(
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
                  <div className="fixed z-50 w-64 rounded-lg border border-[#2A3545] bg-[#1B2330] p-2 shadow-xl" style={{ top: '74px', right: '32px' }}>
                    <div className="mb-2 border-b border-[#2A3545] px-3 py-2">
                      <p className="text-[11px] text-[#7C8796]">Tài khoản</p>
                      <p className="truncate text-[13px] font-medium text-white" title={user.email}>{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAccountMenu(false)
                        onNavigate('settings')
                      }}
                      className="mb-2 w-full rounded-md px-3 py-2 text-left text-[12px] font-medium text-[#D7DEE8] hover:bg-white/5"
                    >
                      Cài đặt tài khoản
                    </button>
                    <button
                      onClick={async () => {
                        setShowAccountMenu(false)
                        await signOut()
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-[12px] font-medium text-red-400 hover:bg-red-500/10"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </>,
                document.body
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
