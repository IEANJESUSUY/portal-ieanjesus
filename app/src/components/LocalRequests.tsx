import { ArrowRight, Inbox } from 'lucide-react'
import { NATIONAL_COMMITTEES } from '../../shared/catalog.mjs'
import { formatDate, type Row, type State } from '../utils'

const OPEN = ['Pendiente', 'Iniciada', 'Observada']

const committeeName = (key?: string) =>
  key === 'nacional' ? 'Administración Nacional' : NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === key)?.name || 'Comité nacional'

function statusOf(status?: string) {
  if (status === 'Aprobada') return { text: 'Recibido ✓', tone: 'ok', action: 'Ver respuesta' }
  if (status === 'Enviada' || status === 'Corregida') return { text: 'Respondido', tone: 'sent', action: 'Ver o cambiar' }
  if (status === 'Observada') return { text: 'Te piden un cambio', tone: 'warn', action: 'Corregir' }
  return { text: 'Por responder', tone: 'open', action: 'Responder' }
}

// Lo que los comités nacionales le piden a la congregación. Responder abre el paso guiado del Inicio.
export function LocalRequests({ state, assignments, onAnswer }: { state: State; assignments: Row[]; onAnswer: (id: string) => void }) {
  const open = assignments.filter(a => OPEN.includes(a.status || 'Pendiente'))
  const closed = assignments.filter(a => !OPEN.includes(a.status || 'Pendiente'))
  const card = (a: Row) => {
    const activity = state.nationalActivities.find(x => x.id === a.activityId)
    const status = statusOf(a.status)
    const days = activity?.deadline
      ? Math.ceil((new Date(`${activity.deadline}T12:00:00`).getTime() - new Date().setHours(12, 0, 0, 0)) / 86400000)
      : null
    return (
      <article key={a.id} className={`request-card ${status.tone}`}>
        <div className="request-card-head">
          <span>{committeeName(activity?.committeeKey)}</span>
          <span className={`qm-status ${status.tone}`}>{status.text}</span>
        </div>
        <h3>{activity?.name || a.name || 'Pedido'}</h3>
        <p>{activity?.instructions || activity?.description || 'El comité pide que le cuenten cómo fue esta actividad.'}</p>
        {OPEN.includes(a.status || 'Pendiente') && activity?.deadline && (
          <small className={days !== null && days < 0 ? 'late' : days !== null && days <= 7 ? 'soon' : ''}>
            {days === null ? '' : days < 0 ? `Venció el ${formatDate(activity.deadline)}` : days === 0 ? 'Vence hoy' : `Para el ${formatDate(activity.deadline)} · quedan ${days} días`}
          </small>
        )}
        <button type="button" className={OPEN.includes(a.status || 'Pendiente') ? 'primary-action' : 'secondary-action'} onClick={() => onAnswer(a.id)}>
          {status.action} <ArrowRight size={16} />
        </button>
      </article>
    )
  }
  return (
    <section className="local-requests">
      <header className="workspace-title">
        <div>
          <span className="eyebrow">Comités nacionales</span>
          <h2>Pedidos de los comités</h2>
          <p>Lo que te piden y para cuándo. Si ya anotaste la actividad, la respuesta viene completa.</p>
        </div>
      </header>
      {open.length > 0 ? (
        <div className="request-grid">{open.map(card)}</div>
      ) : (
        <div className="friendly-empty local-empty">
          <Inbox size={22} />
          <strong>No hay nada pendiente</strong>
          <p>Cuando un comité pida algo, aparece acá y en el Inicio.</p>
        </div>
      )}
      {closed.length > 0 && (
        <details className="request-history">
          <summary>Pedidos ya respondidos ({closed.length})</summary>
          <div className="request-grid">{closed.map(card)}</div>
        </details>
      )}
    </section>
  )
}
