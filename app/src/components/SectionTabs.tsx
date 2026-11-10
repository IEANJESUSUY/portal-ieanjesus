import { NavLink } from 'react-router-dom'
import { groupForPath } from '../navigation'
import { useActiveRole } from '../roles'

// Pestañas dentro de una sección del menú (por ejemplo, Personas · Células · Comités).
export function SectionTabs({ path, wsType }: { path: string; wsType: string }) {
  const group = groupForPath(path, wsType, useActiveRole())
  if (!group || group.tabs.length < 2) return null
  return (
    <nav className="section-tabs" aria-label={group.label}>
      {group.tabs.map(tab => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
