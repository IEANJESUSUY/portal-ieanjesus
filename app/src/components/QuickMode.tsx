import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Church,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutGrid,
  MessageCircle,
  Minus,
  Plus,
  Search,
  UserPlus,
  Wallet,
  X
} from 'lucide-react'
import {
  type Row,
  type State,
  WEEKDAYS,
  compressPhoto,
  findPossibleDuplicates,
  label,
  lastDateForWeekday,
  money,
  plural,
  today
} from '../utils'
import { NATIONAL_COMMITTEES } from '../../shared/catalog.mjs'
import { EXPENSE_ITEMS, INCOME_ITEMS } from '../finance'

type SaveRecord = (collection: string, row: Row) => Promise<any>
type Screen = 'home' | 'attendance' | 'money' | 'person' | 'report' | 'calendar' | 'requests'

// El chat de ayuda y otras pantallas abren un paso del Inicio con este evento.
export const QUICK_FLOW_EVENT = 'portal:quick-flow'
const PENDING_FLOW_KEY = 'portal.quick-flow-pendiente'
const TUTORIAL_KEY = 'portal.quick-tutorial-visto'

// Lleva al Inicio y abre un paso ("money", "pedido:<id>"…). Si el Inicio todavía no está
// en pantalla, el paso queda anotado y se abre apenas aparece.
export function requestQuickFlow(flow: string, navigate: (to: string) => void) {
  try { window.sessionStorage.setItem(PENDING_FLOW_KEY, flow) } catch { /* sin almacenamiento: solo el evento */ }
  navigate('/')
  window.dispatchEvent(new CustomEvent(QUICK_FLOW_EVENT, { detail: flow }))
}

const OPEN_REQUEST = ['Pendiente', 'Iniciada', 'Observada']

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// "domingo 25 de octubre"
function longDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  return `${WEEKDAYS[date.getDay()].toLowerCase()} ${date.getDate()} de ${MONTHS[date.getMonth()]}`
}

function shiftDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('sv-SE')
}

