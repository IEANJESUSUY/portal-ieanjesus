import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, BellRing, CheckCheck, Info, ListTodo, X } from 'lucide-react'
import {
  type AlertLevel,
  disableNotifications,
  enableNotifications,
  markAlertsRead,
  notificationsEnabled,
  notificationsSupported,
  showNotification,
  useAlerts
} from '../alerts'

const GROUPS: Array<{ level: AlertLevel; title: string; icon: typeof Bell }> = [
  { level: 'urgent', title: 'Atender ya', icon: AlertTriangle },
  { level: 'todo', title: 'Para hacer', icon: ListTodo },
  { level: 'news', title: 'Novedades', icon: Info }
]

// Campanita de avisos: lo que necesita atención en este espacio, con acceso directo a cada cosa.
export function NotificationBell() {
  const { alerts, read } = useAlerts()
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(notificationsEnabled())
  const [message, setMessage] = useState('')
  const wrapper = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const unread = alerts.filter(a => !read.has(a.id)).length
  const urgent = alerts.some(a => a.level === 'urgent' && !read.has(a.id))

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (!panel.current?.contains(target) && !wrapper.current?.contains(target)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  async function togglePhone() {
    setMessage('')
    try {
      if (enabled) {
        disableNotifications()
        setEnabled(false)
        setMessage('Listo: los avisos quedan solo en la campanita.')
      } else {
        await enableNotifications()
        setEnabled(true)
        setMessage('¡Activado! Los avisos importantes van a llegar como notificación.')
      }
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  return (
    <div className="bell" ref={wrapper}>
      <button
        type="button"
        className={`bell-button${urgent ? ' urgent' : ''}`}
        aria-label={unread ? `Avisos: ${unread} sin leer` : 'Avisos'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {unread ? <BellRing size={19} /> : <Bell size={19} />}
        {unread > 0 && <span className="bell-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {/* El panel va directo sobre la página: la barra de arriba no lo recorta ni lo tapa. */}
      {open && createPortal(
        <div className="bell-panel" role="dialog" aria-label="Avisos" ref={panel}>
          <header>
            <strong>Avisos</strong>
            <div>
              {unread > 0 && (
                <button type="button" className="bell-link" onClick={() => markAlertsRead()}>
                  <CheckCheck size={16} /> Marcar todo como leído
                </button>
              )}
              <button type="button" className="bell-close" aria-label="Cerrar avisos" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
          </header>
          <div className="bell-list">
            {!alerts.length && <p className="bell-empty">Todo al día. Cuando algo necesite atención, aparece acá.</p>}
            {GROUPS.map(({ level, title, icon: Icon }) => {
              const items = alerts.filter(a => a.level === level)
              if (!items.length) return null
              return (
                <section key={level} className={`bell-group ${level}`}>
                  <h4><Icon size={15} /> {title}</h4>
                  {items.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={`bell-item${read.has(a.id) ? '' : ' unread'}`}
                      onClick={() => {
                        markAlertsRead([a.id])
                        setOpen(false)
                        if (a.to) navigate(a.to)
                      }}
                    >
                      <strong>{a.title}</strong>
                      <span>{a.body}</span>
                    </button>
                  ))}
                </section>
              )
            })}
          </div>
          <footer>
            {notificationsSupported() ? (
              <>
                <label className="bell-toggle">
                  <input type="checkbox" checked={enabled} onChange={() => void togglePhone()} />
                  <span>Avisarme también en el celular</span>
                </label>
                {enabled && (
                  <button type="button" className="bell-link" onClick={() => showNotification('Prueba del Portal', 'Así llegan los avisos importantes. ¡Dios te bendiga!', '/').catch(e => setMessage((e as Error).message))}>
                    Probar una notificación
                  </button>
                )}
              </>
            ) : (
              <small>Para recibir avisos en el celular, instalá el Portal como aplicación.</small>
            )}
            {message && <small className="bell-message" role="status">{message}</small>}
          </footer>
        </div>,
        document.body
      )}
    </div>
  )
}
