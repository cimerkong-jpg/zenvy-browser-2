import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import ProfilesPage from './pages/ProfilesPage'

export default function App() {
  const loadAll = useStore((s) => s.loadAll)
  const syncRunning = useStore((s) => s.syncRunning)
  const setupStatusListener = useStore((s) => s.setupStatusListener)

  useEffect(() => {
    // Load all data
    loadAll()
    
    // Sync running profiles (check actual processes)
    syncRunning()
    
    // Setup listener for status changes
    const unsubscribe = setupStatusListener()
    
    return () => {
      unsubscribe()
    }
  }, [loadAll, syncRunning, setupStatusListener])

  return (
    <div className="mesh-bg flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <ProfilesPage />
      </main>
    </div>
  )
}
