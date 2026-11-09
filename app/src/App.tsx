import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { HelpChat } from './components/HelpChat'
import { Sidebar } from './components/Sidebar'
import CRM from './CRM'
import { cloudSignOut } from './cloud'
import { InstallPrompt } from './components/InstallPrompt'

export type Workspace = {
  id: string
  type: string
  name: string
  role?: string
  parentChurchId?: string
  committeeKey?: string
}

export type DemoUser = {
  username: string
  displayName: string
  spaces: Workspace[]
}

function WelcomeSplash({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="welcome-splash" role="status" aria-label="Cargando Portal Nacional">
      <div className="welcome-splash-card">
        <div className="welcome-splash-orbit" aria-hidden="true">
          <span className="welcome-splash-orbit-ring ring-one" />
          <span className="welcome-splash-orbit-ring ring-two" />
          <div className="welcome-splash-logo">
            <img src="./logo-portal-nacional.png" alt="" />
          </div>
        </div>
        <span className="welcome-splash-eyebrow">IEANJESÚS Uruguay · Gestión Eclesiástica y Ministerial</span>
        <strong>Portal Nacional</strong>
        <p className="welcome-splash-subtitle">
          Coordinación nacional, comités ministeriales y administración congregacional unificada
        </p>
        <div className="welcome-splash-loading" aria-hidden="true">
          <span />
          <span />
          <span />
          <small>Preparando tu espacio</small>
        </div>
        <button
          type="button"
          className="welcome-splash-skip"
          onClick={onSkip}
          aria-label="Omitir presentación"
        >
          Omitir
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [introVisible, setIntroVisible] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Estado de usuario y espacio activo
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('pn_official_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(() => {
    try {
      const saved = sessionStorage.getItem('pn_official_workspace')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(false), 1650)
    return () => window.clearTimeout(timer)
  }, [])

  const handleSelectUser = (user: DemoUser | null) => {
    navigate('/')
    setCurrentUser(user)
    if (user) {
      try { sessionStorage.setItem('pn_official_user', JSON.stringify(user)) } catch {}
      if (user.spaces.length === 1) {
        setCurrentWorkspace(user.spaces[0])
        try { sessionStorage.setItem('pn_official_workspace', JSON.stringify(user.spaces[0])) } catch {}
        setShowWorkspacePicker(false)
      } else {
        setShowWorkspacePicker(true)
      }
    } else {
      try {
        sessionStorage.removeItem('pn_official_user')
        sessionStorage.removeItem('pn_official_workspace')
      } catch {}
      setCurrentWorkspace(null)
      setShowWorkspacePicker(false)
    }
  }

  const handleSelectWorkspace = (ws: Workspace) => {
    navigate('/')
    setCurrentWorkspace(ws)
    try { sessionStorage.setItem('pn_official_workspace', JSON.stringify(ws)) } catch {}
    setShowWorkspacePicker(false)
  }

  const handleLogout = () => {
    // Con base central, salir también cierra la sesión del usuario en este dispositivo.
    if (currentUser && (currentUser as any).cloud) void cloudSignOut()
    handleSelectUser(null)
  }

  if (introVisible) return <WelcomeSplash onSkip={() => setIntroVisible(false)} />

  // Si no hay usuario autenticado, renderizar la pantalla de bienvenida y acceso limpia
  if (!currentUser) {
    return (
      <>
        <CRM
          currentUser={null}
          currentWorkspace={null}
          onSelectUser={handleSelectUser}
          onSelectWorkspace={handleSelectWorkspace}
          showWorkspacePicker={false}
          onCloseWorkspacePicker={() => setShowWorkspacePicker(false)}
          onOpenWorkspacePicker={() => setShowWorkspacePicker(true)}
          onLogout={handleLogout}
        />
        <HelpChat />
      </>
    )
  }

  return (
    <div className={`app-shell${menuOpen ? ' menu-open' : ''}`}>
      <div className="mobile-scrim" onClick={() => setMenuOpen(false)} />
      <Sidebar
        workspace={currentWorkspace}
        user={currentUser}
        onSwitchWorkspace={() => setShowWorkspacePicker(true)}
        onOpenMenu={() => setMenuOpen(true)}
        onLogout={handleLogout}
      />
      <section className="workspace">
        <Header
          onMenu={() => setMenuOpen(open => !open)}
          workspace={currentWorkspace}
          user={currentUser}
          onSwitchWorkspace={() => setShowWorkspacePicker(true)}
          onLogout={handleLogout}
        />
        <CRM
          currentUser={currentUser}
          currentWorkspace={currentWorkspace}
          onSelectUser={handleSelectUser}
          onSelectWorkspace={handleSelectWorkspace}
          showWorkspacePicker={showWorkspacePicker}
          onCloseWorkspacePicker={() => setShowWorkspacePicker(false)}
          onOpenWorkspacePicker={() => setShowWorkspacePicker(true)}
          onLogout={handleLogout}
        />
        <HelpChat
          workspaceName={currentWorkspace?.name || 'Administración Nacional'}
          local={['church', 'preaching_place'].includes(currentWorkspace?.type || '')}
        />
        <InstallPrompt />
      </section>
    </div>
  )
}
