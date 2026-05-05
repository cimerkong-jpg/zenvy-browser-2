import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import ProfilesPage from './pages/ProfilesPage'
import AutomationPage from './pages/AutomationPage'
import SyncPage from './pages/SyncPage'
import ExtensionPage from './pages/ExtensionPage'
import MembersPage from './pages/MembersPage'
import SettingsPage from './pages/SettingsPage'
import ToastContainer from './components/ToastContainer'
import TemplateManager from './components/TemplateManager'

export type Page = 'profiles' | 'automation' | 'sync' | 'extensions' | 'members' | 'settings'
export type AutoSub = 'scripts' | 'scheduler' | 'history'

export default function App() {
  const loadAll = useStore((s) => s.loadAll)
  const syncRunning = useStore((s) => s.syncRunning)
  const setupStatusListener = useStore((s) => s.setupStatusListener)
  const [activePage, setActivePage] = useState<Page>('profiles')
  const [autoSub, setAutoSub] = useState<AutoSub>('scripts')
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const sidebarWidthRef = useRef(sidebarWidth)
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  // Load data on mount
  useEffect(() => {
    loadAll()
    syncRunning()
    const unsubscribe = setupStatusListener()
    return () => { unsubscribe() }
  }, [loadAll, syncRunning, setupStatusListener])

  const navigateTo = (page: Page) => {
    setActivePage(page)
    if (page === 'automation') setAutoSub('scripts')
  }

  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidthRef.current
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(180, Math.min(320, startW + ev.clientX - startX))
      sidebarWidthRef.current = next
      setSidebarWidth(next)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="mesh-bg flex h-screen w-screen overflow-hidden">
      <div className="relative flex-shrink-0" style={{ width: sidebarWidth }}>
        <Sidebar
          activePage={activePage}
          onNavigate={navigateTo}
          autoSub={autoSub}
          onAutoSubChange={(sub) => { setActivePage('automation'); setAutoSub(sub) }}
          onOpenTemplateManager={() => setShowTemplateManager(true)}
        />
        {/* Sidebar resize handle */}
        <div
          onMouseDown={startSidebarResize}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-30 hover:bg-purple-500/40 transition-colors group/sr"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-purple-500/0 group-hover/sr:bg-purple-500/60 transition-colors" />
        </div>
      </div>
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activePage === 'profiles' && <ProfilesPage />}
        {activePage === 'automation' && <AutomationPage subPage={autoSub} />}
        {activePage === 'sync' && <SyncPage />}
        {activePage === 'extensions' && <ExtensionPage />}
        {activePage === 'members' && <MembersPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
      <ToastContainer />
      {showTemplateManager && (
        <TemplateManager onClose={() => setShowTemplateManager(false)} />
      )}
    </div>
  )
}
