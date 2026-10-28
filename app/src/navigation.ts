// Menú de cada espacio: cinco secciones con nombres de lo que se hace.
// Cada sección agrupa pantallas que antes eran entradas separadas del menú; se ven como pestañas arriba.
// La comunicación se hace por WhatsApp, así que no hay sección de mensajes.

export type NavTab = { to: string; label: string }
export type NavGroup = { to: string; label: string; short: string; tabs: NavTab[]; also?: string[] }

export const isLocalWorkspace = (type?: string) => type === 'church' || type === 'preaching_place'

export function localGroups(type?: string): NavGroup[] {
  return [
    { to: '/', label: 'Inicio', short: 'Inicio', tabs: [] },
    {
      to: '/personas',
      label: 'Personas',
      short: 'Personas',
      also: ['/familias'],
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

const nationalGroups: NavGroup[] = [
  { to: '/', label: 'Inicio', short: 'Inicio', tabs: [] },
  {
    to: '/iglesias',
    label: 'Iglesias y personas',
    short: 'Iglesias',
    also: ['/familias'],
    tabs: [
      { to: '/iglesias', label: 'Iglesias' },
      { to: '/personas', label: 'Personas' },
      { to: '/celulas', label: 'Células' }
    ]
  },
  {
    to: '/comites',
    label: 'Comités y agenda',
    short: 'Comités',
    also: ['/cultos'],
    tabs: [
      { to: '/comites', label: 'Comités' },
      { to: '/calendario', label: 'Calendario' }
    ]
  },
  { to: '/finanzas', label: 'Dinero', short: 'Dinero', tabs: [] },
  { to: '/informes', label: 'Informes', short: 'Informes', tabs: [] }
]

const committeeGroups: NavGroup[] = [
  { to: '/', label: 'Inicio del comité', short: 'Inicio', tabs: [] },
  {
    to: '/comites',
    label: 'Actividades y agenda',
    short: 'Actividades',
    tabs: [
      { to: '/comites', label: 'Actividades' },
      { to: '/calendario', label: 'Calendario' }
    ]
  },
  { to: '/personas', label: 'Personas', short: 'Personas', tabs: [] },
  { to: '/finanzas', label: 'Dinero del comité', short: 'Dinero', tabs: [] },
  { to: '/informes', label: 'Informes', short: 'Informes', tabs: [] }
]

export function navGroups(type?: string): NavGroup[] {
  if (type === 'national_committee') return committeeGroups
  if (isLocalWorkspace(type)) return localGroups(type)
  return nationalGroups
}

export function groupForPath(path: string, type?: string) {
  return navGroups(type).find(
    group => group.to === path || group.tabs.some(tab => tab.to === path) || group.also?.includes(path)
  )
}
