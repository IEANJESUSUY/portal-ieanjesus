import {
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Network,
  RefreshCw,
  Settings,
  Sparkles,
  UsersRound,
  Zap
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

export type SidebarProps = {
  workspace?: { id: string; type: string; name: string; role?: string } | null
  user?: { username: string; displayName: string } | null
  onSwitchWorkspace?: () => void
  onOpenMenu?: () => void
  onLogout?: () => void
}

export function Sidebar({ workspace, user, onSwitchWorkspace, onOpenMenu, onLogout }: SidebarProps) {
  const type = workspace?.type || 'national_admin'

  let items = [
    { to: '/', label: 'Inicio', icon: LayoutDashboard },
    { to: '/iglesias', label: 'Iglesias', icon: Building2 },
    { to: '/personas', label: 'Personas y familias', icon: UsersRound },
    { to: '/cultos', label: 'Cultos y asistencia', icon: ClipboardCheck },
    { to: '/finanzas', label: 'Finanzas', icon: CircleDollarSign },
    { to: '/celulas', label: 'Células', icon: Boxes },
    { to: '/calendario', label: 'Calendario', icon: CalendarDays },
    { to: '/comites', label: 'Comités', icon: Network },
    { to: '/informes', label: 'Informes', icon: BarChart3 },
    { to: '/comunicacion', label: 'Comunicación', icon: MessageSquare }
  ]

  if (type === 'national_admin') {
    items = [
      { to: '/', label: 'Inicio', icon: LayoutDashboard },
      { to: '/iglesias', label: 'Iglesias', icon: Building2 },
      { to: '/personas', label: 'Personas y familias', icon: UsersRound },
      { to: '/finanzas', label: 'Finanzas', icon: CircleDollarSign },
      { to: '/celulas', label: 'Células', icon: Boxes },
      { to: '/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/comites', label: 'Comités', icon: Network },
      { to: '/informes', label: 'Informes', icon: BarChart3 },
      { to: '/comunicacion', label: 'Comunicación', icon: MessageSquare }
    ]
  } else if (type === 'national_committee') {
    items = [
      { to: '/', label: 'Panel del comité', icon: LayoutDashboard },
      { to: '/comites', label: 'Actividades y matriz', icon: Sparkles },
      { to: '/personas', label: 'Personas', icon: UsersRound },
      { to: '/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/finanzas', label: 'Finanzas del comité', icon: CircleDollarSign },
      { to: '/informes', label: 'Informes', icon: BarChart3 },
      { to: '/comunicacion', label: 'Comunicación', icon: MessageSquare }
    ]
  } else if (type === 'preaching_place') {
    items = [
      { to: '/', label: 'Inicio', icon: LayoutDashboard },
      { to: '/personas', label: 'Personas vinculadas', icon: UsersRound },
      { to: '/cultos', label: 'Cultos y asistencia', icon: ClipboardCheck },
      { to: '/finanzas', label: 'Ofrendas', icon: CircleDollarSign },
      { to: '/tareas', label: 'Tareas y actividades', icon: Sparkles },
      { to: '/comites', label: 'Comités locales', icon: Network },
      { to: '/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/informes', label: 'Informes', icon: BarChart3 },
      { to: '/comunicacion', label: 'Comunicación', icon: MessageSquare }
    ]
  } else if (type === 'church') {
    items = [
      { to: '/', label: 'Inicio', icon: LayoutDashboard },
      { to: '/personas', label: 'Personas y familias', icon: UsersRound },
      { to: '/cultos', label: 'Cultos y asistencia', icon: ClipboardCheck },
      { to: '/finanzas', label: 'Finanzas locales', icon: CircleDollarSign },
      { to: '/celulas', label: 'Células', icon: Boxes },
      { to: '/tareas', label: 'Tareas', icon: Sparkles },
      { to: '/comites', label: 'Comités locales', icon: Network },
      { to: '/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/informes', label: 'Informes', icon: BarChart3 },
      { to: '/comunicacion', label: 'Comunicación', icon: MessageSquare }
    ]
  }

  const primaryMobileRoutes = type === 'national_committee' ? ['/', '/comites', '/finanzas', '/informes'] : type === 'national_admin' ? ['/', '/personas', '/finanzas', '/informes'] : ['/', '/cultos', '/finanzas', '/informes']
  const mobileItems = primaryMobileRoutes.map(route => items.find(item => item.to === route)).filter(Boolean) as typeof items
  const shortLabel: Record<string, string> = { '/': 'Inicio', '/personas': 'Personas', '/cultos': 'Asistencia', '/finanzas': 'Finanzas', '/informes': 'Informes', '/comites': type === 'national_committee' ? 'Actividades' : 'Comités' }

  return (
    <>
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><img src="./logo-portal-nacional.png" alt="Logo Portal Nacional" /></div>
        <div>
          <strong>Portal Nacional</strong>
          <span>{workspace?.name || 'Administración'}</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Navegación principal">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {['church', 'preaching_place'].includes(type) && (
          <button
            type="button"
            className="nav-item quick-mode-sidebar"
            onClick={() => window.dispatchEvent(new Event('portal:quick-mode'))}
          >
            <Zap size={19} />
            <span>Modo rápido</span>
          </button>
        )}
        <NavLink to="/configuracion" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Settings size={19} />
          <span>Configuración</span>
        </NavLink>

        <div className="user-chip">
          <div className="avatar">
            {user ? user.displayName.slice(0, 2).toUpperCase() : 'PN'}
          </div>
          <div className="user-chip-info">
            <strong>{user ? user.displayName : 'Sin sesión'}</strong>
            <span title={`${workspace?.role ? `${workspace.role} · ` : ''}${workspace?.name || 'Local'}`}>
              {workspace?.role ? `${workspace.role} · ` : ''}{workspace?.name || 'Local'}
            </span>
          </div>
          {onSwitchWorkspace && (
            <button
              type="button"
              onClick={onSwitchWorkspace}
              title="Cambiar espacio"
              className="user-chip-btn"
              aria-label="Cambiar espacio"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>
    </aside>
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
      {mobileItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={`mobile-${to}`}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `mobile-bottom-item${isActive ? ' active' : ''}`}
          // En el celular, "Inicio" de una congregación vuelve al Modo rápido.
          onClick={to === '/' && ['church', 'preaching_place'].includes(type) ? () => window.dispatchEvent(new Event('portal:quick-mode')) : undefined}
        >
          <Icon size={19} strokeWidth={1.9} /><span>{shortLabel[to] || label}</span>
        </NavLink>
      ))}
      <button type="button" className="mobile-bottom-item" onClick={onOpenMenu}><Menu size={19} /><span>Más</span></button>
    </nav>
    </>
  )
}
