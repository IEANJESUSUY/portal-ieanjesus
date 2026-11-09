import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Network,
  Plus,
  UsersRound,
  Wallet
} from 'lucide-react'
import { CalendarPreviewCard } from './CalendarModule'
import { NationalDashboard } from './NationalDashboard'

type Row = { id: string; [key: string]: any }
type State = Record<string, Row[]>
const dateKey = () => new Date().toLocaleDateString('sv-SE')
const cash = (n: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(n)
const isTitheTransaction = (row: Row) => /diezmo/i.test([row.category, row.name, row.description, row.subCategory].filter(Boolean).join(' '))

export function OperationalHome({
  state,
  scope,
  workspaceName,
  onFinance,
  onPerson,
  onTask
}: {
  state: State
  scope: string
  workspaceName: string
  onFinance: () => void
  onPerson: () => void
  onTask: (task: Row) => void
}) {
  const now = dateKey()
  const local = (rows: Row[]) => rows.filter(r => !scope || r.churchId === scope || r.preachingPlaceId === scope)
  const events = local(state.events).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  const next = events.find(e => e.date >= now)
  const lastAttendance = [...state.attendance]
    .filter(a => events.some(e => e.id === a.eventId))
    .sort((a, b) =>
      String(events.find(e => e.id === b.eventId)?.date).localeCompare(
        String(events.find(e => e.id === a.eventId)?.date)
      )
    )[0]
  const lastEvent = events.find(e => e.id === lastAttendance?.eventId)
  // Ordenar tareas más recientes primero para que nuevas asignaciones aparezcan arriba
  const tasks = local(state.activityAssignments)
    .filter(a => !['Aprobada', 'Enviada', 'Corregida', 'Confirmado', 'Completado'].includes(a.status))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  const movements = local(state.transactions)
    .filter(t => !isTitheTransaction(t))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 4)
  const people = local(state.people)
  const incomplete = people.filter(p => p.status === 'Amigo' && (!p.phone || !p.birthday))
  const birthdays = people
    .filter(p => p.birthday?.slice(5, 7) === now.slice(5, 7))
    .sort((a, b) => a.birthday.slice(8).localeCompare(b.birthday.slice(8)))
    .slice(0, 3)
  const month = now.slice(0, 7)
  const quarter = `${now.slice(0, 4)}-C${Math.floor(new Date().getMonth() / 4) + 1}`
  const reports = local(state.monthlyReports)
  const monthly = reports.find(r => r.month === month)
  const quarterly = reports.find(r => r.month === quarter)
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const dueMonthly =
    new Date().getDate() >= endOfMonth - 4 && !['Enviado', 'Recibido', 'Revisado', 'Confirmado'].includes(monthly?.status)
  const reminder = events.find(
    e =>
      e.date === now &&
      e.time &&
      Date.now() - new Date(`${e.date}T${e.time}`).getTime() >= 3600000 &&
      !state.attendance.some(a => a.eventId === e.id)
  )
  const pendingReports = (state.monthlyReports || []).filter(r => ['Enviado', 'Borrador'].includes(r.status)).length
  const localAttentionCount = tasks.length + Number(dueMonthly) + Number(!!incomplete.length)
  const mainChurches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')

  // --- VISTA PRINCIPAL DE ADMINISTRACIÓN NACIONAL: indicadores y semáforo por congregación ---
  if (!scope) return <NationalDashboard state={state} workspaceName={workspaceName} />
  // --- VISTA OPERATIVA LOCAL DE CONGREGACIÓN / LUGAR DE PREDICACIÓN ---
  return (
    <div className="home-workspace">
      <header className="workspace-title home-today-title">
        <div>
          <span className="eyebrow">Hoy en {workspaceName}</span>
          <h2>Inicio</h2>
          <p>
            ¿Qué necesitas hacer hoy? ·{' '}
            {new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>
      <section className="today-actions" aria-label="Qué necesitas hacer hoy">
        <Link className="today-action attendance" to="/cultos?pasar=hoy">
          <span className="today-action-icon">
            <ClipboardCheck />
          </span>
          <span>
            <strong>{reminder ? 'Completar la asistencia' : 'Pasar lista'}</strong>
            <small>{reminder ? reminder.name : 'Abrir el encuentro de hoy y marcar los nombres'}</small>
          </span>
          <ArrowRight size={21} />
        </Link>
        <button className="today-action" onClick={onFinance}>
          <span className="today-action-icon">
            <Wallet />
          </span>
          <span>
            <strong>Registrar dinero</strong>
            <small>Guardar un ingreso o un gasto</small>
          </span>
          <ArrowRight size={21} />
        </button>
        <button className="today-action" onClick={onPerson}>
          <span className="today-action-icon">
            <UsersRound />
          </span>
          <span>
            <strong>Agregar visitante</strong>
            <small>Guardar sus datos ahora y completar lo demás después</small>
          </span>
          <Plus size={21} />
        </button>
        <Link className="today-action" to="/tareas">
          <span className="today-action-icon">
            <CheckCircle2 />
          </span>
          <span>
            <strong>Ver pendientes</strong>
            <small>
              {localAttentionCount
                ? `${localAttentionCount} ${
                    localAttentionCount === 1 ? 'asunto necesita' : 'asuntos necesitan'
                  } atención`
                : 'No hay nada urgente por completar'}
            </small>
          </span>
          <ArrowRight size={21} />
        </Link>
      </section>
      <div className="today-secondary-actions" aria-label="Otras acciones">
        <Link to="/informes?crear=monthly">
          <FileText size={18} />
          <span>
            <strong>Preparar informe</strong>
            <small>Continuar el informe mensual</small>
          </span>
          <ArrowRight size={18} />
        </Link>
        <Link to="/celulas">
          <CalendarDays size={18} />
          <span>
            <strong>Grupos de amistad</strong>
            <small>Registrar o consultar células</small>
          </span>
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="home-columns">
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Seguimiento</span>
              <h3>Necesita tu atención</h3>
            </div>
            <span className="count-pill">{tasks.length + Number(dueMonthly) + Number(!!incomplete.length)}</span>
          </div>
          {dueMonthly && (
            <Link className="work-row attention-row" to="/informes?crear=monthly">
              <FileText />
              <div>
                <strong>Entregar informe mensual</strong>
                <small>Últimos cinco días del mes · {monthly?.status || 'Pendiente'}</small>
              </div>
              <ArrowRight size={18} />
            </Link>
          )}
          {tasks.slice(0, 4).map(task => {
            const act = state.nationalActivities.find(a => a.id === task.activityId)
            return (
              <button
                className="work-row"
                key={task.id}
                aria-label={task.status === 'Pendiente' ? 'Completar devolución' : 'Ver / modificar devolución'}
                onClick={() => onTask(task)}
              >
                <ClipboardCheck />
                <div>
                  <strong>{act?.name || task.name}</strong>
                  <small>
                    {task.status} · Entrega {act?.deadline || 'sin fecha'}
                  </small>
                </div>
                <ArrowRight size={18} />
              </button>
            )
          })}
          {tasks.length > 4 && (
            <Link className="secondary-action" to="/tareas">
              Ver todas las tareas ({tasks.length})
            </Link>
          )}
          {!!incomplete.length && (
            <Link className="work-row" to="/personas">
              <UsersRound />
              <div>
                <strong>Completar datos de {incomplete.length} amigos</strong>
                <small>Falta el celular o la fecha de nacimiento. Puedes hacerlo después del culto.</small>
              </div>
              <ArrowRight size={18} />
            </Link>
          )}
          {!tasks.length && !dueMonthly && !incomplete.length && (
            <div className="quiet-empty">
              <CheckCircle2 size={26} />
              <strong>Al día</strong>
              <p>Aquí aparecerán las entregas y los registros que necesiten seguimiento.</p>
            </div>
          )}
        </section>

        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Preparar y entregar</span>
              <h3>Tus informes</h3>
            </div>
            <FileText size={21} />
          </div>
          {[
            ['monthly', 'Informe mensual', monthly, month],
            ['quarterly', 'Informe cuatrimestral', quarterly, quarter]
          ].map(([kind, title, record, key]: any) => (
            <Link key={kind} className="work-row report-work-row" to={`/informes?crear=${kind}`}>
              <span className="document-symbol">
                <FileText size={22} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{`${key} · ${record?.status || 'Pendiente'}`}</small>
              </div>
              <ArrowRight size={18} />
            </Link>
          ))}
          <p className="section-footnote">
            La asistencia y las finanzas alimentan ambos informes. Revísalos antes de enviar.
          </p>
        </section>

        {/* Previsualización del calendario local (Lote 4) */}
        <CalendarPreviewCard state={state} wsType="church" scope={scope} />

        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Últimos registros</span>
              <h3>Movimientos recientes</h3>
            </div>
            <Link to="/finanzas">
              Ver finanzas <ArrowRight size={15} />
            </Link>
          </div>
          {movements.length ? (
            movements.map(t => (
              <div className="movement-row" key={t.id}>
                <span className={`movement-mark ${t.direction === 'Egreso' ? 'out' : ''}`}>
                  {t.direction === 'Ingreso' ? '+' : '−'}
                </span>
                <div>
                  <strong>{t.name}</strong>
                  <small>
                    {t.date} · {t.category}
                  </small>
                </div>
                <strong>{cash(Number(t.amount))}</strong>
              </div>
            ))
          ) : (
            <p className="quiet-empty">Todavía no hay movimientos registrados.</p>
          )}
        </section>
      </div>

      <section className="people-glance">
        <div>
          <UsersRound size={20} />
          <strong>{people.filter(p => p.status !== 'Amigo').length}</strong>
          <span>personas vinculadas</span>
          <strong>{people.filter(p => p.status === 'Amigo').length}</strong>
          <span>amigos</span>
        </div>
        <div>
          <span>Cumpleaños del mes</span>
          {birthdays.length ? (
            birthdays.map(p => (
              <span key={p.id} className="birthday-tag">
                {p.name} {p.surname} · {p.birthday.slice(8, 10)}/{p.birthday.slice(5, 7)}
              </span>
            ))
          ) : (
            <span>Sin fechas registradas</span>
          )}
        </div>
      </section>
    </div>
  )
}
