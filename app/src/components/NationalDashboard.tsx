import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarDays, FileText, TrendingDown, TrendingUp } from 'lucide-react'
import { CalendarPreviewCard } from './CalendarModule'
import { type Row, type State, money, today } from '../utils'
import { isFixedExpense } from '../finance'

const isTithe = (row: Row) => /diezmo/i.test([row.category, row.name, row.description, row.subCategory].filter(Boolean).join(' '))
const isVisit = (p: Row) => ['Amigo', 'Visita', 'Seguimiento'].includes(p.status)
const SENT = ['Enviado', 'Recibido', 'Revisado', 'Confirmado']
const ANSWERED = ['Enviada', 'Aprobada', 'Corregida', 'Confirmado', 'Completado']
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)
const avg = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0)

function previousMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const daysSince = (iso: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : Infinity)

// Números de una congregación (con sus lugares de predicación) en un mes.
function churchFigures(state: State, churchId: string, month: string) {
  const mine = (r: Row) => r.churchId === churchId
  const events = (state.events || []).filter(mine)
  const listsIn = (m: string) => (state.attendance || []).filter(list => {
    const event = events.find(e => e.id === list.eventId)
    return event && String(event.date || '').startsWith(m)
  })
  const lists = listsIn(month)
  const before = listsIn(previousMonth(month))
  const total = (list: Row) => (list.people?.length || 0) + Number(list.visitors || 0)
  const people = (state.people || []).filter(mine).filter(p => p.status !== 'Inactivo')
  const money = (state.transactions || []).filter(t => mine(t) && !isTithe(t) && String(t.date || '').startsWith(month))
  const income = money.filter(t => t.direction === 'Ingreso').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expenses = money.filter(t => t.direction === 'Egreso').reduce((s, t) => s + Number(t.amount || 0), 0)
  const fixed = money.filter(t => t.direction === 'Egreso' && isFixedExpense(t)).reduce((s, t) => s + Number(t.amount || 0), 0)
  const assignments = (state.activityAssignments || []).filter(mine)
  const report = (state.monthlyReports || []).find(r => mine(r) && r.month === month && (r.reportType || 'monthly') === 'monthly')
  // Última vez que la congregación anotó algo en el Portal.
  const stamps = ['people', 'events', 'transactions', 'monthlyReports', 'groups', 'cellReports', 'activityAssignments']
    .flatMap(key => (state[key] || []).filter(mine).map(r => String(r.updatedAt || r.createdAt || '')))
    .concat((state.attendance || []).filter(list => events.some(e => e.id === list.eventId)).map(r => String(r.updatedAt || r.createdAt || '')))
    .filter(Boolean)
    .sort()
  const year = month.slice(0, 4)
  return {
    attendanceAvg: avg(lists.map(total)),
    attendancePrev: avg(before.map(total)),
    visitorsAvg: avg(lists.map(list => Number(list.visitors || 0))),
    services: lists.length,
    members: people.filter(p => !isVisit(p)).length,
    visits: people.filter(isVisit).length,
    newPeople: people.filter(p => String(p.createdAt || '').startsWith(month)).length,
    baptismsYear: people.filter(p => String(p.baptism || '').startsWith(year) && p.baptismPrecision !== 'Solo año').length,
    complete: pct(people.filter(p => p.phone && (p.birthday || p.ageGroup)).length, people.length),
    income,
    expenses,
    fixedShare: pct(fixed, expenses),
    requests: assignments.length,
    answered: assignments.filter(a => ANSWERED.includes(a.status)).length,
    reportStatus: report?.status || 'Pendiente',
    lastActivity: stamps[stamps.length - 1] || ''
  }
}