function previousMonth(month: string) {
  const [year, m] = month.split('-').map(Number)
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, '0')}`
}

const monthName = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1] || month

// Acepta "1500", "1.500", "1500,50" o "1.500,50".
function parseAmount(value: string) {
  let cleaned = value.replace(/[$\s]/g, '')
  if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/\./g, '')
  const amount = Number(cleaned)
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0
}

const isTithe = (row: Row) => /diezmo/i.test([row.category, row.name, row.description, row.subCategory].filter(Boolean).join(' '))

const INCOME_CONCEPTS = INCOME_ITEMS
const EXPENSE_CONCEPTS = EXPENSE_ITEMS

export function QuickMode({
  state,
  scope,
  workspaceName,
  assignments,
  save,
  onOpenFullReport
}: {
  state: State
  scope: string
  workspaceName: string
  assignments: Row[]
  save: SaveRecord
  onOpenFullReport: () => void
}) {
  const [screen, setScreen] = useState<Screen>('home')
  const [attendanceStart, setAttendanceStart] = useState<string>('')
  const [requestId, setRequestId] = useState('')
  const pendingRequests = assignments.filter(a => OPEN_REQUEST.includes(a.status || 'Pendiente'))
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    try { return !window.localStorage.getItem(TUTORIAL_KEY) } catch { return false }
  })
  const belongs = (row: Row) => row.churchId === scope || row.preachingPlaceId === scope
  const goHome = () => {
    setScreen('home')
    setAttendanceStart('')
    setRequestId('')
    window.scrollTo({ top: 0 })
  }
  const open = (next: Screen) => {
    // El informe se completa siempre en el editor, donde se agregan las actividades del mes.
    if (next === 'report') return onOpenFullReport()
    setScreen(next)
    window.scrollTo({ top: 0 })
  }
  const closeTutorial = () => {
    setTutorialOpen(false)
    try { window.localStorage.setItem(TUTORIAL_KEY, 'si') } catch { /* sin almacenamiento: se vuelve a mostrar */ }
  }

  useEffect(() => {
    const run = (flow: string) => {
      try { window.sessionStorage.removeItem(PENDING_FLOW_KEY) } catch { /* nada que limpiar */ }
      if (flow === 'tutorial') setTutorialOpen(true)
      else if (flow.startsWith('pedido:')) {
        setRequestId(flow.slice(7))
        open('requests')
      } else if (['attendance', 'money', 'person', 'report', 'calendar', 'requests'].includes(flow)) {
        setAttendanceStart('')
        setRequestId('')
        open(flow as Screen)
      }
    }
    let pending = ''
    try { pending = window.sessionStorage.getItem(PENDING_FLOW_KEY) || '' } catch { /* sin almacenamiento */ }
    if (pending) run(pending)
    const onFlow = (event: Event) => run((event as CustomEvent<string>).detail)
    window.addEventListener(QUICK_FLOW_EVENT, onFlow)
    return () => window.removeEventListener(QUICK_FLOW_EVENT, onFlow)
  }, [])

  const tutorial = tutorialOpen ? <QuickTutorial onClose={closeTutorial} /> : null

  if (screen === 'requests') {
    return (
      <>
        {tutorial}
        <RequestsFlow
          key={requestId || 'lista'}
          state={state}
          belongs={belongs}
          assignments={assignments}
          initialId={requestId}
          save={save}
          onExit={goHome}
        />
      </>
    )
  }
  if (screen === 'calendar') {
    return <>{tutorial}<CalendarFlow state={state} scope={scope} belongs={belongs} save={save} onExit={goHome} /></>
  }
  if (screen === 'attendance') {
    return <>{tutorial}<AttendanceFlow key={attendanceStart || 'lista'} state={state} scope={scope} belongs={belongs} save={save} initialOption={attendanceStart} onExit={goHome} /></>
  }
  if (screen === 'money') return <>{tutorial}<MoneyFlow scope={scope} save={save} onExit={goHome} /></>
  if (screen === 'person') return <>{tutorial}<PersonFlow state={state} scope={scope} belongs={belongs} save={save} onExit={goHome} /></>

  // --- Pantalla de inicio ---
  const now = new Date()
  const currentMonth = today().slice(0, 7)
  const schedules = uniqueSchedules(state, belongs)
  const missingLists = schedules
    .map(s => ({ schedule: s, date: lastDateForWeekday(s.day) }))
    .filter(({ schedule, date }) => {
      const started = date < today() || (date === today() && `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` >= (schedule.time || '00:00'))
      const event = findScheduleEvent(state, belongs, schedule, date)
      return started && !(event && state.attendance.some(a => a.eventId === event.id))
    })
  const lastMonth = previousMonth(currentMonth)
  const lastMonthReport = state.monthlyReports.find(r => belongs(r) && r.month === lastMonth && (r.reportType || 'monthly') === 'monthly')
  const reportMissing = !lastMonthReport || ['Borrador', 'Guardado'].includes(lastMonthReport.status)
  const monthTx = state.transactions.filter(t => belongs(t) && String(t.date || '').startsWith(currentMonth) && !isTithe(t))
  const income = monthTx.filter(t => t.direction === 'Ingreso').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expenses = monthTx.filter(t => t.direction === 'Egreso').reduce((s, t) => s + Number(t.amount || 0), 0)
  const monthEvents = state.events.filter(e => belongs(e) && String(e.date || '').startsWith(currentMonth))
  const monthLists = state.attendance.filter(a => monthEvents.some(e => e.id === a.eventId))
  const average = monthLists.length
    ? Math.round(monthLists.reduce((s, a) => s + (a.people?.length || 0) + Number(a.visitors || 0), 0) / monthLists.length)
    : 0
  const reminders = [
    ...missingLists.map(({ schedule, date }) => ({
      key: `lista-${schedule.id}`,
      text: `Falta pasar lista del ${longDate(date).split(' de ')[0]}`,
      action: () => {
        setAttendanceStart(`schedule:${schedule.id}`)
        open('attendance')
      }
    })),
    ...(reportMissing ? [{ key: 'informe', text: `Falta enviar el informe de ${monthName(lastMonth)}`, action: () => open('report') }] : []),
    ...(pendingRequests.length
      ? [{
          key: 'pedidos',
          text: pendingRequests.length === 1 ? 'Un comité te pidió algo' : `Los comités te pidieron ${pendingRequests.length} cosas`,
          action: () => open('requests')
        }]
      : [])
  ]

  const upcoming = upcomingEvents(state, belongs).slice(0, 3)

  return (
    <section className="qm qm-home" aria-label="Modo rápido">
      {tutorial}
      <header className="qm-hero">
        <span className="qm-hero-eyebrow">{workspaceName}</span>
        <h2>Dios te bendiga</h2>
        <p><span className="qm-capital">{longDate(today())}</span> · ¿Qué vas a hacer hoy?</p>
      </header>

      {reminders.length > 0 && (
        <div className="qm-reminders" aria-label="Pendientes">
          {reminders.map(r => (
            <button key={r.key} type="button" className="qm-reminder" onClick={r.action}>
              <Bell size={18} aria-hidden="true" />
              <span>{r.text}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <nav className="qm-actions" aria-label="Acciones principales">
        <button type="button" className="qm-action attendance" onClick={() => open('attendance')}>
          <span className="qm-action-icon"><ClipboardList size={28} /></span>
          <span className="qm-action-copy">
            <strong>Pasar lista</strong>
            <small>Marcá quién vino al culto</small>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
        <button type="button" className="qm-action money" onClick={() => open('money')}>
          <span className="qm-action-icon"><Wallet size={28} /></span>
          <span className="qm-action-copy">
            <strong>Anotar dinero</strong>
            <small>Diezmos, ofrendas o gastos</small>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
        <button type="button" className="qm-action person" onClick={() => open('person')}>
          <span className="qm-action-icon"><UserPlus size={28} /></span>
          <span className="qm-action-copy">
            <strong>Anotar persona nueva</strong>
            <small>Alguien que llegó o que visita</small>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
        <button type="button" className="qm-action report" onClick={() => open('report')}>
          <span className="qm-action-icon"><FileText size={28} /></span>
          <span className="qm-action-copy">
            <strong>Informe del mes</strong>
            <small>Se arma solo · revisás y enviás</small>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
        <button type="button" className="qm-action calendar" onClick={() => open('calendar')}>
          <span className="qm-action-icon"><CalendarDays size={28} /></span>
          <span className="qm-action-copy">
            <strong>Calendario</strong>
            <small>Próximas actividades de la iglesia</small>
          </span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </nav>

      {upcoming.length > 0 && (
        <section className="qm-panel" aria-label="Próximas actividades">
          <div className="qm-panel-head">
            <h3>Próximas actividades</h3>
            <button type="button" className="qm-link small" onClick={() => open('calendar')}>Ver todo</button>
          </div>
          <ul className="qm-agenda">
            {upcoming.map(e => <AgendaItem key={e.id} event={e} />)}
          </ul>
        </section>
      )}

      <section className="qm-month" aria-label="Resumen del mes">
        <h3>Así va {monthName(currentMonth)}</h3>
        <div className="qm-month-grid">
          <div><strong>{monthLists.length}</strong><span>{monthLists.length === 1 ? 'culto con lista' : 'cultos con lista'}</span></div>
          <div><strong>{average}</strong><span>personas por culto</span></div>
          <div className="in"><strong>{money(income)}</strong><span>entró (sin diezmos)</span></div>
          <div className="out"><strong>{money(expenses)}</strong><span>salió</span></div>
        </div>
      </section>

      <div className="qm-footer-links">
        <button type="button" className="qm-full-link" onClick={() => setTutorialOpen(true)}>
          <HelpCircle size={16} /> ¿Cómo se usa?
        </button>
      </div>
    </section>
  )
}

// --- Tutorial de primer uso ---

const TUTORIAL_STEPS = [
  { icon: Church, title: 'Bienvenido al Portal', text: 'Desde esta pantalla hacés lo de todos los días con pocos toques. Te mostramos cómo en 30 segundos.' },
  { icon: ClipboardList, title: 'Pasar lista', text: 'Después del culto tocá «Pasar lista», elegí el culto y tocá el nombre de cada persona que vino. Al final, «Listo».' },
  { icon: Wallet, title: 'Anotar dinero', text: 'Tocá «Anotar dinero», decí si entró o salió plata, cuánto y de qué. Revisás y guardás.' },
  { icon: FileText, title: 'Informe del mes', text: 'Los números se completan solos con lo que anotaste. Vos agregás las actividades del mes y tocás «Enviar informe». Nada de Canva.' },
  { icon: LayoutGrid, title: 'El menú', text: 'Abajo tenés todo lo demás: Personas, Cultos, Dinero e Informes. «Inicio» siempre te trae de vuelta a esta pantalla.' },
  { icon: MessageCircle, title: 'Si te perdés', text: 'Tocá el botón verde de ayuda: te explica y te lleva al paso. Siempre podés volver con «Volver».' }
]

function QuickTutorial({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const step = TUTORIAL_STEPS[index]
  const Icon = step.icon
  const last = index === TUTORIAL_STEPS.length - 1
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="qm-tutorial" role="dialog" aria-modal="true" aria-label="Cómo se usa">
      <div className="qm-tutorial-card">
        <button type="button" className="qm-tutorial-close" onClick={onClose} aria-label="Cerrar tutorial"><X size={20} /></button>
        <div key={index} className="qm-tutorial-step">
          <span className="qm-tutorial-icon"><Icon size={40} /></span>
          <h2>{step.title}</h2>
          <p>{step.text}</p>
        </div>
        <div className="qm-dots" aria-label={`Paso ${index + 1} de ${TUTORIAL_STEPS.length}`}>
          {TUTORIAL_STEPS.map((_, i) => <span key={i} className={i === index ? 'active' : ''} />)}
        </div>
        <div className="qm-row">
          {index > 0 ? (
            <button type="button" className="qm-secondary" onClick={() => setIndex(i => i - 1)}>Atrás</button>
          ) : (
            <button type="button" className="qm-secondary" onClick={onClose}>Saltar</button>
          )}
          <button type="button" className="qm-primary" onClick={() => (last ? onClose() : setIndex(i => i + 1))}>
            {last ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// --- Calendario ---

function upcomingEvents(state: State, belongs: (row: Row) => boolean) {
  const limit = shiftDays(today(), 60)
  return state.events
    .filter(e => (belongs(e) || (!e.churchId && !e.preachingPlaceId && e.showInChurchCalendar !== 'No')) && e.date >= today() && e.date <= limit)
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))
}

function AgendaItem({ event }: { event: Row }) {
  const date = new Date(`${event.date}T12:00:00`)
  const when = event.date === today() ? 'Hoy' : event.date === shiftDays(today(), 1) ? 'Mañana' : WEEKDAYS[date.getDay()]
  return (
    <li className="qm-agenda-item">
      <span className="qm-date-block">
        <strong>{date.getDate()}</strong>
        <small>{MONTHS[date.getMonth()].slice(0, 3)}</small>
      </span>
      <span className="qm-agenda-copy">
        <strong>{event.name || 'Actividad'}</strong>
        <small>{when}{event.time ? ` · ${event.time} hs` : ''}{!event.churchId ? ' · Nacional' : ''}</small>
      </span>
    </li>
  )
}

const EVENT_KINDS = ['Culto', 'Reunión', 'Oración', 'Ayuno', 'Vigilia', 'Evento']

function CalendarFlow({
  state,
  scope,
  belongs,
  save,
  onExit
}: {
  state: State
  scope: string
  belongs: (row: Row) => boolean
  save: SaveRecord
  onExit: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState('Culto')
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('19:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedName, setSavedName] = useState('')
  const events = upcomingEvents(state, belongs)
  const schedules = uniqueSchedules(state, belongs)
    .slice()
    .sort((a, b) => ((WEEKDAYS.indexOf(a.day) + 6) % 7) - ((WEEKDAYS.indexOf(b.day) + 6) % 7))

  async function saveEvent() {
    const finalName = name.trim() || kind
    setBusy(true)
    setError('')
    try {
      await save('events', {
        id: '', name: finalName, churchId: scope, date, time, kind, location: '', responsible: '', activityId: '',
        modality: 'Presencial', publicVisible: 'Sí', featured: 'No', showInChurchCalendar: 'Sí',
        scopeAudience: 'Congregación local', notes: 'Agregado desde el Modo rápido.'
      })
      setSavedName(finalName)
      setAdding(false)
      setName('')
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (adding) {
    return (
      <section className="qm qm-flow">
        <FlowHeader title="Nueva actividad" step="Calendario" onBack={() => setAdding(false)} />
        <div className="qm-card">
          <span className="qm-field-label">¿Qué es?</span>
          <div className="qm-chip-grid">
            {EVENT_KINDS.map(k => (
              <button key={k} type="button" className={`qm-chip${kind === k ? ' active' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
          <label className="qm-field">
            <span>Nombre (opcional)</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={`Ej. ${kind === 'Culto' ? 'Culto especial de jóvenes' : kind + ' de la iglesia'}`} />
          </label>
          <div className="qm-row">
            <label className="qm-field">
              <span>Día</span>
              <input type="date" min={today()} value={date} onChange={e => setDate(e.target.value || today())} />
            </label>
            <label className="qm-field">
              <span>Hora</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </label>
          </div>
        </div>
        {error && <p className="qm-error" role="alert">{error}</p>}
        <div className="qm-sticky">
          <button type="button" className="qm-primary big" disabled={busy} onClick={saveEvent}>
            <Check size={22} /> {busy ? 'Guardando…' : 'Guardar actividad'}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="qm qm-flow">
      <FlowHeader title="Calendario" step="Lo que viene en la iglesia" onBack={onExit} />
      {savedName && (
        <p className="qm-note ok"><CheckCircle2 size={18} /> «{savedName}» quedó en el calendario.</p>
      )}
      <button type="button" className="qm-primary big" onClick={() => { setAdding(true); setSavedName(''); window.scrollTo({ top: 0 }) }}>
        <Plus size={22} /> Anotar una actividad
      </button>
      {schedules.length > 0 && (
        <section className="qm-panel">
          <h3>Todas las semanas</h3>
          <ul className="qm-weekly">
            {schedules.map(s => (
              <li key={s.id}><strong>{s.day}</strong><span>{s.time} hs · {s.name}</span></li>
            ))}
          </ul>
        </section>
      )}
      <section className="qm-panel">
        <h3>Próximas actividades</h3>
        {events.length ? (
          <ul className="qm-agenda">{events.map(e => <AgendaItem key={e.id} event={e} />)}</ul>
        ) : (
          <p className="qm-hint">No hay actividades anotadas para los próximos dos meses.</p>
        )}
      </section>
    </section>
  )
}

