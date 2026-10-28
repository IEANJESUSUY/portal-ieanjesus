import {
  BarChart3,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  Network,
  RefreshCw,
  Settings,
  Sparkles,
  UsersRound
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { groupForPath, navGroups } from '../navigation'

export type SidebarProps = {
  workspace?: { id: string; type: string; name: string; role?: string } | null
  user?: { username: string; displayName: string } | null
  onSwitchWorkspace?: () => void
  onOpenMenu?: () => void
  onLogout?: () => void
}

export function Sidebar({ workspace, user, onSwitchWorkspace }: SidebarProps) {
  const type = workspace?.type || 'national_admin'
  const location = useLocation()

  // Todos los espacios tienen cinco secciones; las pantallas de cada una se ven como pestañas.
  const icons: Record<string, typeof LayoutDashboard> = {
    '/': LayoutDashboard,
    '/personas': UsersRound,
    '/iglesias': Building2,
    '/cultos': ClipboardCheck,
    '/comites': type === 'national_committee' ? Sparkles : Network,
    '/finanzas': CircleDollarSign,
    '/informes': BarChart3
  }
  const groups = navGroups(type)
  const items = groups.map(group => ({ to: group.to, label: group.label, short: group.short, icon: icons[group.to] || LayoutDashboard }))

  // Una sección queda marcada en cualquiera de sus pestañas.
  const activeGroup = groupForPath(location.pathname, type)?.to
  const itemClass = (to: string, base: string) => ({ isActive }: { isActive: boolean }) =>
    `${base}${(activeGroup ? activeGroup === to : isActive) ? ' active' : ''}`

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
            className={itemClass(to, 'nav-item')}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
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
    {/* En el celular las cinco secciones van abajo; configuración y cambiar de espacio quedan en ☰. */}
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
      {items.map(({ to, label, short, icon: Icon }) => (
        <NavLink
          key={`mobile-${to}`}
          to={to}
          end={to === '/'}
          className={itemClass(to, 'mobile-bottom-item')}
        >
          <Icon size={19} strokeWidth={1.9} /><span>{short || label}</span>
        </NavLink>
      ))}
    </nav>
    </>
  )
}
