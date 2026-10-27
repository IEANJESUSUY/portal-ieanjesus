import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut, Menu, RefreshCw, Search, X } from 'lucide-react'

export type HeaderProps = {
  onMenu: () => void
  workspace?: { id: string; type: string; name: string; role?: string } | null
  user?: { username: string; displayName: string } | null
  onSwitchWorkspace?: () => void
  onLogout?: () => void
}

export function Header({ onMenu, workspace, user, onSwitchWorkspace, onLogout }: HeaderProps) {
  const navigate = useNavigate()
  const [actionQuery, setActionQuery] = useState('')
  const [finderOpen, setFinderOpen] = useState(false)
  const getBadgeClass = (type?: string) => {
    if (type === 'preaching_place') return 'ws-badge preaching'
    if (type === 'national_committee') return 'ws-badge committee'
    if (type === 'national_admin') return 'ws-badge admin'
    return 'ws-badge church'
  }

  const getWorkspaceTypeLabel = (type?: string) => {
    if (type === 'preaching_place') return 'Lugar de Predicación'
    if (type === 'national_committee') return 'Comité Nacional'
    if (type === 'national_admin') return 'Administración Nacional'
    return 'Congregación Local'
  }

  const actions = [
    { title: 'Registrar un ingreso', description: 'Guardar diezmo, ofrenda o donación', href: '/finanzas?accion=ingreso', keywords: 'dinero finanzas diezmo diezmos ofrenda ofrendas donacion donaciones aporte caja entrada cobrar recibir' },
    { title: 'Registrar un gasto', description: 'Guardar una compra, pago o egreso', href: '/finanzas?accion=egreso', keywords: 'dinero finanzas gasto egreso compra compras pago pagos factura salida pagar tesorero' },
    { title: 'Agregar una persona', description: 'Crear una ficha o registrar un visitante', href: '/personas?accion=persona', keywords: 'persona personas miembro miembros hermano hermanos familia familias visitante visitas amigo agregar registro ficha contacto joven jovenes juventud juvenil juveniles adolescente adolescentes nino ninos adulto' },
    { title: 'Buscar personas', description: 'Encontrar una ficha por nombre o grupo', href: '/personas', keywords: 'buscar personas miembros directorio hermanos familia jovenes juventud juvenil adolescentes' },
    { title: 'Pasar asistencia', description: 'Abrir la lista del encuentro de hoy', href: '/cultos?pasar=hoy', keywords: 'asistencia asistencias lista listas presentes culto reunion encuentro domingo jueves jovenes joven juvenil' },
    { title: 'Crear un evento', description: 'Agregar una actividad al calendario', href: '/calendario?accion=evento', keywords: 'calendario evento eventos actividad actividades crear fecha campamento convencion ayuno devocional evangelismo capacitacion online presencial culto jovenes juventud' },
    { title: 'Revisar tareas', description: 'Ver entregas y asuntos pendientes', href: '/tareas', keywords: 'tarea tareas pendiente pendientes asignacion asignaciones entrega entregas revisar seguimiento comite jovenes' },
    { title: 'Abrir informes', description: 'Preparar, entregar o revisar informes', href: '/informes', keywords: 'informe informes reporte reportes mensual mensuales cuatrimestral periodo recepcion supervision nacional' },
    { title: 'Abrir comité de Jóvenes', description: 'Ver actividades, reuniones y seguimiento juvenil', href: '/comites?comite=jovenes', keywords: 'joven jovenes juventud juvenil juveniles adolescente adolescentes retiro campamento comite ministerio actividades reunion encuentro' },
    { title: 'Abrir comités', description: 'Consultar actividades y respuestas', href: '/comites', keywords: 'comite comites ministerio damas musica misiones caballeros escuela dominical obra social' },
    { title: 'Abrir comunicación', description: 'Ir a los chats y canales', href: '/comunicacion', keywords: 'chat chats mensaje mensajes comunicacion escribir consulta avisos canal' },
    { title: 'Cambiar de espacio', description: 'Elegir otra congregación de preparación local', href: '__workspace__', keywords: 'iglesia congregacion espacio perfil cambiar pastor secretaria secretario tesorero' }
  ]

  const matchingActions = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
    const normalized = normalize(actionQuery.trim())
    const availableActions = actions.filter(
      action => action.href !== '/cultos?pasar=hoy' || workspace?.type !== 'national_admin'
    )
    const terms = normalized.split(/\s+/).filter(term => term.length > 1)
    return availableActions
      .map((action, index) => {
        const searchable = normalize(`${action.title} ${action.description} ${action.keywords}`)
        const words = searchable.split(/[^a-z0-9]+/).filter(Boolean)
        const score = !normalized
          ? 1
          : searchable.includes(normalized)
            ? 100 + normalized.length
            : terms.reduce((total, term) => {
                if (searchable.includes(term)) return total + 10
                if (words.some(word => word.startsWith(term) || (term.length >= 5 && term.startsWith(word)))) return total + 5
                return total
              }, 0)
        return { action, index, score }
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 7)
      .map(result => result.action)
  }, [actionQuery, workspace?.type])

  const runAction = (href: string) => {
    setFinderOpen(false)
    setActionQuery('')
    if (href === '__workspace__') {
      onSwitchWorkspace?.()
      return
    }
    navigate(href)
  }

  return (
    <header className="topbar">
      <div className="greeting">
        <button className="mobile-menu" onClick={onMenu} aria-label="Abrir menú">
          <Menu size={22} />
        </button>
        <div>
          <p>{getWorkspaceTypeLabel(workspace?.type)}</p>
          <h1>{workspace?.name || 'Portal Nacional'}</h1>
        </div>
      </div>

      <div className="action-finder">
        <label className="action-finder-input">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar qué hacer"
            placeholder="¿Qué necesitas hacer?"
            value={actionQuery}
            onFocus={() => setFinderOpen(true)}
            onChange={event => {
              setActionQuery(event.target.value)
              setFinderOpen(true)
            }}
            onKeyDown={event => {
              if (event.key === 'Escape') setFinderOpen(false)
              if (event.key === 'Enter' && matchingActions[0]) runAction(matchingActions[0].href)
            }}
          />
          {actionQuery && (
            <button type="button" aria-label="Limpiar búsqueda" onClick={() => setActionQuery('')}>
              <X size={15} />
            </button>
          )}
        </label>
        {finderOpen && (
          <div className="action-finder-results" role="listbox" aria-label="Acciones sugeridas">
            <span className="action-finder-heading">{actionQuery ? 'Acciones que coinciden' : 'Accesos frecuentes'}</span>
            {matchingActions.map(action => (
              <button
                key={action.title}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={event => event.preventDefault()}
                onClick={() => runAction(action.href)}
              >
                <span><strong>{action.title}</strong><small>{action.description}</small></span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
            {!matchingActions.length && <p>No encontré una coincidencia exacta. Prueba con “jóvenes”, “asistencia”, “diezmo” o “informe”.</p>}
            <button type="button" className="action-finder-dismiss" onMouseDown={event => event.preventDefault()} onClick={() => setFinderOpen(false)}>
              Cerrar sugerencias
            </button>
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {workspace && (
          <div className="ws-bar">
            {onSwitchWorkspace && (
              <button
                type="button"
                className="secondary-action"
                style={{ minHeight: 32, padding: '4px 10px', fontSize: '.75rem' }}
                onClick={onSwitchWorkspace}
                title="Cambiar de espacio de trabajo sin cerrar sesión"
              >
                <RefreshCw size={13} style={{ marginRight: 4 }} />
                Cambiar espacio
              </button>
            )}
          </div>
        )}

        {user && onLogout && (
          <button
            type="button"
            className="round-button"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            style={{ width: 38, height: 38 }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  )
}