// --- Piezas compartidas ---

function uniqueSchedules(state: State, belongs: (row: Row) => boolean) {
  return (state.serviceSchedules || [])
    .filter(s => s.status !== 'Inactivo' && belongs(s))
    .filter((s, index, all) => all.findIndex(x => x.day === s.day && x.time === s.time) === index)
}

function findScheduleEvent(state: State, belongs: (row: Row) => boolean, schedule: Row, date: string) {
  return state.events.find(
    e => belongs(e) && e.date === date &&
      (e.scheduleId === schedule.id || (!e.scheduleId && (e.kind || 'Culto') === 'Culto' && e.time === schedule.time))
  )
}

function FlowHeader({ title, step, onBack }: { title: string; step?: string; onBack: () => void }) {
  return (
    <header className="qm-flow-header">
      <button type="button" className="qm-back" onClick={onBack}>
        <ArrowLeft size={20} /> Volver
      </button>
      <div>
        {step && <span>{step}</span>}
        <h2>{title}</h2>
      </div>
    </header>
  )
}

function DoneScreen({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="qm qm-done" role="status">
      <span className="qm-done-icon"><CheckCircle2 size={56} /></span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="qm-done-actions">{children}</div>
    </section>
  )
}

// --- 1. Pasar lista ---

type ServiceOption = { key: string; title: string; date: string; time: string; event?: Row; draft?: Row }