function Trend({ now, before }: { now: number; before: number }) {
  if (!before || !now) return null
  const change = Math.round(((now - before) / before) * 100)
  if (!change) return <small className="nd-trend">igual que el mes anterior</small>
  return (
    <small className={`nd-trend ${change > 0 ? 'up' : 'down'}`}>
      {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {change > 0 ? '+' : ''}{change}% vs. mes anterior
    </small>
  )
}

// Panel de la Administración Nacional: cómo está cada congregación y qué necesita seguimiento.
export function NationalDashboard({ state, workspaceName }: { state: State; workspaceName: string }) {
  const [month, setMonth] = useState(today().slice(0, 7))
  const churches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const rows = churches.map(ch => ({ ch, f: churchFigures(state, ch.id, month) }))
  const sum = (key: keyof ReturnType<typeof churchFigures>) => rows.reduce((s, r) => s + Number(r.f[key] || 0), 0)
  const active = rows.filter(r => daysSince(r.f.lastActivity) <= 7).length
  const reportsSent = rows.filter(r => SENT.includes(r.f.reportStatus)).length
  const withServices = rows.filter(r => r.f.services)
  const attendanceAvg = avg(withServices.map(r => r.f.attendanceAvg))
  const attendancePrev = avg(rows.filter(r => r.f.attendancePrev).map(r => r.f.attendancePrev))
  const visitorsAvg = avg(withServices.map(r => r.f.visitorsAvg))
  const income = sum('income')
  const expenses = sum('expenses')
  const requests = sum('requests')
  const answered = sum('answered')
  const people = (state.people || []).filter(p => p.status !== 'Inactivo')
  const complete = pct(people.filter(p => p.phone && (p.birthday || p.ageGroup)).length, people.length)
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })
  const isCurrent = month === today().slice(0, 7)

  // Lo que necesita una llamada o un mensaje esta semana.
  const alerts = rows.flatMap(({ ch, f }) => [
    daysSince(f.lastActivity) > 21 ? { ch, text: f.lastActivity ? `No anota nada hace ${daysSince(f.lastActivity)} días` : 'Todavía no empezó a usar el Portal', level: 'red' } : null,
    !isCurrent && !SENT.includes(f.reportStatus) ? { ch, text: `Falta el informe de ${monthLabel}`, level: 'yellow' } : null,
    f.requests - f.answered > 0 ? { ch, text: `${f.requests - f.answered} pedido(s) de comité sin responder`, level: 'yellow' } : null,
    f.services && f.expenses > f.income * 1.1 ? { ch, text: 'Gastó más de lo que entró este mes', level: 'yellow' } : null
  ].filter(Boolean) as Array<{ ch: Row; text: string; level: string }>)

  const kpis = [
    { label: 'Iglesias al día', value: `${active} de ${rows.length}`, note: 'anotaron algo en los últimos 7 días', tone: active === rows.length ? 'good' : 'warn', to: '/iglesias' },
    { label: 'Informes del mes', value: `${pct(reportsSent, rows.length)}%`, note: `${reportsSent} de ${rows.length} enviados`, tone: reportsSent === rows.length ? 'good' : 'warn', to: '/informes' },
    { label: 'Asistencia por culto', value: String(attendanceAvg), note: 'promedio nacional', trend: <Trend now={attendanceAvg} before={attendancePrev} />, to: '/informes' },
    { label: 'Visitas por culto', value: String(visitorsAvg), note: `${pct(visitorsAvg, attendanceAvg)}% de la asistencia`, to: '/personas' },
    { label: 'Personas', value: String(sum('members')), note: `de la iglesia · ${sum('visits')} visitas · ${sum('newPeople')} nuevas en el mes`, to: '/personas' },
    { label: 'Bautismos en el año', value: String(sum('baptismsYear')), note: `en ${month.slice(0, 4)}, con fecha`, to: '/personas' },
    { label: 'Balance del mes', value: money(income - expenses), note: `${income ? pct(income - expenses, income) : 0}% de lo que entró · sin diezmos`, tone: income >= expenses ? 'good' : 'bad', to: '/finanzas' },
    { label: 'Pedidos respondidos', value: `${pct(answered, requests)}%`, note: `${answered} de ${requests} pedidos de comités`, tone: answered === requests ? 'good' : 'warn', to: '/comites' },
    { label: 'Fichas completas', value: `${complete}%`, note: 'con celular y edad', tone: complete >= 80 ? 'good' : 'warn', to: '/personas' }
  ]

  return (
    <div className="home-workspace national-admin-home nd">
      <header className="nd-head">
        <div>
          <span className="eyebrow">Panel nacional · {workspaceName}</span>
          <h2>¿Cómo están las iglesias?</h2>
          <p>Indicadores de {monthLabel}. Tocá un número para ver el detalle.</p>
        </div>
        <div className="nd-head-actions">
          <label>
            <span>Mes</span>
            <input type="month" value={month} max={today().slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)} />
          </label>
          <Link className="primary-action" to="/informes"><FileText size={17} /> Informes</Link>
        </div>
      </header>

      <section className="nd-kpis" aria-label="Indicadores nacionales">
        {kpis.map(k => (
          <Link key={k.label} to={k.to} className={`nd-kpi${k.tone ? ` ${k.tone}` : ''}`}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            <small>{k.note}</small>
            {k.trend}
          </Link>
        ))}
      </section>

      <section className="workspace-section nd-alerts">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Seguimiento</span>
            <h3>Para llamar o escribir esta semana</h3>
          </div>
          <span className="count-pill">{alerts.length}</span>
        </div>
        {alerts.length ? (
          <ul>
            {alerts.map((alert, i) => (
              <li key={i} className={alert.level}>
                <AlertTriangle size={17} />
                <div>
                  <strong>{alert.ch.name}</strong>
                  <span>{alert.text}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-empty">Todas las iglesias están al día. ¡Gloria a Dios!</p>
        )}
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Semáforo</span>
            <h3>Congregaciones en {monthLabel}</h3>
          </div>
          <Link to="/iglesias" className="link-inline">Directorio de iglesias <ArrowRight size={15} /></Link>
        </div>
        {rows.length ? (
          <div className="crm-table-wrap">
            <table className="crm-table nd-table">
              <thead>
                <tr>
                  <th>Congregación</th>
                  <th>Uso del Portal</th>
                  <th>Informe</th>
                  <th>Asistencia por culto</th>
                  <th>Visitas por culto</th>
                  <th>Personas</th>
                  <th>Pedidos respondidos</th>
                  <th>Balance del mes</th>
                  <th>Gastos fijos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ ch, f }) => {
                  const days = daysSince(f.lastActivity)
                  const light = days <= 7 ? 'green' : days <= 21 ? 'yellow' : 'red'
                  return (
                    <tr key={ch.id}>
                      <td><strong>{ch.name}</strong><small style={{ display: 'block' }}>{ch.pastor || 'Pastor por asignar'}</small></td>
                      <td><span className={`nd-light ${light}`}>{!f.lastActivity ? 'Sin uso' : days === 0 ? 'Hoy' : `Hace ${days} días`}</span></td>
                      <td><span className={`status-pill status-${f.reportStatus}`}>{f.reportStatus}</span></td>
                      <td>{f.services ? <>{f.attendanceAvg} <small>({f.services} cultos)</small></> : '—'}</td>
                      <td>{f.services ? f.visitorsAvg : '—'}</td>
                      <td>{f.members} <small>+ {f.visits} visitas{f.newPeople ? ` · ${f.newPeople} nuevas` : ''}</small></td>
                      <td>{f.requests ? `${pct(f.answered, f.requests)}% (${f.answered}/${f.requests})` : '—'}</td>
                      <td className={f.income - f.expenses < 0 ? 'nd-negative' : ''}>{money(f.income - f.expenses)}</td>
                      <td>{f.expenses ? `${f.fixedShare}% de los gastos` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="quiet-empty">
            <CalendarDays size={24} />
            <strong>Todavía no hay congregaciones</strong>
            <p>Registrá la primera en Iglesias y personas → Iglesias.</p>
            <Link className="primary-action" to="/iglesias">Registrar una congregación</Link>
          </div>
        )}
      </section>

      <CalendarPreviewCard state={state} wsType="national_admin" scope="" maxUpcoming={3} />
    </div>
  )
}
