import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImagePlus,
  MessageSquare,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  X
} from 'lucide-react'
import { personAgeCategory } from '../../shared/catalog.mjs'
import logoSecretaria from '../assets/logo-secretaria-nacional.png'
import { whatsappLink } from '../whatsapp'

type Row = { id: string; [key: string]: any }
type State = Record<string, Row[]>
type Kind = 'monthly' | 'quarterly'
type Page = { title: string; body: string; photos: string[] }
type SaveRecord = (collection: string, row: Row) => Promise<any>
const today = () => new Date().toLocaleDateString('sv-SE')
const money = (n: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(n)
const dateLabel = (s: string) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('es-UY') : '—')
const metricLabels: Record<string, string> = {
  encounters: 'Encuentros celebrados',
  attendance: 'Asistencias acumuladas',
  income: 'Ingresos (UYU)',
  expenses: 'Egresos (UYU)',
  baptismsWater: 'Bautismos en agua',
  baptismsSpirit: 'Bautismos en Espíritu',
  preachingPlaces: 'Lugares de predicación',
  refam: 'Células / REFAM',
  homeServices: 'Cultos de hogar realizados',
  loveBaskets: 'Canastas de amor',
  intercession: 'Miembros en intercesión',
  men: 'Promedio caballeros',
  women: 'Promedio damas',
  youth: 'Promedio jóvenes',
  children: 'Promedio niños',
  visitors: 'Promedio visitas'
}

const automaticMetricKeys = [
  'encounters', 'attendance', 'income', 'expenses', 'baptismsWater',
  'preachingPlaces', 'refam', 'men', 'women', 'youth', 'children', 'visitors'
]
const manualMetricKeys = ['baptismsSpirit', 'homeServices', 'loveBaskets', 'intercession']

// Planilla oficial de la Secretaría Nacional: el orden y la redacción siguen el formulario en papel.
const officialCounts: Array<[key: string, before: string, bold: string, after: string]> = [
  ['baptismsWater', 'Número de hermanos ', 'Bautizados en agua', ''],
  ['baptismsSpirit', 'Número de hermanos ', 'Bautizados en el Espíritu Santo', ''],
  ['preachingPlaces', 'Número de ', 'Lugares de predicación', ' existentes'],
  ['refam', 'Número de ', 'REFAM', ' existentes'],
  ['homeServices', 'Número de ', 'Cultos de Hogar', ' realizados'],
  ['loveBaskets', 'Número de ', 'Canastas de Amor', ' entregadas'],
  ['intercession', 'Número de hermanos integrantes de la ', 'Intercesión', '']
]
const officialAverages: Array<[key: string, label: string]> = [
  ['men', 'Caballeros'],
  ['women', 'Damas'],
  ['youth', 'Jóvenes'],
  ['children', 'Niños'],
  ['visitors', 'Visitas']
]
const annexKeys = ['encounters', 'attendance', 'income', 'expenses']
const NATIONAL_FOOTER = {
  address: 'Ruta 26 1223 Leandro Gómez Melo, Uruguay.',
  phone: '+598 94204023',
  email: 'secretariaieanjesusuruguay@gmail.com'
}

export function reportSourceData(state: State, church: string, period: { from: string; to: string }) {
  const childPlaces = (state.churches || [])
    .filter(row => row.isPreachingPlace === 'Sí' && row.parentChurchId === church)
    .map(row => row.id)
  const belongsToChurch = (row: Row) =>
    row.churchId === church || childPlaces.includes(row.churchId) || row.preachingPlaceId === church || childPlaces.includes(row.preachingPlaceId)
  const events = (state.events || []).filter(
    event => belongsToChurch(event) && event.date >= period.from && event.date <= period.to
  )
  const eventIds = new Set(events.map(event => event.id))
  const attendance = (state.attendance || []).filter(row => eventIds.has(row.eventId))
  const completedAssignments = (state.activityAssignments || []).filter(assignment => {
    const activity = (state.nationalActivities || []).find(row => row.id === assignment.activityId)
    const date = assignment.localDate || assignment.submittedAt?.slice(0, 10) || activity?.date || ''
    return assignment.churchId === church && ['Enviada', 'Aprobada', 'Corregida'].includes(assignment.status) && date >= period.from && date <= period.to
  })
  const standaloneAssignments = completedAssignments.filter(assignment => {
    const linkedEvent = events.find(event => event.id === assignment.eventId || (assignment.activityId && event.activityId === assignment.activityId))
    return !linkedEvent || !attendance.some(list => list.eventId === linkedEvent.id)
  })
  const additionalAssignments = standaloneAssignments.filter(assignment =>
    !events.some(event => event.id === assignment.eventId || (assignment.activityId && event.activityId === assignment.activityId))
  )
  const peopleById = new Map((state.people || []).map(person => [person.id, person]))
  let men = 0
  let women = 0
  let youth = 0
  let children = 0
  let visitors = standaloneAssignments.reduce((sum, assignment) => sum + Number(assignment.visitorsCount || 0), 0)
  for (const list of attendance) {
    visitors += Number(list.visitors || 0)
    for (const personId of list.people || []) {
      const person = peopleById.get(personId)
      if (!person) continue
      const ageCategory = personAgeCategory(person)
      if (ageCategory === 'Joven') youth++
      else if (ageCategory === 'Niño') children++
      else if (person.gender === 'Masculino') men++
      else if (person.gender === 'Femenino') women++
    }
  }
  const divisor = attendance.length || 1
  const visitorDivisor = attendance.length + standaloneAssignments.length || 1
  const transactions = (state.transactions || []).filter(
    row => belongsToChurch(row) && !/diezmo/i.test([row.category, row.name, row.description, row.subCategory].filter(Boolean).join(' ')) &&
      isCash(row) && row.date >= period.from && row.date <= period.to
  )
  const sumDirection = (direction: string) =>
    transactions
      .filter(row => row.direction === direction)
      .reduce((sum, row) => sum + Math.round(Number(row.amount || 0) * 100), 0) / 100
  return {
    events,
    attendance,
    transactions,
    metrics: {
      // Solo cuentan los encuentros que tienen lista: una actividad agendada que no se hizo no suma.
      encounters: new Set(attendance.map(list => list.eventId)).size + additionalAssignments.length,
      attendance: attendance.reduce((sum, row) => sum + (row.people?.length || 0) + Number(row.visitors || 0), 0) + standaloneAssignments.reduce((sum, assignment) => sum + Number(assignment.attendanceCount || 0) + Number(assignment.visitorsCount || 0), 0),
      income: sumDirection('Ingreso'),
      expenses: sumDirection('Egreso'),
      // Un bautismo del que solo se sabe el año no se cuenta en ningún mes.
      baptismsWater: (state.people || []).filter(person => belongsToChurch(person) && person.baptismPrecision !== 'Solo año' && person.baptism >= period.from && person.baptism <= period.to).length,
      preachingPlaces: childPlaces.length,
      refam: (state.groups || []).filter(group => belongsToChurch(group) && !['Inactivo', 'Archivado'].includes(group.status) && /c[eé]lula|refam|grupo de amistad/i.test(`${group.kind || ''} ${group.name || ''}`)).length,
      men: Math.round(men / divisor),
      women: Math.round(women / divisor),
      youth: Math.round(youth / divisor),
      children: Math.round(children / divisor),
      visitors: Math.round(visitors / visitorDivisor)
    }
  }
}