function AttendanceFlow({
  state,
  scope,
  belongs,
  save,
  initialOption,
  onExit
}: {
  state: State
  scope: string
  belongs: (row: Row) => boolean
  save: SaveRecord
  initialOption: string
  onExit: () => void
}) {
  const options: ServiceOption[] = (() => {
    const fromSchedules = uniqueSchedules(state, belongs).map(s => {
      const date = lastDateForWeekday(s.day)
      const event = findScheduleEvent(state, belongs, s, date)
      return {
        key: `schedule:${s.id}`,
        title: s.name,
        date,
        time: s.time || '',
        event,
        draft: event ? undefined : {
          id: '', name: s.name, churchId: scope, date, time: s.time || '', kind: 'Culto', scheduleId: s.id,
          location: s.location || '', responsible: '', activityId: '', notes: `Horario habitual de ${s.day}.`
        }
      }
    })
    const used = new Set(fromSchedules.map(o => o.event?.id).filter(Boolean))
    const weekAgo = shiftDays(today(), -7)
    const recent = state.events
      .filter(e => belongs(e) && !used.has(e.id) && e.date >= weekAgo && e.date <= today())
      .sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`))
      .slice(0, 4)
      .map(e => ({ key: `event:${e.id}`, title: e.name || 'Culto', date: e.date, time: e.time || '', event: e }))
    return [...fromSchedules, ...recent].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
  })()

  const people = state.people
    .filter(p => belongs(p) && p.status !== 'Inactivo')
    .sort((a, b) => label(a).localeCompare(label(b), 'es'))

  const [chosen, setChosen] = useState<ServiceOption | null>(() => options.find(o => o.key === initialOption) || null)
  const [selected, setSelected] = useState<string[]>(() => state.attendance.find(a => a.eventId === chosen?.event?.id)?.people || [])
  const [visitors, setVisitors] = useState<number>(() => Number(state.attendance.find(a => a.eventId === chosen?.event?.id)?.visitors || 0))
  const [search, setSearch] = useState('')
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherName, setOtherName] = useState('Culto')
  const [otherDate, setOtherDate] = useState(today())
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBasics, setNewBasics] = useState<Basics>({ gender: '', ageGroup: '' })
  const [newPeople, setNewPeople] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function choose(option: ServiceOption) {
    const previous = state.attendance.find(a => a.eventId === option.event?.id)
    setChosen(option)
    setSelected(previous?.people || [])
    setVisitors(Number(previous?.visitors || 0))
    setSearch('')
    window.scrollTo({ top: 0 })
  }

  const allPeople = [...people, ...newPeople.filter(p => !people.some(x => x.id === p.id))]
  const query = search.trim().toLowerCase()
  const visiblePeople = query ? allPeople.filter(p => label(p).toLowerCase().includes(query)) : allPeople
  const toggle = (id: string) => setSelected(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))
  const newMatches = newName.trim() ? findPossibleDuplicates(allPeople, { id: '', name: newName.trim().split(/\s+/)[0], surname: newName.trim().split(/\s+/).slice(1).join(' ') }) : []

  async function addNewPerson() {
    const parts = newName.trim().split(/\s+/)
    if (!parts[0]) return
    setBusy(true)
    setError('')
    try {
      const saved = await save('people', {
        id: '', name: parts.shift(), surname: parts.join(' '), churchId: scope, status: 'Amigo', phone: '',
        ...newBasics, birthday: '', photo: '', notes: 'Registrado al pasar lista en el Modo rápido.'
      })
      setNewPeople(list => [...list, saved])
      setSelected(ids => [...ids, saved.id])
      setNewName('')
      setNewBasics({ gender: '', ageGroup: '' })
      setNewOpen(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function saveList() {
    if (!chosen) return
    setBusy(true)
    setError('')
    try {
      let eventId = chosen.event?.id
      if (!eventId && chosen.draft) eventId = (await save('events', chosen.draft)).id
      const previous = state.attendance.find(a => a.eventId === eventId)
      await save('attendance', {
        id: previous?.id || '',
        eventId,
        people: selected,
        visitors,
        activityId: previous?.activityId || '',
        assignmentId: previous?.assignmentId || ''
      })
      setDone(true)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done && chosen) {
    return (
      <DoneScreen
        title="¡Lista guardada!"
        detail={`${chosen.title} del ${longDate(chosen.date)}: ${plural(selected.length, 'persona', 'personas')}${visitors ? ` y ${plural(visitors, 'visita', 'visitas')}` : ''}.`}
      >
        <button type="button" className="qm-primary" onClick={onExit}>Volver al inicio</button>
      </DoneScreen>
    )
  }

  // Paso 1: ¿qué culto es?
  if (!chosen) {
    return (
      <section className="qm qm-flow">
        <FlowHeader title="¿De qué culto es la lista?" step="Pasar lista · paso 1 de 2" onBack={onExit} />
        <div className="qm-choice-list">
          {options.map(o => (
            <button key={o.key} type="button" className="qm-choice" onClick={() => choose(o)}>
              <span className="qm-choice-copy">
                <strong>{o.title}</strong>
                <small>
                  {o.date === today() ? 'Hoy' : longDate(o.date).replace(/^./, c => c.toUpperCase())}
                  {o.time ? ` · ${o.time} hs` : ''}
                  {o.event && state.attendance.some(a => a.eventId === o.event?.id) ? ' · ya tiene lista' : ''}
                </small>
              </span>
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          ))}
          {!otherOpen ? (
            <button type="button" className="qm-choice ghost" onClick={() => setOtherOpen(true)}>
              <span className="qm-choice-copy">
                <strong>Otro culto o reunión</strong>
                <small>Vigilia, ayuno, culto especial…</small>
              </span>
              <Plus size={20} aria-hidden="true" />
            </button>
          ) : (
            <div className="qm-card">
              <label className="qm-field">
                <span>¿Cómo se llama?</span>
                <input value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="Ej. Vigilia de oración" />
              </label>
              <label className="qm-field">
                <span>¿Qué día fue?</span>
                <input type="date" max={today()} value={otherDate} onChange={e => setOtherDate(e.target.value || today())} />
              </label>
              <button
                type="button"
                className="qm-primary"
                disabled={!otherName.trim()}
                onClick={() => choose({
                  key: 'other', title: otherName.trim(), date: otherDate, time: '',
                  draft: { id: '', name: otherName.trim(), churchId: scope, date: otherDate, time: '', kind: 'Culto', location: '', responsible: '', activityId: '', notes: 'Creado al pasar lista en el Modo rápido.' }
                })}
              >
                Siguiente <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </section>
    )
  }

  // Paso 2: marcar a los presentes
  return (
    <section className="qm qm-flow qm-attendance">
      <FlowHeader
        title={chosen.title}
        step={`${chosen.date === today() ? 'Hoy' : longDate(chosen.date)}${chosen.time ? ` · ${chosen.time} hs` : ''}`}
        onBack={() => setChosen(null)}
      />
      <p className="qm-hint">Tocá el nombre de cada persona que vino.</p>
      <div className="qm-search">
        <Search size={18} aria-hidden="true" />
        <input type="search" aria-label="Buscar persona" placeholder="Buscar por nombre…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <ul className="qm-people">
        {visiblePeople.map(p => {
          const checked = selected.includes(p.id)
          return (
            <li key={p.id}>
              <button type="button" className={`qm-person${checked ? ' checked' : ''}`} aria-pressed={checked} onClick={() => toggle(p.id)}>
                <span className="qm-check">{checked && <Check size={20} strokeWidth={3} />}</span>
                {p.photo ? <img src={p.photo} alt="" /> : <span className="qm-avatar">{(p.name?.[0] || '?').toUpperCase()}</span>}
                <span className="qm-person-name">{label(p)}</span>
              </button>
            </li>
          )
        })}
        {!visiblePeople.length && (
          <li className="qm-empty">
            {allPeople.length ? 'No encontramos ese nombre.' : 'Todavía no hay personas anotadas.'} Podés agregarla abajo.
          </li>
        )}
      </ul>

      {!newOpen ? (
        <button type="button" className="qm-secondary" onClick={() => { setNewOpen(true); setNewName(search) }}>
          <UserPlus size={18} /> Vino alguien nuevo
        </button>
      ) : (
        <div className="qm-card">
          <label className="qm-field">
            <span>Nombre y apellido de la persona nueva</span>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej. Juan López" />
          </label>
          {newMatches.length > 0 && (
            <div className="qm-warning">
              <strong>¿Es alguna de estas personas?</strong>
              {newMatches.slice(0, 3).map(p => (
                <button key={p.id} type="button" className="qm-secondary" onClick={() => { setSelected(ids => [...new Set([...ids, p.id])]); setNewOpen(false); setNewName('') }}>
                  Sí, es {label(p)} · marcar presente
                </button>
              ))}
            </div>
          )}
          <PersonBasics value={newBasics} onChange={setNewBasics} />
          <div className="qm-row">
            <button type="button" className="qm-secondary" onClick={() => setNewOpen(false)}>Cancelar</button>
            <button type="button" className="qm-primary" disabled={!newName.trim() || !newBasics.gender || !newBasics.ageGroup || busy} onClick={addNewPerson}>
              {newMatches.length ? 'No, es otra · agregar' : 'Agregar y marcar'}
            </button>
          </div>
        </div>
      )}

      <div className="qm-sticky">
        <div className="qm-visitors">
          <span>Visitas sin anotar</span>
          <button type="button" aria-label="Una visita menos" onClick={() => setVisitors(v => Math.max(0, v - 1))}><Minus size={20} /></button>
          <strong aria-live="polite">{visitors}</strong>
          <button type="button" aria-label="Una visita más" onClick={() => setVisitors(v => v + 1)}><Plus size={20} /></button>
        </div>
        {error && <p className="qm-error" role="alert">{error}</p>}
        <button type="button" className="qm-primary big" disabled={busy} onClick={saveList}>
          <Check size={22} /> {busy ? 'Guardando…' : `Listo · ${selected.length + visitors} presentes`}
        </button>
      </div>
    </section>
  )
}

// --- 2. Anotar dinero ---

function MoneyFlow({ scope, save, onExit }: { scope: string; save: SaveRecord; onExit: () => void }) {
  const [step, setStep] = useState<'direction' | 'amount' | 'concept' | 'confirm' | 'done'>('direction')
  const [direction, setDirection] = useState<'Ingreso' | 'Egreso'>('Ingreso')
  const [amountText, setAmountText] = useState('')
  const [concept, setConcept] = useState<{ label: string; category: string; custom?: boolean } | null>(null)
  const [customText, setCustomText] = useState('')
  const [date, setDate] = useState(today())
  const [dateOpen, setDateOpen] = useState(false)
  const [photo, setPhoto] = useState('')
  const [committeeKey, setCommitteeKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const amount = parseAmount(amountText)
  const isIncome = direction === 'Ingreso'
  const tithe = concept?.category === 'Diezmo'
  const description = concept?.custom ? customText.trim() : concept?.label || ''
  const go = (next: typeof step) => {
    setStep(next)
    setError('')
    window.scrollTo({ top: 0 })
  }

  async function handlePhoto(file?: File) {
    if (!file) return
    try {
      setPhoto(await compressPhoto(file))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function saveMovement() {
    if (!concept || !amount) return
    setBusy(true)
    setError('')
    try {
      await save('transactions', {
        id: '',
        direction,
        category: concept.category,
        name: tithe ? 'Cierre general de diezmos' : description,
        description: tithe ? 'Cierre general de diezmos' : description,
        amount: String(amount),
        date,
        churchId: scope,
        accountType: 'Operación',
        financialStatus: 'Registrado',
        receiptPhoto: tithe ? '' : photo,
        reference: '',
        // El rubro (Luz, Agua, Internet…) permite controlar los gastos fijos de cada mes.
        subCategory: direction === 'Egreso' ? concept.label : '',
        committeeKey: tithe ? '' : committeeKey,
        groupId: ''
      })
      go('done')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function restart() {
    setAmountText('')
    setConcept(null)
    setCustomText('')
    setPhoto('')
    setCommitteeKey('')
    setDate(today())
    setDateOpen(false)
    go('direction')
  }

  if (step === 'done') {
    return (
      <DoneScreen
        title="¡Anotado!"
        detail={`${isIncome ? 'Entró' : 'Salió'} ${money(amount)} · ${tithe ? 'Diezmos' : description}.`}
      >
        <button type="button" className="qm-secondary" onClick={restart}>Anotar otro</button>
        <button type="button" className="qm-primary" onClick={onExit}>Volver al inicio</button>
      </DoneScreen>
    )
  }

  if (step === 'direction') {
    return (
      <section className="qm qm-flow">
        <FlowHeader title="¿Entró o salió plata?" step="Anotar dinero · paso 1 de 3" onBack={onExit} />
        <div className="qm-big-choice">
          <button type="button" className="qm-big in" onClick={() => { setDirection('Ingreso'); setConcept(null); go('amount') }}>
            <ArrowDownLeft size={34} />
            <strong>Entró plata</strong>
            <small>Diezmos, ofrendas, donaciones</small>
          </button>
          <button type="button" className="qm-big out" onClick={() => { setDirection('Egreso'); setConcept(null); go('amount') }}>
            <ArrowUpRight size={34} />
            <strong>Salió plata</strong>
            <small>Gastos y pagos</small>
          </button>
        </div>
      </section>
    )
  }

  if (step === 'amount') {
    return (
      <section className="qm qm-flow">
        <FlowHeader title="¿Cuánto?" step="Anotar dinero · paso 2 de 3" onBack={() => go('direction')} />
        <form className="qm-card" onSubmit={e => { e.preventDefault(); if (amount) go('concept') }}>
          <label className={`qm-amount ${isIncome ? 'in' : 'out'}`}>
            <span>$</span>
            <input
              autoFocus
              inputMode="decimal"
              aria-label="Importe en pesos"
              placeholder="0"
              value={amountText}
              onChange={e => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
            />
          </label>
          <p className="qm-hint center">En pesos uruguayos</p>
          <button type="submit" className="qm-primary big" disabled={!amount}>
            Siguiente <ArrowRight size={20} />
          </button>
        </form>
      </section>
    )
  }

  if (step === 'concept') {
    const concepts = isIncome ? INCOME_CONCEPTS : EXPENSE_CONCEPTS
    return (
      <section className="qm qm-flow">
        <FlowHeader title={isIncome ? '¿De qué es?' : '¿En qué se gastó?'} step="Anotar dinero · paso 3 de 3" onBack={() => go('amount')} />
        <div className="qm-chip-grid">
          {concepts.map(c => (
            <button
              key={c.label}
              type="button"
              className={`qm-chip${concept?.label === c.label ? ' active' : ''}`}
              aria-pressed={concept?.label === c.label}
              onClick={() => { setConcept(c); if (!c.custom) go('confirm') }}
            >
              {c.label}
              {c.hint && <small className="qm-chip-hint">{c.hint}</small>}
            </button>
          ))}
        </div>
        {concept?.custom && (
          <form className="qm-card" onSubmit={e => { e.preventDefault(); if (customText.trim()) go('confirm') }}>
            <label className="qm-field">
              <span>Escribí qué fue</span>
              <input autoFocus value={customText} onChange={e => setCustomText(e.target.value)} placeholder={isIncome ? 'Ej. Venta de empanadas' : 'Ej. Arreglo del techo'} />
            </label>
            <button type="submit" className="qm-primary" disabled={!customText.trim()}>Siguiente <ArrowRight size={18} /></button>
          </form>
        )}
      </section>
    )
  }

  // Confirmación
  return (
    <section className="qm qm-flow">
      <FlowHeader title="¿Está bien así?" step="Revisá antes de guardar" onBack={() => go('concept')} />
      <div className={`qm-summary ${isIncome ? 'in' : 'out'}`}>
        <span>{isIncome ? 'Entró' : 'Salió'}</span>
        <strong>{money(amount)}</strong>
        <p>{tithe ? 'Diezmos' : description}{committeeKey && !tithe ? ` · ${NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === committeeKey)?.name}` : ''}</p>
        <small>{date === today() ? `Hoy, ${longDate(date)}` : longDate(date)}</small>
      </div>
      {tithe && <p className="qm-note">Anotá el total de diezmos juntos, sin nombres. El monto queda reservado.</p>}
      <div className="qm-card">
        {!dateOpen ? (
          <button type="button" className="qm-link" onClick={() => setDateOpen(true)}>Fue otro día · cambiar fecha</button>
        ) : (
          <label className="qm-field">
            <span>¿Qué día fue?</span>
            <input type="date" max={today()} value={date} onChange={e => setDate(e.target.value || today())} />
          </label>
        )}
        {!tithe && (
          <label className="qm-field">
            <span>¿Es de un comité? (opcional)</span>
            <select value={committeeKey} onChange={e => setCommitteeKey(e.target.value)}>
              <option value="">No, es de la iglesia</option>
              {NATIONAL_COMMITTEES.map((c: { key: string; name: string }) => (
                <option key={c.key} value={c.key}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        {!tithe && (
          <label className="qm-photo">
            <Camera size={20} />
            <span>{photo ? 'Foto del recibo agregada ✓' : 'Agregar foto del recibo (opcional)'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handlePhoto(e.target.files?.[0])} />
          </label>
        )}
      </div>
      {error && <p className="qm-error" role="alert">{error}</p>}
      <div className="qm-sticky">
        <button type="button" className="qm-primary big" disabled={busy} onClick={saveMovement}>
          <Check size={22} /> {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </section>
  )
}

// --- 3. Persona nueva ---

// Hombre/mujer y edad aproximada: con esto el informe puede contar hombres, mujeres, jóvenes y niños.
type Basics = { gender: string; ageGroup: string }
const GENDER_OPTIONS = [['Masculino', 'Hombre'], ['Femenino', 'Mujer']]
const AGE_OPTIONS = [['Niño', 'hasta 11'], ['Joven', '12 a 25'], ['Adulto', '26 o más']]

function PersonBasics({ value, onChange }: { value: Basics; onChange: (next: Basics) => void }) {
  return (
    <div className="qm-basics">
      <span className="qm-field-label">¿Hombre o mujer?</span>
      <div className="qm-toggle" role="group" aria-label="Hombre o mujer">
        {GENDER_OPTIONS.map(([key, text]) => (
          <button key={key} type="button" aria-pressed={value.gender === key} className={value.gender === key ? 'active' : ''} onClick={() => onChange({ ...value, gender: key })}>
            {text}
          </button>
        ))}
      </div>
      <span className="qm-field-label">¿Qué edad tiene, más o menos?</span>
      <div className="qm-toggle three" role="group" aria-label="Edad aproximada">
        {AGE_OPTIONS.map(([key, range]) => (
          <button key={key} type="button" aria-pressed={value.ageGroup === key} className={value.ageGroup === key ? 'active' : ''} onClick={() => onChange({ ...value, ageGroup: key })}>
            {key}<small>{range}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

function PersonFlow({
  state,
  scope,
  belongs,
  save,
  onExit
}: {
  state: State
  scope: string
  belongs: (row: Row) => boolean
  save: SaveRecord
  onExit: () => void
}) {
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'Amigo' | 'Persona vinculada'>('Amigo')
  const [basics, setBasics] = useState({ gender: '', ageGroup: '' })
  const [matches, setMatches] = useState<Row[]>([])
  const [savedName, setSavedName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const needsSurname = status === 'Persona vinculada'
  const ready = name.trim() && (!needsSurname || surname.trim()) && basics.gender && basics.ageGroup

  async function submit(confirmedNew = false) {
    if (!ready) return
    const draft = { id: '', name: name.trim(), surname: surname.trim(), phone: phone.trim() }
    if (!confirmedNew) {
      const found = findPossibleDuplicates(state.people, draft)
      if (found.length) {
        setMatches(found)
        return
      }
    }
    setBusy(true)
    setError('')
    try {
      await save('people', {
        ...draft, ...basics, churchId: scope, status, birthday: '', photo: '',
        notes: 'Registrado desde el Modo rápido. Completar ficha cuando se pueda.'
      })
      setSavedName(label(draft))
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function restart() {
    setName('')
    setSurname('')
    setPhone('')
    setStatus('Amigo')
    setBasics({ gender: '', ageGroup: '' })
    setMatches([])
    setSavedName('')
  }

  if (savedName) {
    return (
      <DoneScreen title="¡Persona anotada!" detail={`${savedName} ya está en la lista de la iglesia.`}>
        <button type="button" className="qm-secondary" onClick={restart}>Anotar otra</button>
        <button type="button" className="qm-primary" onClick={onExit}>Volver al inicio</button>
      </DoneScreen>
    )
  }

  if (matches.length) {
    return (
      <section className="qm qm-flow">
        <FlowHeader title="¿Ya está anotada?" step="Encontramos fichas parecidas" onBack={() => setMatches([])} />
        <ul className="qm-match-list">
          {matches.slice(0, 4).map(p => (
            <li key={p.id}>
              <strong>{label(p)}</strong>
              <span>{[p.phone, belongs(p) ? 'de esta iglesia' : state.churches.find(c => c.id === p.churchId)?.name].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
        <div className="qm-stack">
          <button type="button" className="qm-primary big" onClick={onExit}>Sí, ya está · no anotar</button>
          <button type="button" className="qm-secondary" disabled={busy} onClick={() => { setMatches([]); submit(true) }}>
            No, es otra persona · anotar igual
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="qm qm-flow">
      <FlowHeader title="Persona nueva" step="Con el nombre alcanza" onBack={onExit} />
      <form className="qm-card" onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="qm-toggle" role="group" aria-label="¿Quién es?">
          <button type="button" aria-pressed={status === 'Amigo'} className={status === 'Amigo' ? 'active' : ''} onClick={() => setStatus('Amigo')}>
            Nos visita
          </button>
          <button type="button" aria-pressed={status === 'Persona vinculada'} className={status === 'Persona vinculada' ? 'active' : ''} onClick={() => setStatus('Persona vinculada')}>
            Es de la iglesia
          </button>
        </div>
        <label className="qm-field">
          <span>Nombre</span>
          <input autoFocus autoComplete="off" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. María" />
        </label>
        <label className="qm-field">
          <span>Apellido{needsSurname ? '' : ' (si lo sabés)'}</span>
          <input autoComplete="off" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Ej. González" />
        </label>
        <label className="qm-field">
          <span>Celular (si lo sabés)</span>
          <input type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09…" />
        </label>
        <PersonBasics value={basics} onChange={setBasics} />
        {error && <p className="qm-error" role="alert">{error}</p>}
        <button type="submit" className="qm-primary big" disabled={!ready || busy}>
          <Check size={22} /> {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </section>
  )
}

// --- 6. Pedidos de los comités ---
// El comité pide algo (por ejemplo, el informe del culto misionero). Si la iglesia ya lo anotó
// —lista del culto y ofrenda marcada para ese comité—, la respuesta viene completa y solo se confirma.

const committeeName = (key?: string) =>
  key === 'nacional' ? 'Administración Nacional' : NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === key)?.name || 'Comité nacional'

function requestStatus(status?: string) {
  if (status === 'Aprobada') return { text: 'Recibido ✓', tone: 'ok' }
  if (status === 'Enviada' || status === 'Corregida') return { text: 'Respondido', tone: 'sent' }
  if (status === 'Observada') return { text: 'Te piden un cambio', tone: 'warn' }
  return { text: 'Por responder', tone: 'open' }
}

function RequestsFlow({
  state,
  belongs,
  assignments,
  initialId,
  save,
  onExit
}: {
  state: State
  belongs: (row: Row) => boolean
  assignments: Row[]
  initialId: string
  save: SaveRecord
  onExit: () => void
}) {
  const [selectedId, setSelectedId] = useState(initialId)
  const selected = assignments.find(a => a.id === selectedId)
  if (selected) {
    return (
      <RequestAnswer
        assignment={selected}
        activity={state.nationalActivities.find(a => a.id === selected.activityId)}
        state={state}
        belongs={belongs}
        save={save}
        onBack={() => (initialId ? onExit() : setSelectedId(''))}
        onExit={onExit}
      />
    )
  }
  const sorted = [...assignments].sort((a, b) => Number(OPEN_REQUEST.includes(b.status || 'Pendiente')) - Number(OPEN_REQUEST.includes(a.status || 'Pendiente')))
  return (
    <section className="qm qm-flow">
      <FlowHeader title="Pedidos de los comités" step="Lo que te piden y para cuándo" onBack={onExit} />
      {sorted.length ? (
        <div className="qm-choice-list">
          {sorted.map(a => {
            const activity = state.nationalActivities.find(x => x.id === a.activityId)
            const status = requestStatus(a.status)
            return (
              <button key={a.id} type="button" className="qm-choice" onClick={() => setSelectedId(a.id)}>
                <span className="qm-choice-copy">
                  <small>{committeeName(activity?.committeeKey)}</small>
                  <strong>{activity?.name || a.name || 'Pedido'}</strong>
                  <small>
                    <span className={`qm-status ${status.tone}`}>{status.text}</span>
                    {activity?.deadline && OPEN_REQUEST.includes(a.status || 'Pendiente') ? ` · para el ${longDate(activity.deadline)}` : ''}
                  </small>
                </span>
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="qm-empty">No hay pedidos de los comités por ahora.</p>
      )}
    </section>
  )
}

function RequestAnswer({
  assignment,
  activity,
  state,
  belongs,
  save,
  onBack,
  onExit
}: {
  assignment: Row
  activity?: Row
  state: State
  belongs: (row: Row) => boolean
  save: SaveRecord
  onBack: () => void
  onExit: () => void
}) {
  const committeeKey = activity?.committeeKey || ''
  const asksAttendance = activity?.requiresAttendance !== 'No'
  const asksOffering = activity?.requiresOffering !== 'No'
  // Actividades ya hechas que pueden ser la que pide el comité, la más probable primero.
  const past = state.events.filter(e => belongs(e) && e.date && e.date <= today())
  const linked = past.filter(e => e.id === assignment.eventId || (activity && e.activityId === activity.id) || (committeeKey && e.committeeKey === committeeKey))
  const recent = past.filter(e => e.date >= shiftDays(today(), -45))
  const options = [...linked, ...recent]
    .filter((e, i, all) => all.findIndex(x => x.id === e.id) === i)
    .sort((a, b) => (linked.includes(b) ? 1 : 0) - (linked.includes(a) ? 1 : 0) || String(b.date).localeCompare(String(a.date)))
    .slice(0, 6)
  const figuresFor = (event?: Row) => {
    const list = event ? state.attendance.find(a => a.eventId === event.id) : undefined
    const offering = event
      ? state.transactions
          .filter(t => belongs(t) && t.direction === 'Ingreso' && !isTithe(t) && t.date === event.date &&
            ((committeeKey && t.committeeKey === committeeKey) || (t.eventId && t.eventId === event.id)))
          .reduce((s, t) => s + Number(t.amount || 0), 0)
      : 0
    return { people: list?.people?.length || 0, visitors: Number(list?.visitors || 0), offering, hasList: Boolean(list) }
  }
  const answered = !OPEN_REQUEST.includes(assignment.status || 'Pendiente')
  const initialEvent = options.find(e => e.id === assignment.eventId) || (answered ? undefined : linked.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0])
  const [eventId, setEventId] = useState(initialEvent?.id || '')
  const [date, setDate] = useState(assignment.localDate || initialEvent?.date || today())
  const start = answered || assignment.status === 'Observada'
    ? { people: Number(assignment.attendanceCount || 0), visitors: Number(assignment.visitorsCount || 0), offering: Number(assignment.financialData?.reportedOfferingTotal || 0), hasList: false }
    : figuresFor(initialEvent)
  const [people, setPeople] = useState(String(start.people || ''))
  const [visitors, setVisitors] = useState(String(start.visitors || ''))
  const [offering, setOffering] = useState(start.offering ? String(start.offering) : '')
  const [description, setDescription] = useState(assignment.description || '')
  const [photos, setPhotos] = useState<string[]>(assignment.photos || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const chosen = options.find(e => e.id === eventId)
  const prefilled = chosen ? figuresFor(chosen) : undefined
  const status = requestStatus(assignment.status)

  function choose(event?: Row) {
    setEventId(event?.id || '')
    if (!event) return
    setDate(event.date)
    const figures = figuresFor(event)
    setPeople(figures.people ? String(figures.people) : '')
    setVisitors(figures.visitors ? String(figures.visitors) : '')
    setOffering(figures.offering ? String(figures.offering) : '')
  }

  async function addPhoto(file?: File) {
    if (!file) return
    try {
      const photo = await compressPhoto(file)
      setPhotos(list => [...list, photo].slice(0, 2))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function send() {
    setBusy(true)
    setError('')
    try {
      const offeringTotal = asksOffering ? parseAmount(offering || '0') : 0
      const previous = assignment.financialData || {}
      await save('activityAssignments', {
        ...assignment,
        status: assignment.status === 'Observada' ? 'Corregida' : 'Enviada',
        localDate: date,
        eventId,
        attendanceCount: asksAttendance ? Number(people) || 0 : 0,
        visitorsCount: asksAttendance ? Number(visitors) || 0 : 0,
        description: description.trim(),
        photos,
        financialData: {
          ...previous,
          reportedOfferingTotal: offeringTotal,
          totalGathered: Math.max(0, offeringTotal - Number(previous.expenses || 0)),
          status: 'Enviado'
        },
        submittedAt: new Date().toISOString()
      })
      setDone(true)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <DoneScreen title="¡Respuesta enviada!" detail={`${committeeName(committeeKey)} ya puede ver lo que mandaste.`}>
        <button type="button" className="qm-primary" onClick={onExit}>Volver al inicio</button>
      </DoneScreen>
    )
  }

  return (
    <section className="qm qm-flow">
      <FlowHeader title={activity?.name || assignment.name || 'Pedido'} step={committeeName(committeeKey)} onBack={onBack} />
      <div className="qm-request-ask">
        <span className={`qm-status ${status.tone}`}>{status.text}</span>
        {activity?.deadline && <strong>Para el {longDate(activity.deadline)}</strong>}
        <p>{activity?.instructions || activity?.description || 'El comité pide que le cuenten cómo fue esta actividad.'}</p>
      </div>
      {assignment.status === 'Observada' && assignment.feedback && (
        <p className="qm-warning"><strong>El comité te pide:</strong> {assignment.feedback}</p>
      )}
      {assignment.status === 'Aprobada' && <p className="qm-note ok"><CheckCircle2 size={18} /> El comité ya recibió y aprobó esta respuesta.</p>}

      <div className="qm-card">
        <span className="qm-field-label">¿Cuándo lo hicieron?</span>
        {options.length > 0 && (
          <div className="qm-choice-list compact">
            {options.map(e => {
              const figures = figuresFor(e)
              return (
                <button key={e.id} type="button" className={`qm-choice${eventId === e.id ? ' selected' : ''}`} aria-pressed={eventId === e.id} onClick={() => choose(e)}>
                  <span className="qm-choice-copy">
                    <strong>{e.name}</strong>
                    <small>{longDate(e.date).replace(/^./, c => c.toUpperCase())}{figures.hasList ? ` · ${figures.people + figures.visitors} personas` : ''}</small>
                  </span>
                  {eventId === e.id && <Check size={20} aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        )}
        <label className="qm-field">
          <span>{options.length ? 'Otra fecha' : 'Fecha'}</span>
          <input type="date" max={today()} value={date} onChange={e => { setDate(e.target.value || today()); setEventId('') }} />
        </label>
        {prefilled?.hasList && <p className="qm-note ok"><CheckCircle2 size={18} /> Los números salen de la lista que ya pasaste. Revisalos.</p>}
      </div>

      {(asksAttendance || asksOffering) && (
        <div className="qm-card">
          {asksAttendance && (
            <div className="qm-row">
              <label className="qm-field">
                <span>Hermanos</span>
                <input inputMode="numeric" value={people} onChange={e => setPeople(e.target.value.replace(/\D/g, ''))} placeholder="0" />
              </label>
              <label className="qm-field">
                <span>Visitas</span>
                <input inputMode="numeric" value={visitors} onChange={e => setVisitors(e.target.value.replace(/\D/g, ''))} placeholder="0" />
              </label>
            </div>
          )}
          {asksOffering && (
            <label className="qm-field">
              <span>Ofrenda reunida ($)</span>
              <input inputMode="decimal" value={offering} onChange={e => setOffering(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0" />
            </label>
          )}
        </div>
      )}

      <div className="qm-card">
        <label className="qm-field">
          <span>¿Algo para contar? (opcional)</span>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Fue de bendición, se convirtieron 2 personas." />
        </label>
        {photos.length > 0 && (
          <div className="qm-request-photos">
            {photos.map((p, i) => (
              <figure key={i}>
                <img src={p} alt={`Foto ${i + 1}`} />
                <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => setPhotos(list => list.filter((_, j) => j !== i))}><X size={16} /></button>
              </figure>
            ))}
          </div>
        )}
        {photos.length < 2 && (
          <label className="qm-photo">
            <Camera size={20} />
            <span>Agregar una foto (opcional)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void addPhoto(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        )}
      </div>

      {error && <p className="qm-error" role="alert">{error}</p>}
      {assignment.status !== 'Aprobada' && (
        <div className="qm-sticky">
          <button type="button" className="qm-primary big" disabled={busy} onClick={send}>
            <Check size={22} /> {busy ? 'Enviando…' : answered ? 'Enviar de nuevo' : 'Enviar al comité'}
          </button>
        </div>
      )}
    </section>
  )
}