import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { useWorkspace } from './store/useWorkspace'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ProfilesPage from './pages/ProfilesPage'
import AutomationPage from './pages/AutomationPage'
import SyncPage from './pages/SyncPage'
import ExtensionPage from './pages/ExtensionPage'
import MembersPage from './pages/MembersPage'
import SettingsPage from './pages/SettingsPage'
import WorkspaceSettingsPage from './pages/WorkspaceSettingsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ToastContainer from './components/ToastContainer'
import DialogContainer from './components/DialogContainer'
import TemplateManager from './components/TemplateManager'

export type Page = 'profiles' | 'automation' | 'sync' | 'extensions' | 'members' | 'settings' | 'workspace-settings' | 'login' | 'register'
export type AutoSub = 'scripts' | 'scheduler' | 'history'

export default function App() {
  const loadAll = useStore((s) => s.loadAll)
  const syncRunning = useStore((s) => s.syncRunning)
  const setupStatusListener = useStore((s) => s.setupStatusListener)
  const { initAuth, isAuthenticated, isLoading: authLoading } = useAuth()
  const { loadWorkspaces, ensureDefaultWorkspace, refreshWorkspaceData, currentWorkspaceId } = useWorkspace()
  const [activePage, setActivePage] = useState<Page>('profiles')
  const [autoSub, setAutoSub] = useState<AutoSub>('scripts')
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const sidebarWidthRef = useRef(sidebarWidth)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const workspaceInitializedRef = useRef(false)
  const [workspaceReady, setWorkspaceReady] = useState(false)

  // Initialize auth on mount
  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Reset workspace state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaceReady(false)
      workspaceInitializedRef.current = false
    }
  }, [isAuthenticated])

  // Setup status listener (separate from workspace init)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const unsubscribe = setupStatusListener()
      return () => {
        unsubscribe()
      }
    }
  }, [authLoading, isAuthenticated, setupStatusListener])

  // Initialize workspace after auth is ready
  useEffect(() => {
    if (!authLoading && isAuthenticated && !workspaceInitializedRef.current) {
      workspaceInitializedRef.current = true
      setWorkspaceReady(false) // Not ready yet

      // First ensure default workspace exists and load all workspaces
      ensureDefaultWorkspace()
        .then(() => {
          return loadWorkspaces()
        })
        .then(() => {
          setWorkspaceReady(true) // Now ready - main process is synced
        })
        .catch((error) => {
          console.error('[App] Failed to initialize workspace:', error instanceof Error ? error.message : String(error))
          setWorkspaceReady(false)
          workspaceInitializedRef.current = false // Allow retry
        })
    }
  }, [authLoading, isAuthenticated, ensureDefaultWorkspace, loadWorkspaces])

  // Load data when workspace is ready (after init or when workspace changes)
  useEffect(() => {
    if (isAuthenticated && workspaceReady && currentWorkspaceId) {
      loadAll()
      syncRunning()
    }
  }, [isAuthenticated, workspaceReady, currentWorkspaceId, loadAll, syncRunning])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && activePage !== 'login' && activePage !== 'register') {
      setActivePage('login')
    }
  }, [authLoading, isAuthenticated, activePage])

  // Redirect to profiles after successful login
  useEffect(() => {
    if (isAuthenticated && (activePage === 'login' || activePage === 'register')) {
      setActivePage('profiles')
    }
  }, [isAuthenticated, activePage])

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

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="mesh-bg flex h-screen w-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth pages if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="mesh-bg h-screen w-screen overflow-hidden">
        {activePage === 'register' ? (
          <RegisterPage onNavigateToLogin={() => setActivePage('login')} />
        ) : (
          <LoginPage onNavigateToRegister={() => setActivePage('register')} />
        )}
        <ToastContainer />
      </div>
    )
  }

  // Show main app if authenticated
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121922]">
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
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar activePage={activePage} onNavigate={navigateTo} />
        <main className="min-h-0 flex-1 overflow-hidden">
          {activePage === 'profiles' && <ProfilesPage />}
          {activePage === 'automation' && <AutomationPage subPage={autoSub} />}
          {activePage === 'sync' && <SyncPage />}
          {activePage === 'extensions' && <ExtensionPage />}
          {activePage === 'members' && <MembersPage />}
          {activePage === 'settings' && <SettingsPage />}
          {activePage === 'workspace-settings' && <WorkspaceSettingsPage />}
        </main>
      </div>
      <ToastContainer />
      <DialogContainer />
      {showTemplateManager && (
        <TemplateManager onClose={() => setShowTemplateManager(false)} />
      )}
    </div>
  )
}