function activitySuggestions(state: State, church: string, period: { from: string; to: string }, events: Row[]) {
  const suggestions: Array<{ title: string; body: string; date: string; source: string }> = []
  const add = (suggestion: { title: string; body: string; date: string; source: string }) => {
    const key = suggestion.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    const existing = suggestions.find(row => row.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === key)
    if (existing) {
      if (suggestion.body && !existing.body.includes(suggestion.body)) existing.body = [existing.body, suggestion.body].filter(Boolean).join('\n\n')
      return
    }
    suggestions.push(suggestion)
  }
  for (const event of events) {
    const routineWorship = event.scheduleId || /^culto (congregacional|habitual)( ·.*)?$/i.test(event.name || '')
    if (routineWorship) continue
    const list = (state.attendance || []).find(row => row.eventId === event.id)
    const attendanceNote = list ? `Asistencia registrada: ${(list.people?.length || 0) + Number(list.visitors || 0)} personas.` : ''
    add({
      title: event.name || 'Actividad congregacional',
      body: [event.description, event.location ? `Lugar: ${event.location}.` : '', attendanceNote].filter(Boolean).join('\n\n'),
      date: event.date || '',
      source: 'Evento del calendario'
    })
  }
  const completedStatuses = new Set(['Enviada', 'Aprobada', 'Corregida'])
  for (const assignment of state.activityAssignments || []) {
    if (assignment.churchId !== church || !completedStatuses.has(assignment.status)) continue
    const activity = (state.nationalActivities || []).find(row => row.id === assignment.activityId)
    const date = assignment.localDate || assignment.submittedAt?.slice(0, 10) || activity?.date || ''
    if (!date || date < period.from || date > period.to) continue
    add({
      title: activity?.name || assignment.name || 'Actividad de comité',
      body: [assignment.description, assignment.reportSummary, assignment.achievementNotes, activity?.description, activity?.instructions]
        .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)
        .join('\n\n'),
      date,
      source: `Actividad enviada · ${activity?.committeeKey || assignment.committeeKey || 'Comité nacional'}`
    })
  }
  return suggestions
}

export function reportPeriod(kind: Kind, month: string) {
  const [year, m] = month.split('-').map(Number)
  const start = kind === 'quarterly' ? Math.floor((m - 1) / 4) * 4 : m - 1
  return {
    key: kind === 'quarterly' ? `${year}-C${Math.floor(start / 4) + 1}` : month,
    from: `${year}-${String(start + 1).padStart(2, '0')}-01`,
    to: new Date(year, start + (kind === 'quarterly' ? 4 : 1), 0).toLocaleDateString('sv-SE')
  }
}

const inScope = (row: Row, scope: string) => row.churchId === scope || row.preachingPlaceId === scope
const isCash = (row: Row) => !['Cuenta por cobrar', 'Cuenta por pagar'].includes(row.accountType)

