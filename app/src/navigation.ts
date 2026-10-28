// Menú de las congregaciones y lugares de predicación: cinco secciones con nombres de lo que se hace.
// Cada sección agrupa pantallas que antes eran entradas separadas del menú.

export type NavTab = { to: string; label: string }
export type NavGroup = { to: string; label: string; short: string; tabs: NavTab[] }

export const isLocalWorkspace = (type?: string) => type === 'church' || type === 'preaching_place'

export function localGroups(type?: string): NavGroup[] {
  return [
    { to: '/', label: 'Inicio', short: 'Inicio', tabs: [] },
    {
      to: '/personas',
      label: 'Personas',
      short: 'Personas',
      tabs: [
        { to: '/personas', label: 'Personas' },
        ...(type === 'church' ? [{ to: '/celulas', label: 'Células' }] : []),
        { to: '/comites', label: 'Comités' }
      ]
    },
    {
      to: '/cultos',
      label: 'Cultos y agenda',
      short: 'Cultos',
      tabs: [
        { to: '/cultos', label: 'Cultos y listas' },
        { to: '/calendario', label: 'Calendario' }
      ]
    },
    { to: '/finanzas', label: 'Dinero', short: 'Dinero', tabs: [] },
    {
      to: '/informes',
      label: 'Informes y pedidos',
      short: 'Informes',
      tabs: [
        { to: '/informes', label: 'Informes' },
        { to: '/tareas', label: 'Pedidos de comités' }
      ]
    }
  ]
}

export function groupForPath(path: string, type?: string) {
  return localGroups(type).find(group => group.to === path || group.tabs.some(tab => tab.to === path))
}
