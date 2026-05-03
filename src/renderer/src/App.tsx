import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import ProfilesPage from './pages/ProfilesPage'

export default function App() {
  const loadAll = useStore((s) => s.loadAll)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <div className="mesh-bg flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <ProfilesPage />
      </main>
    </div>
  )
}