export function ReportHub({
  state,
  scope,
  save,
  compressPhoto,
  canReview = false,
  committeeKey
}: {
  state: State
  scope: string
  save: SaveRecord
  compressPhoto: (f: File, w?: number, h?: number, q?: number) => Promise<string>
  canReview?: boolean
  committeeKey?: string
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [month, setMonth] = useState(today().slice(0, 7))
  const [church, setChurch] = useState(scope)
  const [editing, setEditing] = useState<{ kind: Kind; month: string; church: string; record?: Row; readOnly?: boolean } | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState('')
  const wanted = new URLSearchParams(location.search).get('crear')
  const wantedChurch = new URLSearchParams(location.search).get('iglesia')

  useEffect(() => {
    if (wantedChurch && !scope) setChurch(wantedChurch)
  }, [wantedChurch, scope])

  function open(kind: Kind, existing?: Row, targetChurch?: string) {
    const chId = targetChurch || existing?.churchId || church
    if (!chId && !existing) {
      setError('Selecciona la congregación cuyo informe deseas consultar o revisar.')
      return
    }
    const period = reportPeriod(kind, month)
    const record =
      existing ||
      state.monthlyReports.find(r => inScope(r, chId) && r.month === period.key && (r.reportType || 'monthly') === kind)
    const savedMonth =
      record?.from?.slice(0, 7) ||
      (record?.month?.includes('-C')
        ? `${record.month.slice(0, 4)}-${String((Number(record.month.slice(-1)) - 1) * 4 + 1).padStart(2, '0')}`
        : record?.month) ||
      month
    setEditing({ kind, month: savedMonth, church: record?.preachingPlaceId || record?.churchId || chId, record, readOnly: canReview && !scope })
    setError('')
  }

  useEffect(() => {
    setChurch(scope)
    setEditing(null)
  }, [scope])

  useEffect(() => {
    if (wanted === 'monthly' || wanted === 'quarterly') {
      if (scope) open(wanted)
      else setError('Selecciona una congregación para consultar su informe enviado.')
      navigate('/informes', { replace: true })
    }
  }, [wanted, scope])

  // "Imprimir resumen" en Nacional imprime la hoja oficial del mes, no la pantalla.
  const [printingSummary, setPrintingSummary] = useState(false)
  useEffect(() => {
    if (!canReview || scope) return
    const start = () => setPrintingSummary(true)
    window.addEventListener(PRINT_NATIONAL_SUMMARY, start)
    return () => window.removeEventListener(PRINT_NATIONAL_SUMMARY, start)
  }, [canReview, scope])
  useEffect(() => {
    if (!printingSummary) return
    const html = document.documentElement
    html.classList.add('report-studio-open')
    const done = () => setPrintingSummary(false)
    window.addEventListener('afterprint', done)
    // Un momento para que el logo y la letra estén listos antes de abrir la impresión.
    const timer = window.setTimeout(() => window.print(), 300)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', done)
      html.classList.remove('report-studio-open')
    }
  }, [printingSummary])

  const history = state.monthlyReports
    .filter(r => !church || inScope(r, church))
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))

  async function review(record: Row, status: string) {
    setPending(record.id)
    setError('')
    try {
      await save('monthlyReports', { ...record, status })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending('')
    }
  }

  // En Comité Nacional los informes corresponden al propio comité (Lote 2)
  if (committeeKey) {
    return null
  }

  const mainChurches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const monthlyPeriod = reportPeriod('monthly', month)
  const quarterlyPeriod = reportPeriod('quarterly', month)

  // --- FLUJO DE ADMINISTRACIÓN NACIONAL: RECEPCIÓN Y REVISIÓN POR CONGREGACIÓN (LOTE 1) ---
  if (canReview && !scope) {
    const receivedCount = mainChurches.filter(ch => {
      const rep = state.monthlyReports.find(r => r.churchId === ch.id && r.month === monthlyPeriod.key)
      return rep && ['Enviado', 'Recibido', 'Revisado', 'Confirmado'].includes(rep.status)
    }).length
    const confirmedCount = mainChurches.filter(ch => {
      const rep = state.monthlyReports.find(r => r.churchId === ch.id && r.month === monthlyPeriod.key)
      return rep && ['Recibido', 'Revisado', 'Confirmado'].includes(rep.status)
    }).length

    return (
      <>
        {printingSummary && createPortal(
          <div id="report-print-root">
            <NationalSummaryDocument state={state} month={month} />
          </div>,
          document.body
        )}
        <section className="report-preparation" aria-label="Recepción nacional de informes">
          <div className="report-preparation-controls">
            <div>
              <span className="eyebrow">Supervisión Nacional · Recepción y Cumplimiento</span>
              <h3>Informes recibidos por congregación ({monthlyPeriod.key})</h3>
              <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#5b6f82' }}>
                Revisa y confirma los informes mensuales y cuatrimestrales enviados por cada congregación.
              </p>
            </div>
            <label>
              Período de consulta
              <input
                type="month"
                value={month}
                onChange={e => {
                  if (e.target.value) setMonth(e.target.value)
                }}
              />
            </label>
            <label>
              Filtrar congregación
              <select value={church} onChange={e => setChurch(e.target.value)}>
                <option value="">Todas las congregaciones</option>
                {mainChurches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="national-kpi-strip" style={{ marginTop: 14 }}>
            <div className="national-kpi-card">
              <span>Congregaciones evaluadas</span>
              <strong>{mainChurches.length}</strong>
              <small>Período {monthlyPeriod.key}</small>
            </div>
            <div className="national-kpi-card">
              <span>Informes enviados / recibidos</span>
              <strong>
                {receivedCount} de {mainChurches.length}
              </strong>
              <small>Cumplimiento: {mainChurches.length ? Math.round((receivedCount / mainChurches.length) * 100) : 0}%</small>
            </div>
            <div className="national-kpi-card">
              <span>Confirmados / Revisados</span>
              <strong>{confirmedCount}</strong>
              <small>Verificados por Secretaría Nacional</small>
            </div>
            <div className="national-kpi-card">
              <span>Pendientes u observados</span>
              <strong>{mainChurches.length - receivedCount}</strong>
              <small>Requieren seguimiento</small>
            </div>
          </div>

          {/* Tarjetas por congregación para el período seleccionado */}
          <div className="congregation-cards-grid" style={{ marginTop: 16 }}>
            {mainChurches
              .filter(c => !church || c.id === church)
              .map(ch => {
                const mRep = state.monthlyReports.find(
                  r => r.churchId === ch.id && r.month === monthlyPeriod.key && (r.reportType || 'monthly') === 'monthly'
                )
                const qRep = state.monthlyReports.find(
                  r => r.churchId === ch.id && r.month === quarterlyPeriod.key && r.reportType === 'quarterly'
                )
                const st = mRep?.status || 'Pendiente'
                const safeMetrics = reportSourceData(state, ch.id, monthlyPeriod).metrics
                return (
                  <article key={ch.id} className="congregation-summary-card">
                    <div className="congregation-card-head">
                      <div>
                        <span className="eyebrow">{ch.department || ch.city}</span>
                        <h4>{ch.name}</h4>
                      </div>
                      <span className={`status-pill status-${st}`}>{st}</span>
                    </div>
                    <p style={{ margin: '4px 0 10px', fontSize: '.82rem', color: '#5b6f82' }}>
                      Pastor: <strong>{ch.pastor || '—'}</strong> · Cuatrimestral ({quarterlyPeriod.key}):{' '}
                      <strong>{qRep?.status || 'Sin entrega'}</strong>
                    </p>
                    {mRep ? (
                      <div className="congregation-card-metrics">
                        <div>
                          <span>Encuentros</span>
                          <strong>{mRep.metrics?.encounters ?? '—'}</strong>
                        </div>
                        <div>
                          <span>Asistencia</span>
                          <strong>{mRep.metrics?.attendance ?? '—'}</strong>
                        </div>
                        <div>
                          <span>Ingresos</span>
                          <strong>{money(Number(safeMetrics.income || 0))}</strong>
                        </div>
                        <div>
                          <span>Egresos</span>
                          <strong>{money(Number(safeMetrics.expenses || 0))}</strong>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '.83rem', color: '#7a8a99', margin: '8px 0' }}>
                        La congregación aún no envió el informe de {monthlyPeriod.key}.
                      </p>
                    )}

                    <div className="congregation-card-footer" style={{ flexWrap: 'wrap', gap: 6 }}>
                      {mRep && (
                        <button
                          type="button"
                          className="secondary-action compact-btn"
                          onClick={() => open('monthly', mRep, ch.id)}
                        >
                          Abrir documento
                        </button>
                      )}
                      {mRep && ['Enviado', 'Borrador'].includes(mRep.status) && (
                        <button
                          type="button"
                          className="primary-action compact-btn"
                          disabled={pending === mRep.id}
                          onClick={() => review(mRep, 'Confirmado')}
                        >
                          {pending === mRep.id ? 'Guardando…' : 'Confirmar recepción'}
                        </button>
                      )}
                      {mRep && mRep.status !== 'Observado' && (
                        <button
                          type="button"
                          className="secondary-action compact-btn"
                          disabled={pending === mRep.id}
                          onClick={() => review(mRep, 'Observado')}
                        >
                          Observar
                        </button>
                      )}
                      {whatsappLink(ch.phone) && (
                        <a
                          href={whatsappLink(ch.phone, `Hola, Dios le bendiga. Le escribimos por el informe mensual de ${monthlyPeriod.key} de ${ch.name}.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="link-inline whatsapp-link"
                        >
                          <MessageSquare size={14} /> Escribir por WhatsApp
                        </a>
                      )}
                    </div>
                  </article>
                )
              })}
          </div>

          {error && (
            <p role="alert" className="crm-error">
              {error}
            </p>
          )}

          <details className="report-history" open>
            <summary>
              Bandeja histórica de informes recibidos <span className="count-pill">{history.length}</span>
            </summary>
            <div className="report-history-list">
              {history.length ? (
                history.map(r => (
                  <div className="report-history-row" key={r.id}>
                    <FileText size={20} />
                    <div>
                      <strong>{r.name}</strong>
                      <small>
                        {state.churches.find(c => c.id === r.churchId)?.name || 'Congregación'} · Estado: {r.status}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => open(r.reportType || 'monthly', r, r.churchId)}
                    >
                      Abrir
                    </button>
                    {['Enviado', 'Recibido', 'Borrador'].includes(r.status) && (
                      <button
                        type="button"
                        className="primary-action"
                        disabled={pending === r.id}
                        onClick={() => review(r, r.status === 'Enviado' ? 'Recibido' : 'Revisado')}
                      >
                        {pending === r.id
                          ? 'Guardando…'
                          : r.status === 'Enviado'
                          ? 'Confirmar recepción'
                          : 'Marcar revisado'}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>No hay entregas registradas para el filtro actual.</p>
              )}
            </div>
          </details>
        </section>
        {editing && (
          <ReportStudio
            key={`${editing.church}:${editing.kind}:${editing.month}`}
            {...editing}
            state={state}
            save={save}
            compressPhoto={compressPhoto}
            onClose={() => setEditing(null)}
          />
        )}
      </>
    )
  }

  // --- FLUJO LOCAL DE CONGREGACIÓN: PREPARAR Y ENVIAR INFORMES (LOTE 3) ---
  return (
    <>
      <section className="report-preparation" aria-label="Preparar informes">
        <div className="report-preparation-controls">
          <div>
            <span className="eyebrow">Preparar, revisar y entregar</span>
            <h3>Un documento para cada período</h3>
          </div>
          <label>
            Mes de referencia
            <input
              type="month"
              value={month}
              onChange={e => {
                if (e.target.value) setMonth(e.target.value)
              }}
            />
          </label>
        </div>
        <div className="report-choice-grid">
          {(['monthly', 'quarterly'] as Kind[]).map(kind => {
            const p = reportPeriod(kind, month)
            const report = history.find(
              r => inScope(r, church) && r.month === p.key && (r.reportType || 'monthly') === kind
            )
            return (
              <article className="report-choice" key={kind}>
                <span className="document-symbol">
                  <FileText size={26} />
                </span>
                <div>
                  <span className="eyebrow">{kind === 'monthly' ? 'Mes a mes' : 'Visión de cuatro meses'}</span>
                  <h3>Informe {kind === 'monthly' ? 'mensual' : 'cuatrimestral'}</h3>
                  <p>
                    {dateLabel(p.from)} — {dateLabel(p.to)}
                  </p>
                  <span className={`status-pill status-${report?.status || 'Pendiente'}`}>
                    {report?.status || 'Pendiente'}
                  </span>
                </div>
                <button className="primary-action" onClick={() => open(kind)}>
                  {report ? 'Abrir informe' : 'Crear informe'} {kind === 'monthly' ? 'mensual' : 'cuatrimestral'}
                  <ArrowRight size={17} />
                </button>
              </article>
            )
          })}
        </div>
        {error && (
          <p role="alert" className="crm-error">
            {error}
          </p>
        )}
        <details className="report-history" open={canReview || undefined}>
          <summary>
            Informes guardados y entregas <span className="count-pill">{history.length}</span>
          </summary>
          <div className="report-history-list">
            {history.length ? (
              history.map(r => (
                <div className="report-history-row" key={r.id}>
                  <FileText size={20} />
                  <div>
                    <strong>{r.name}</strong>
                    <small>
                      {state.churches.find(c => c.id === r.churchId)?.name || 'Congregación'} · {r.status}
                    </small>
                  </div>
                  <button className="secondary-action" onClick={() => open(r.reportType || 'monthly', r)}>
                    Abrir
                  </button>
                </div>
              ))
            ) : (
              <p>No hay borradores ni entregas en este espacio.</p>
            )}
          </div>
        </details>
      </section>
      {editing && (
        <ReportStudio
          key={`${editing.church}:${editing.kind}:${editing.month}`}
          {...editing}
          state={state}
          save={save}
          compressPhoto={compressPhoto}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function ReportStudio({
  state,
  church,
  kind,
  month,
  record,
  readOnly = false,
  save,
  compressPhoto,
  onClose
}: {
  state: State
  church: string
  kind: Kind
  month: string
  record?: Row
  readOnly?: boolean
  save: SaveRecord
  compressPhoto: (f: File, w?: number, h?: number, q?: number) => Promise<string>
  onClose: () => void
}) {
  const period = reportPeriod(kind, month)
  const churchRow = state.churches.find(c => c.id === church)
  const title = `Informe ${kind === 'monthly' ? 'mensual' : 'cuatrimestral'}`
  const sourceData = reportSourceData(state, church, period)
  const { events, attendance, transactions } = sourceData
  const totals = sourceData.metrics
  const suggestions = activitySuggestions(state, church, period, events)
  const initialOverrides = Array.isArray(record?.metricOverrides)
    ? record.metricOverrides.filter((key: string) =>
        Object.hasOwn(metricLabels, key) &&
        (record?.incomePrivacyVersion === 1 || !['income', 'expenses'].includes(key))
      )
    : [
        ...automaticMetricKeys.filter(key => record?.metrics && Number(record.metrics[key] || 0) !== totals[key as keyof typeof totals]),
        ...manualMetricKeys.filter(key => Number(record?.metrics?.[key] || 0) > 0)
      ]
  const [id, setId] = useState(record?.id || '')
  const [status, setStatus] = useState(record?.status || 'Borrador')
  const [pastor, setPastor] = useState(record?.pastor || churchRow?.pastor || '')
  const [secretary, setSecretary] = useState(record?.secretary || '')
  // La licencia rara vez cambia: se toma del último informe de la congregación.
  const lastReport = state.monthlyReports
    .filter(r => r.churchId === church && r.id !== record?.id && r.license)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))[0]
  const [license, setLicense] = useState(record?.license || lastReport?.license || '')
  const [place, setPlace] = useState(record?.place || churchRow?.city || '')
  const [summary, setSummary] = useState(record?.summary || '')
  const [metrics, setMetrics] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {
      ...Object.fromEntries(Object.keys(metricLabels).map(k => [k, 0])),
      ...totals,
      ...(record?.incomePrivacyVersion === 1
        ? record?.metrics
        : { ...record?.metrics, income: totals.income, expenses: totals.expenses })
    }
    // En un borrador, las cifras automáticas que nadie corrigió se recalculan con lo último anotado.
    if (!readOnly && !['Enviado', 'Recibido', 'Revisado'].includes(record?.status || '')) {
      for (const key of automaticMetricKeys) {
        if (!initialOverrides.includes(key)) initial[key] = totals[key as keyof typeof totals]
      }
    }
    return initial
  })
  const [metricOverrides, setMetricOverrides] = useState<string[]>(initialOverrides)
  const [pages, setPages] = useState<Page[]>(record?.pages || [])
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const [closeQuestion, setCloseQuestion] = useState(false)
  const [sendQuestion, setSendQuestion] = useState(false)
  const [preview, setPreview] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.querySelector('.studio-canvas')?.scrollTo({ top: 0 })
  }, [active])
  const pageCount = pages.length + 2
  useEffect(() => {
    // La planilla oficial usa Poppins; sin internet queda la letra del sistema.
    if (document.getElementById('font-poppins')) return
    const link = document.createElement('link')
    link.id = 'font-poppins'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700;1,800&display=swap'
    document.head.appendChild(link)
  }, [])
  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('report-studio-open')
    return () => {
      node?.close()
      document.body.style.overflow = old
      document.documentElement.classList.remove('report-studio-open')
    }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty])
  const changed = () => {
    if (readOnly) return
    setDirty(true)
    setMessage('Hay cambios sin guardar.')
  }
  function updatePage(index: number, change: Partial<Page>) {
    setPages(p => p.map((page, i) => (i === index ? { ...page, ...change } : page)))
    changed()
  }
  async function persist(nextStatus: string, closeAfter = false) {
    if (readOnly) return
    setBusy(true)
    setMessage('')
    setSendQuestion(false)
    try {
      const result = await save('monthlyReports', {
        ...record,
        id,
        name: `${title} ${period.key}`,
        churchId: church,
        reportType: kind,
        month: period.key,
        from: period.from,
        to: period.to,
        status: nextStatus,
        pastor,
        license,
        place,
        secretary,
        summary,
        pages,
        metrics,
        metricOverrides,
        incomePrivacyVersion: 1,
        notes: record?.notes || 'Preparado en el editor de informes.'
      })
      setId(result.id)
      setStatus(nextStatus)
      setDirty(false)
      setMessage(
        nextStatus === 'Enviado'
          ? 'Informe enviado. Ya figura en las entregas de la Administración Nacional de este espacio local.'
          : 'Borrador guardado. Puedes cerrar y continuar más tarde.'
      )
      if (closeAfter) onClose()
    } catch (e) {
      setMessage(`No se pudo guardar: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }
  async function addPhotos(files: FileList | null, index: number) {
    if (!files) return
    setPhotoBusy(true)
    setMessage('')
    try {
      const available = Math.max(0, 4 - (pages[index]?.photos.length || 0))
      const photos = await Promise.all(
        Array.from(files)
          .slice(0, available)
          .map(f => compressPhoto(f, 1000, 750, 0.75))
      )
      setPages(p =>
        p.map((page, i) => (i === index ? { ...page, photos: [...page.photos, ...photos].slice(0, 4) } : page))
      )
      changed()
    } catch (e) {
      setMessage(`No se pudo cargar la foto: ${(e as Error).message}`)
    } finally {
      setPhotoBusy(false)
    }
  }
  const changedTotals = automaticMetricKeys.some(key => metricOverrides.includes(key))
  const textSetters: Record<TextField, (value: string) => void> = {
    place: setPlace,
    pastor: setPastor,
    license: setLicense,
    secretary: setSecretary,
    summary: setSummary
  }
  const documentEdit: DocumentEdit = {
    text: (field, value) => {
      textSetters[field](value)
      changed()
    },
    metric: (key, value) => {
      setMetrics(m => ({ ...m, [key]: value }))
      setMetricOverrides(current => current.includes(key) ? current : [...current, key])
      changed()
    },
    page: updatePage,
    addPhotos: (files, index) => void addPhotos(files, index),
    removePage: index => {
      setPages(p => p.filter((_, i) => i !== index))
      setActive(0)
      changed()
    },
    photoBusy
  }
  function addSuggestedPage(suggestion: (typeof suggestions)[number]) {
    if (pages.length >= 20) return
    const body = [
      suggestion.date ? `Fecha: ${dateLabel(suggestion.date)}` : '',
      suggestion.source ? `Origen: ${suggestion.source}` : '',
      suggestion.body
    ].filter(Boolean).join('\n\n')
    const next = [...pages, { title: suggestion.title, body, photos: [] }]
    setPages(next)
    setActive(next.length)
    changed()
  }
  const documentData = {
    title,
    churchName: churchRow?.name || church,
    period,
    pastor,
    license,
    place: place || churchRow?.name || '',
    reportDate: ['Borrador', 'Guardado'].includes(status) ? today() : String(record?.updatedAt || '').slice(0, 10) || today(),
    secretary,
    summary,
    metrics,
    pages,
    events,
    attendance,
    transactions,
    kind,
    changedTotals
  }
  return (
    <>
      {createPortal(
        <dialog
          className="document-studio"
          ref={dialog}
          aria-labelledby="studio-title"
          onCancel={e => {
            e.preventDefault()
            dirty ? setCloseQuestion(true) : onClose()
          }}
        >
          <header className="studio-toolbar">
            <div>
                <span className="eyebrow">{readOnly ? 'Revisión nacional' : 'Editor de documentos'}</span>
              <h2 id="studio-title">{title}</h2>
              <small>
                {period.key} · {dirty ? 'Cambios sin guardar' : status}
              </small>
            </div>
            <div className="studio-actions">
              {!readOnly && (
                <button
                  className="secondary-action"
                  disabled={busy || photoBusy}
                  onClick={() => persist('Borrador')}
                >
                  <Save size={17} />
                  <span>Guardar borrador</span>
                </button>
              )}
              <button className="secondary-action" onClick={() => window.print()}>
                <Printer size={17} />
                <span>Imprimir / guardar PDF</span>
              </button>
              {!readOnly && (
                <button
                  className="primary-action"
                  disabled={busy || photoBusy}
                  onClick={() => setSendQuestion(true)}
                >
                  <Send size={17} />
                  <span>Enviar informe</span>
                </button>
              )}
              <button
                className="studio-close"
                aria-label="Cerrar editor de informes"
                onClick={() => (dirty ? setCloseQuestion(true) : onClose())}
              >
                <X />
              </button>
            </div>
          </header>
          {readOnly && <p className="studio-readonly-note">Vista de consulta. El contenido del informe se administra desde su congregación.</p>}
          <div className="studio-layout">
            <aside className="studio-pages">
              <span className="eyebrow">Páginas del documento</span>
              <button className={active === 0 ? 'active' : ''} onClick={() => setActive(0)}>
                <span>01</span> Resumen y planilla
              </button>
              {pages.map((p, i) => (
                <button
                  key={i}
                  className={active === i + 1 ? 'active' : ''}
                  onClick={() => setActive(i + 1)}
                >
                  <span>{String(i + 2).padStart(2, '0')}</span>
                  {p.title || 'Actividad'}
                </button>
              ))}
              <button
                className={active === pageCount - 1 ? 'active' : ''}
                onClick={() => setActive(pageCount - 1)}
              >
                <span>{String(pageCount).padStart(2, '0')}</span> Anexo y gráficos
              </button>
              {!readOnly && (
                <button
                  className="secondary-action add-document-page"
                  disabled={pages.length >= 20}
                  onClick={() => {
                    const next = [...pages, { title: 'Nueva actividad', body: '', photos: [] }]
                    setPages(next)
                    setActive(next.length)
                    changed()
                  }}
                >
                  <Plus size={18} /> Agregar actividad manual
                </button>
              )}
              <p>Los cambios del documento no modifican las asistencias ni los movimientos originales.</p>
            </aside>
            <main className="studio-canvas">
              <div className="studio-page-controls">
                <button aria-label="Página anterior" disabled={!active} onClick={() => setActive(a => a - 1)}>
                  <ChevronLeft />
                </button>
                <span>
                  Página {active + 1} de {pageCount}
                </span>
                <button
                  aria-label="Página siguiente"
                  disabled={active === pageCount - 1}
                  onClick={() => setActive(a => a + 1)}
                >
                  <ChevronRight />
                </button>
                {readOnly ? <span>Vista de consulta</span> : (
                  <button className="secondary-action" onClick={() => setPreview(v => !v)}>
                    {preview ? 'Volver a editar' : 'Vista previa'}
                  </button>
                )}
              </div>
              {readOnly || preview ? (
                <DocumentPages {...documentData} only={active} />
              ) : (
                <>
                  <p className="studio-edit-hint">
                    {active === 0
                      ? 'Escribí directamente sobre la hoja: los cuadros amarillos se pueden cambiar. Los promedios, los lugares de predicación y las REFAM ya vienen completos con lo anotado en el Portal.'
                      : active === pageCount - 1
                        ? 'Estos datos salen de lo anotado en el Portal. Abajo podés escribir observaciones y el nombre de quien firma por la secretaría.'
                        : 'Escribí el título, contá qué se hizo y agregá hasta 4 fotos.'}
                  </p>
                  <div className="ofi-sheet-scroll">
                    <DocumentPages {...documentData} only={active} edit={documentEdit} />
                  </div>
                  {active === 0 && (
                    <section className="studio-helper">
                      {changedTotals && (
                        <div className="report-adjustment-tools">
                          <button
                            type="button"
                            className="report-reset-action"
                            aria-label="Restaurar cifras automáticas del CRM"
                            onClick={() => {
                              setMetrics(m => ({ ...m, ...Object.fromEntries(automaticMetricKeys.map(key => [key, totals[key as keyof typeof totals]])) }))
                              setMetricOverrides(current => current.filter(key => !automaticMetricKeys.includes(key)))
                              changed()
                            }}
                          >
                            <RotateCcw size={14} aria-hidden="true" /> Restaurar cifras automáticas
                          </button>
                        </div>
                      )}
                      <details className="report-activity-suggestions" open>
                        <summary>Agregar actividades realizadas <span>{suggestions.length}</span></summary>
                        <p className="paper-help">Sugerencias tomadas del calendario y de tareas de comités que ya fueron enviadas.</p>
                        {suggestions.length ? (
                          <div className="report-suggestion-list">
                            {suggestions.map((suggestion, index) => (
                              <button
                                type="button"
                                key={`${suggestion.title}-${index}`}
                                disabled={pages.length >= 20}
                                onClick={() => addSuggestedPage(suggestion)}
                              >
                                <strong>{suggestion.title}</strong>
                                <small>{dateLabel(suggestion.date)} · {suggestion.source}</small>
                                <span><Plus size={14} /> Añadir al informe</span>
                              </button>
                            ))}
                          </div>
                        ) : <p>No hay actividades especiales ni tareas completadas en este período.</p>}
                      </details>
                    </section>
                  )}
                </>
              )}
            </main>
          </div>
          {message && (
            <div className="studio-message" role="status">
              {message}
            </div>
          )}
          {(closeQuestion || sendQuestion) && (
            <div className="studio-confirm">
              <section
                role="alertdialog"
                aria-label={closeQuestion ? 'Cambios sin guardar' : 'Confirmar envío'}
              >
                <h3>{closeQuestion ? 'Tienes cambios sin guardar' : '¿Enviar este informe?'}</h3>
                <p>
                  {closeQuestion
                    ? 'Guarda el borrador para continuar después sin perder lo que escribiste.'
                    : 'Revisa los datos y las fotografías. Se guardará esta versión y aparecerá como enviada en la administración nacional.'}
                </p>
                <div>
                  <button
                    className="secondary-action"
                    onClick={() => {
                      setCloseQuestion(false)
                      setSendQuestion(false)
                    }}
                  >
                    Seguir editando
                  </button>
                  {closeQuestion && (
                    <button className="secondary-action" onClick={onClose}>
                      Salir sin guardar
                    </button>
                  )}
                  <button
                    className="primary-action"
                    disabled={busy}
                    onClick={() => persist(closeQuestion ? 'Borrador' : 'Enviado', closeQuestion)}
                  >
                    {busy ? 'Guardando…' : closeQuestion ? 'Guardar y cerrar' : 'Confirmar envío'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </dialog>,
        document.body
      )}
      {createPortal(
        <div id="report-print-root">
          <DocumentPages {...documentData} />
        </div>,
        document.body
      )}
    </>
  )
}

type DocumentData = {
  title: string
  churchName: string
  period: { key: string; from: string; to: string }
  pastor: string
  license: string
  place: string
  reportDate: string
  secretary: string
  summary: string
  metrics: Record<string, number>
  pages: Page[]
  events: Row[]
  attendance: Row[]
  transactions: Row[]
  kind: Kind
  changedTotals: boolean
}

const fullDate = (s: string) => (s ? s.split('-').reverse().join('/') : '')

function OfficialHeader() {
  return (
    <header className="ofi-band">
      <div className="ofi-band-words" aria-hidden="true">
        {[0, 1, 2, 3].map(row => <span key={row}>{'URUGUAY'.repeat(8)}</span>)}
      </div>
      <img src={logoSecretaria} alt="Iglesia Evangélica Apostólica del Nombre de Jesús · Uruguay" />
      <p>
        Un Señor, una Fe, un Bautismo. Efesios 4:5<br />
        Personería Jurídica Nº 7978<br />
        <strong>Secretaría Nacional</strong>
      </p>
    </header>
  )
}

function OfficialFoot() {
  return (
    <footer className="ofi-foot">
      <div className="ofi-band-words" aria-hidden="true">
        {[0, 1].map(row => <span key={row}>{'URUGUAY'.repeat(8)}</span>)}
      </div>
      <span>{NATIONAL_FOOTER.address}</span>
      <span>{NATIONAL_FOOTER.phone}<br />{NATIONAL_FOOTER.email}</span>
    </footer>
  )
}

function OfficialClosing({ pastor, secretary, edit }: Pick<DocumentData, 'pastor' | 'secretary'> & { edit?: DocumentEdit }) {
  return (
    <div className="ofi-closing">
      <div className="ofi-signatures">
        <div>
          <i aria-hidden="true" />
          <strong>{!pastor ? 'Pastor' : /^pastor/i.test(pastor) ? pastor : `Pastor ${pastor}`}</strong>
          <span>PASTOR LOCAL</span>
        </div>
        <div>
          <i aria-hidden="true" />
          <strong>
            {edit ? (
              <input
                className="ofi-input"
                aria-label="Nombre de la secretaría local"
                placeholder="Nombre de quien firma"
                value={secretary}
                onChange={e => edit.text('secretary', e.target.value)}
              />
            ) : secretary || ' '}
          </strong>
          <span>SECRETARÍA LOCAL</span>
        </div>
      </div>
      <OfficialFoot />
    </div>
  )
}

const SENT_STATUSES = ['Enviado', 'Recibido', 'Revisado', 'Confirmado']
const CONFIRMED_STATUSES = ['Recibido', 'Revisado', 'Confirmado']

// Hoja oficial que imprime la Administración Nacional: el estado de los informes de cada congregación en el mes.
function NationalSummaryDocument({ state, month }: { state: State; month: string }) {
  const monthly = reportPeriod('monthly', month)
  const quarterly = reportPeriod('quarterly', month)
  const rows = (state.churches || [])
    .filter(c => c.isPreachingPlace !== 'Sí')
    .map(ch => {
      const mRep = state.monthlyReports.find(r => r.churchId === ch.id && r.month === monthly.key && (r.reportType || 'monthly') === 'monthly')
      const qRep = state.monthlyReports.find(r => r.churchId === ch.id && r.month === quarterly.key && r.reportType === 'quarterly')
      const source = reportSourceData(state, ch.id, monthly).metrics
      return {
        ch,
        monthly: mRep?.status || 'Pendiente',
        quarterly: qRep?.status || 'Sin entrega',
        encounters: Number(mRep?.metrics?.encounters ?? source.encounters),
        attendance: Number(mRep?.metrics?.attendance ?? source.attendance),
        income: source.income,
        expenses: source.expenses
      }
    })
  const sent = rows.filter(r => SENT_STATUSES.includes(r.monthly)).length
  const confirmed = rows.filter(r => CONFIRMED_STATUSES.includes(r.monthly)).length
  const total = (key: 'encounters' | 'attendance' | 'income' | 'expenses') => rows.reduce((sum, r) => sum + r[key], 0)
  const monthName = new Date(`${monthly.key}-01T12:00:00`).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' }).toUpperCase()
  return (
    <article className="paper-page ofi-page">
      <OfficialHeader />
      <div className="ofi-body">
        <h2 className="ofi-title"><b>RESUMEN NACIONAL</b> DE INFORMES</h2>
        <div className="ofi-place">
          <span className="ofi-tag">MES</span>
          <span className="ofi-value">{monthName}</span>
          <span className="ofi-tag">FECHA</span>
          <span className="ofi-value">{fullDate(today())}</span>
        </div>
        <ul className="ofi-counts">
          <li><span>Número de <b>congregaciones</b></span><strong>{rows.length}</strong></li>
          <li><span>Informes mensuales <b>enviados</b></span><strong>{sent} de {rows.length}</strong></li>
          <li><span>Informes <b>confirmados</b> por Secretaría Nacional</span><strong>{confirmed}</strong></li>
          <li><span>Informes <b>pendientes u observados</b></span><strong>{rows.length - sent}</strong></li>
        </ul>
        <table className="ofi-summary">
          <colgroup>
            <col style={{ width: '26%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Congregación</th>
              <th>Mensual</th>
              <th>Cuatrim.</th>
              <th className="num">Encuentros</th>
              <th className="num">Asistencia</th>
              <th className="num">Ingresos</th>
              <th className="num">Egresos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.ch.id}>
                <td>
                  <strong>{r.ch.name}</strong>
                  <small>{r.ch.pastor || 'Pastor por asignar'}</small>
                </td>
                <td className={SENT_STATUSES.includes(r.monthly) ? 'ofi-ok' : 'ofi-due'}>{r.monthly}</td>
                <td>{r.quarterly}</td>
                <td className="num">{r.encounters}</td>
                <td className="num">{r.attendance}</td>
                <td className="num">{money(r.income)}</td>
                <td className="num">{money(r.expenses)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7}>Todavía no hay congregaciones registradas.</td></tr>
            )}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr>
                <td>Total nacional</td>
                <td colSpan={2}>{sent} de {rows.length} enviados</td>
                <td className="num">{total('encounters')}</td>
                <td className="num">{total('attendance')}</td>
                <td className="num">{money(total('income'))}</td>
                <td className="num">{money(total('expenses'))}</td>
              </tr>
            </tfoot>
          )}
        </table>
        <p className="ofi-summary-note">
          Ingresos y egresos sin diezmos, calculados con lo anotado en el Portal. Cuatrimestre {quarterly.key}.
        </p>
      </div>
      <div className="ofi-closing">
        <div className="ofi-signatures single">
          <div>
            <i aria-hidden="true" />
            <strong> </strong>
            <span>SECRETARÍA NACIONAL</span>
          </div>
        </div>
        <OfficialFoot />
      </div>
    </article>
  )
}

export const PRINT_NATIONAL_SUMMARY = 'portal:print-national-summary'

// Lo que se puede cambiar escribiendo directamente sobre la hoja oficial.
type TextField = 'place' | 'pastor' | 'license' | 'secretary' | 'summary'
type DocumentEdit = {
  text: (field: TextField, value: string) => void
  metric: (key: string, value: number) => void
  page: (index: number, change: Partial<Page>) => void
  addPhotos: (files: FileList | null, index: number) => void
  removePage: (index: number) => void
  photoBusy: boolean
}

// Gráficos del anexo con el mismo estilo de la planilla: barras de dinero y columnas de asistencia.
function OfficialCharts({ metrics, events, attendance }: Pick<DocumentData, 'metrics' | 'events' | 'attendance'>) {
  const income = Number(metrics.income || 0)
  const expenses = Number(metrics.expenses || 0)
  const moneyMax = Math.max(1, income, expenses)
  const lists = events
    .filter(event => attendance.some(list => list.eventId === event.id))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(event => ({
      label: fullDate(event.date).slice(0, 5),
      total: attendance
        .filter(list => list.eventId === event.id)
        .reduce((sum, list) => sum + (list.people?.length || 0) + Number(list.visitors || 0), 0)
    }))
    .slice(-12)
  const attendanceMax = Math.max(1, ...lists.map(list => list.total))
  return (
    <div className="ofi-charts">
      <h3 className="ofi-chart-title"><b>INGRESOS Y EGRESOS</b> DEL PERÍODO</h3>
      {([['Ingresos', income, ''], ['Egresos', expenses, 'out']] as const).map(([name, value, tone]) => (
        <div className="ofi-hbar" key={name}>
          <span>{name}</span>
          <i><b className={tone} style={{ width: `${(value / moneyMax) * 100}%` }} /></i>
          <strong>{money(value)}</strong>
        </div>
      ))}
      <h3 className="ofi-chart-title"><b>ASISTENCIA</b> POR ENCUENTRO</h3>
      {lists.length ? (
        <div className="ofi-columns">
          {lists.map((list, i) => (
            <div key={i}>
              <strong>{list.total}</strong>
              <i style={{ height: `${Math.max(4, (list.total / attendanceMax) * 100)}%` }} />
              <span>{list.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ofi-note">No hay listas de asistencia en el período.</p>
      )}
    </div>
  )
}

function DocumentPages(data: DocumentData & { only?: number; edit?: DocumentEdit }) {
  const { metrics, pages, only, kind, period, edit } = data
  const averageTotal = officialAverages.reduce((sum, [key]) => sum + Number(metrics[key] || 0), 0)
  const periodLabel = kind === 'monthly'
    ? new Date(`${period.key}-01T12:00:00`).toLocaleDateString('es-UY', { month: 'long' }).toUpperCase()
    : `${fullDate(period.from)} AL ${fullDate(period.to)}`
  // Al editar, cada dato es un campo dentro de su misma caja; al imprimir, es texto.
  const text = (field: TextField, value: string, placeholder: string) =>
    edit ? (
      <input className="ofi-input" aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => edit.text(field, e.target.value)} />
    ) : value
  const number = (key: string, asMoney = false) =>
    edit ? (
      <input
        className="ofi-input ofi-number"
        type="number"
        min="0"
        step={asMoney ? '.01' : '1'}
        inputMode={asMoney ? 'decimal' : 'numeric'}
        aria-label={metricLabels[key]}
        value={metrics[key] || 0}
        onChange={e => edit.metric(key, Math.max(0, Number(e.target.value) || 0))}
      />
    ) : asMoney ? money(metrics[key] || 0) : metrics[key] || 0
  return (
    <>
      {(only === undefined || only === 0) && (
        <article className={`paper-page ofi-page${edit ? ' ofi-editing' : ''}`}>
          <OfficialHeader />
          <div className="ofi-body">
            <h2 className="ofi-title"><b>INFORME {kind === 'monthly' ? 'MENSUAL' : 'CUATRIMESTRAL'}</b> CONGREGACIONAL</h2>
            <div className="ofi-place">
              <span className="ofi-tag">LUGAR</span>
              <span className="ofi-value">{text('place', data.place, 'Ciudad')}</span>
              <span className="ofi-tag">FECHA</span>
              <span className="ofi-value">{fullDate(data.reportDate)}</span>
            </div>
            <dl className="ofi-rows">
              <div><dt>{kind === 'monthly' ? 'MES' : 'PERÍODO'}</dt><dd>{periodLabel}</dd></div>
              <div><dt>CONGREGACIÓN</dt><dd><b>{data.churchName.toUpperCase()}</b></dd></div>
              <div><dt>PASTOR</dt><dd><b>{text('pastor', data.pastor, 'Nombre del pastor')}</b></dd></div>
              <div><dt>LICENCIA</dt><dd>{text('license', data.license, 'Ej. Ordenación')}</dd></div>
            </dl>
            <ul className="ofi-counts">
              {officialCounts.map(([key, before, bold, after]) => (
                <li key={key}>
                  <span>{before}<b>{bold}</b>{after}</span>
                  <strong>{number(key)}</strong>
                </li>
              ))}
            </ul>
            <h3 className="ofi-title small"><b>PROMEDIO TOTAL DE ASISTENCIA</b> EN LOS CULTOS</h3>
            <table className="ofi-averages">
              <thead>
                <tr>{officialAverages.map(([key, label]) => <th key={key}>{label}</th>)}<th>TOTAL</th></tr>
              </thead>
              <tbody>
                <tr>{officialAverages.map(([key]) => <td key={key}>{number(key)}</td>)}<td>{averageTotal}</td></tr>
              </tbody>
            </table>
          </div>
        </article>
      )}
      {pages.map(
        (p, i) =>
          (only === undefined || only === i + 1) && (
            <article className={`paper-page ofi-page ofi-activity${edit ? ' ofi-editing' : ''}`} key={i}>
              <div className="ofi-body">
                <h2 className="ofi-title light">ACTIVIDADES <b>DESTACADAS</b></h2>
                <div className="ofi-activity-head">
                  <span>{i + 1}</span>
                  <h3>
                    {edit ? (
                      <input
                        className="ofi-input ofi-upper"
                        aria-label="Título de la actividad"
                        placeholder="TÍTULO DE LA ACTIVIDAD"
                        maxLength={160}
                        value={p.title}
                        onChange={e => edit.page(i, { title: e.target.value })}
                      />
                    ) : (p.title || 'Actividad').toUpperCase()}
                  </h3>
                </div>
                {edit ? (
                  <textarea
                    className="ofi-activity-text ofi-input"
                    aria-label="Qué se hizo en la actividad"
                    placeholder="Contá qué se hizo, cuándo, quiénes participaron y cómo resultó…"
                    maxLength={6000}
                    value={p.body}
                    onChange={e => edit.page(i, { body: e.target.value })}
                  />
                ) : (
                  <p className="ofi-activity-text">{p.body || ' '}</p>
                )}
                {p.photos.length > 0 && (
                  <div className={`ofi-photos n${p.photos.length}`}>
                    {p.photos.map((photo, j) => (
                      <figure key={j}>
                        <img src={photo} alt={`Fotografía ${j + 1} de ${p.title}`} />
                        {edit && (
                          <button
                            type="button"
                            className="ofi-photo-remove"
                            aria-label={`Quitar fotografía ${j + 1}`}
                            onClick={() => edit.page(i, { photos: p.photos.filter((_, k) => k !== j) })}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
                {edit && (
                  <div className="ofi-edit-tools">
                    {p.photos.length < 4 && (
                      <label className="ofi-photo-add">
                        <ImagePlus size={20} />
                        <span>{edit.photoBusy ? 'Preparando fotos…' : `Agregar fotos (${p.photos.length} de 4)`}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={edit.photoBusy}
                          onChange={e => {
                            edit.addPhotos(e.target.files, i)
                            e.target.value = ''
                          }}
                        />
                      </label>
                    )}
                    <button type="button" className="secondary-action" onClick={() => edit.removePage(i)}>
                      Quitar esta actividad
                    </button>
                  </div>
                )}
              </div>
            </article>
          )
      )}
      {(only === undefined || only === pages.length + 1) && (
        <article className={`paper-page ofi-page ofi-activity ofi-annex${edit ? ' ofi-editing' : ''}`}>
          <div className="ofi-body">
            <h2 className="ofi-title light"><b>ANEXO</b> · DATOS DEL PORTAL</h2>
            <ul className="ofi-counts wide">
              {annexKeys.map(key => (
                <li key={key}>
                  <span>{metricLabels[key]}</span>
                  <strong>{number(key, ['income', 'expenses'].includes(key))}</strong>
                </li>
              ))}
              <li>
                <span><b>Resultado del período</b> (sin diezmos)</span>
                <strong className="ofi-result">{money((metrics.income || 0) - (metrics.expenses || 0))}</strong>
              </li>
            </ul>
            {data.changedTotals && <p className="ofi-note">La planilla tiene cifras corregidas a mano respecto de lo anotado en el Portal.</p>}
            {(data.summary || edit) && (
              <>
                <h3 className="ofi-chart-title"><b>OBSERVACIONES</b> GENERALES</h3>
                {edit ? (
                  <textarea
                    className="ofi-activity-text ofi-notes ofi-input"
                    aria-label="Observaciones generales del informe"
                    placeholder="Avances, necesidades o algo que quieras contar del período (opcional)…"
                    maxLength={4000}
                    value={data.summary}
                    onChange={e => edit.text('summary', e.target.value)}
                  />
                ) : (
                  <p className="ofi-activity-text ofi-notes">{data.summary}</p>
                )}
              </>
            )}
            <OfficialCharts {...data} />
          </div>
          {/* Las firmas van una sola vez, al final del informe. */}
          <OfficialClosing {...data} edit={edit} />
        </article>
      )}
    </>
  )
}
