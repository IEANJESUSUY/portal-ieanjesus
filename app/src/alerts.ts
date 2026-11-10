// Avisos del Portal: lo que necesita atención en cada espacio (congregación, comité o Nacional).
// Se calculan con los datos que ya están cargados, se ven en la campanita y, si la persona lo activa,
// llegan también como notificación del celular.
import { useSyncExternalStore } from 'react'
import { NATIONAL_COMMITTEES } from '../shared/catalog.mjs'
import { attendanceIndex, ATTENDANCE_RED, ATTENDANCE_YELLOW } from './attendance'
import { expenseItemOf, FIXED_EXPENSES } from './finance'
import { type Row, type State, formatDate, label, today, WEEKDAYS } from './utils'

export type AlertLevel = 'urgent' | 'todo' | 'news'
export type PortalAlert = { id: string; level: AlertLevel; title: string; body: string; to?: string }
type Space = { id?: string; type?: string; committeeKey?: string } | null | undefined

const OPEN_REQUEST = ['Pendiente', 'Iniciada', 'Observada']
const ANSWERED = ['Enviada', 'Corregida']
const SENT_REPORT = ['Enviado', 'Recibido', 'Revisado', 'Confirmado']
const committeeName = (key?: string) => NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === key)?.name || 'un comité'
const daysUntil = (date: string) => Math.round((Date.parse(`${date}T12:00:00`) - Date.parse(`${today()}T12:00:00`)) / 86_400_000)
const daysAgo = (iso?: string) => (iso ? Math.round((Date.now() - Date.parse(iso)) / 86_400_000) : Infinity)
const monthName = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('es-UY', { month: 'long' })
const isVisit = (p: Row) => ['Amigo', 'Visita', 'Seguimiento'].includes(p.status)

function previousMonthKey() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleDateString('sv-SE').slice(0, 7)
}

// --- Congregación o lugar de predicación ---------------------------------------------------------
function churchAlerts(state: State, scope: string): PortalAlert[] {
  const alerts: PortalAlert[] = []
  const now = today()
  const mine = (r: Row) => r.churchId === scope || r.preachingPlaceId === scope
  const people = (state.people || []).filter(p => mine(p) && p.status !== 'Inactivo')
  const attendance = attendanceIndex(state)

  // Personas que dejaron de venir
  const red: Array<{ p: Row; n: number; last: string }> = []
  const yellow: Row[] = []
  for (const p of people) {
    const s = attendance(p)
    if (s.level === 'red' && s.lastDate) red.push({ p, n: s.missedInRow, last: s.lastDate })
    else if (s.level === 'yellow' && s.lastDate) yellow.push(p)
  }
  red.sort((a, b) => b.n - a.n)
  for (const { p, n, last } of red.slice(0, 8)) {
    alerts.push({
      id: `att-${p.id}-${last}`,
      level: 'urgent',
      title: `${label(p)} no viene hace ${n} cultos`,
      body: `Vino por última vez el ${formatDate(last)}. Un llamado o un mensaje puede ayudar.`,
      to: '/personas'
    })
  }
  if (red.length > 8) {
    alerts.push({ id: `att-more-${now.slice(0, 7)}-${red.length}`, level: 'urgent', title: `Y ${red.length - 8} personas más hace ${ATTENDANCE_RED} cultos o más que no vienen`, body: 'En Personas, el filtro «Faltan seguido» las muestra a todas.', to: '/personas' })
  }
  if (yellow.length) {
    alerts.push({
      id: `att-yellow-${yellow.map(p => p.id).sort().join('.')}`.slice(0, 180),
      level: 'todo',
      title: yellow.length === 1 ? `${label(yellow[0])} faltó ${ATTENDANCE_YELLOW} cultos seguidos` : `${yellow.length} personas faltaron ${ATTENDANCE_YELLOW} o 4 cultos seguidos`,
      body: yellow.slice(0, 4).map(label).join(', ') + (yellow.length > 4 ? '…' : '') + '. Están empezando a faltar.',
      to: '/personas'
    })
  }

  // Visitas que ya vienen seguido: ¿pasan a ser de la iglesia?
  const recentLists = (state.attendance || []).filter(list => {
    const event = (state.events || []).find(e => e.id === list.eventId)
    return event && mine(event) && daysUntil(event.date) >= -60 && daysUntil(event.date) <= 0
  })
  for (const p of people.filter(isVisit)) {
    const times = recentLists.filter(list => (list.people || []).includes(p.id)).length
    if (times >= 3) {
      alerts.push({ id: `conv-${p.id}`, level: 'news', title: `${label(p)} ya vino ${times} veces`, body: '¿Lo pasás a «De la iglesia»? Se cambia en su ficha.', to: '/personas' })
    }
  }

  // Cumpleaños de hoy y de los próximos días
  const monthDay = now.slice(5)
  for (const p of people) {
    if (!p.birthday) continue
    const md = String(p.birthday).slice(5)
    if (md === monthDay) {
      alerts.push({ id: `bday-${p.id}-${now.slice(0, 4)}`, level: 'todo', title: `Hoy cumple años ${label(p)}`, body: p.phone ? 'Podés saludarlo por WhatsApp desde Personas.' : 'Un saludo en el culto alegra mucho.', to: '/personas' })
    }
  }
  const soon = people.filter(p => {
    if (!p.birthday) return false
    const next = `${now.slice(0, 4)}-${String(p.birthday).slice(5)}`
    const d = daysUntil(next)
    return d > 0 && d <= 7
  })
  if (soon.length) {
    alerts.push({ id: `bday-week-${now}-${soon.length}`, level: 'news', title: `${soon.length === 1 ? 'Cumple años' : 'Cumplen años'} esta semana: ${soon.slice(0, 3).map(p => p.name).join(', ')}${soon.length > 3 ? '…' : ''}`, body: 'En Personas, ordená por «Próximos cumpleaños».', to: '/personas' })
  }

  // Pedidos de los comités nacionales
  for (const a of (state.activityAssignments || []).filter(mine)) {
    const activity = (state.nationalActivities || []).find(x => x.id === a.activityId)
    const name = activity?.name || a.name || 'un pedido'
    const status = a.status || 'Pendiente'
    const days = activity?.deadline ? daysUntil(activity.deadline) : null
    if (status === 'Observada') {
      alerts.push({ id: `req-obs-${a.id}-${a.updatedAt || ''}`, level: 'urgent', title: `El comité te pide un cambio en «${name}»`, body: a.reviewNotes || a.feedback || 'Abrí el pedido para ver qué falta.', to: '/tareas' })
    } else if (OPEN_REQUEST.includes(status) && days !== null && days <= 7) {
      alerts.push({ id: `req-due-${a.id}-${days < 0 ? 'late' : 'soon'}`, level: 'urgent', title: days < 0 ? `Venció el pedido «${name}»` : days === 0 ? `Hoy vence el pedido «${name}»` : `Quedan ${days} días para responder «${name}»`, body: `Lo pidió el Comité de ${committeeName(activity?.committeeKey)}.`, to: '/tareas' })
    } else if (OPEN_REQUEST.includes(status) && daysAgo(a.createdAt) <= 14) {
      alerts.push({ id: `req-new-${a.id}`, level: 'todo', title: `Nuevo pedido del Comité de ${committeeName(activity?.committeeKey)}`, body: `«${name}»${activity?.deadline ? `, para el ${formatDate(activity.deadline)}` : ''}.`, to: '/tareas' })
    } else if (status === 'Aprobada' && daysAgo(a.updatedAt) <= 14) {
      alerts.push({ id: `req-ok-${a.id}`, level: 'news', title: `El comité recibió tu respuesta a «${name}»`, body: '¡Gracias! Quedó aprobada.', to: '/tareas' })
    }
  }

  // Informe mensual
  const reports = (state.monthlyReports || []).filter(r => mine(r) && (r.reportType || 'monthly') === 'monthly')
  const thisMonth = now.slice(0, 7)
  const lastMonth = previousMonthKey()
  const endOfMonth = new Date(Number(now.slice(0, 4)), Number(now.slice(5, 7)), 0).getDate()
  const daysLeft = endOfMonth - Number(now.slice(8, 10))
  const current = reports.find(r => r.month === thisMonth)
  const previous = reports.find(r => r.month === lastMonth)
  // Solo si la iglesia ya usaba el Portal ese mes (una iglesia que recién empieza no debe nada).
  const usedLastMonth = (state.events || []).some(e => mine(e) && String(e.date || '').startsWith(lastMonth)) ||
    (state.transactions || []).some(t => mine(t) && String(t.date || '').startsWith(lastMonth))
  if (usedLastMonth && (!previous || !SENT_REPORT.includes(previous.status))) {
    alerts.push({ id: `rep-late-${lastMonth}`, level: Number(now.slice(8, 10)) > 5 ? 'urgent' : 'todo', title: `Falta enviar el informe de ${monthName(lastMonth)}`, body: 'Se arma solo con lo anotado: revisalo, agregá las actividades y envialo.', to: '/informes' })
  }
  if (daysLeft <= 4 && (!current || !SENT_REPORT.includes(current.status))) {
    alerts.push({ id: `rep-due-${thisMonth}`, level: 'todo', title: daysLeft === 0 ? 'Hoy termina el mes: preparar el informe' : `Faltan ${daysLeft} días para el informe de ${monthName(thisMonth)}`, body: 'Lo que anotaste en el mes ya está en la planilla.', to: '/informes' })
  }
  for (const r of reports.filter(r => daysAgo(r.updatedAt) <= 21)) {
    if (r.status === 'Observado') alerts.push({ id: `rep-obs-${r.id}-${r.updatedAt}`, level: 'urgent', title: `La Secretaría Nacional observó el informe de ${monthName(r.month)}`, body: 'Abrilo para ver qué hay que corregir.', to: '/informes' })
    if (['Recibido', 'Confirmado', 'Revisado'].includes(r.status)) alerts.push({ id: `rep-ok-${r.id}`, level: 'news', title: `La Secretaría Nacional recibió el informe de ${monthName(r.month)}`, body: '¡Gracias por enviarlo a tiempo!', to: '/informes' })
  }

  // Lista del culto de hoy
  const weekday = WEEKDAYS[new Date().getDay()]
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  for (const s of (state.serviceSchedules || []).filter(s => mine(s) && s.status !== 'Inactivo' && s.day === weekday)) {
    const [h, m] = String(s.time || '00:00').split(':').map(Number)
    const listed = (state.attendance || []).some(list => {
      const event = (state.events || []).find(e => e.id === list.eventId)
      return event && mine(event) && event.date === now
    })
    if (nowMinutes >= h * 60 + m + 60 && !listed) {
      alerts.push({ id: `list-${s.id}-${now}`, level: 'todo', title: `Falta pasar la lista de ${s.name || 'el culto de hoy'}`, body: 'Son 2 minutos desde el Inicio: «Pasar lista».', to: '/' })
    }
  }

  // Servicios fijos del mes (desde el día 20)
  if (Number(now.slice(8, 10)) >= 20) {
    const expenses = (state.transactions || []).filter(t => mine(t) && t.direction === 'Egreso')
    const since = new Date()
    since.setMonth(since.getMonth() - 3)
    const sinceKey = since.toLocaleDateString('sv-SE').slice(0, 7)
    const missing = FIXED_EXPENSES.filter(item => {
      const ofItem = expenses.filter(t => expenseItemOf(t) === item.label)
      return ofItem.some(t => String(t.date).slice(0, 7) >= sinceKey && !String(t.date).startsWith(thisMonth)) && !ofItem.some(t => String(t.date).startsWith(thisMonth))
    })
    if (missing.length) {
      alerts.push({ id: `fixed-${thisMonth}-${missing.map(i => i.label).join('.')}`, level: 'todo', title: `Falta anotar: ${missing.map(i => i.label).join(', ')}`, body: 'Son gastos de todos los meses. Se anotan en Dinero → Servicios del mes.', to: '/finanzas' })
    }
  }

  // Novedades nacionales: actividades y eventos que se vienen
  for (const act of (state.nationalActivities || []).filter(a => a.status === 'Publicada' && daysAgo(a.createdAt) <= 14)) {
    const targeted = act.scopeType !== 'Congregaciones seleccionadas' || (act.targetChurches || []).includes(scope)
    if (targeted) alerts.push({ id: `act-${act.id}`, level: 'news', title: `Nueva actividad del Comité de ${committeeName(act.committeeKey)}: ${act.name}`, body: act.date ? `Es el ${formatDate(act.date)}.` : 'Mirá los detalles en Comités.', to: '/comites' })
  }
  for (const e of (state.events || []).filter(e => !e.churchId && e.date && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 7)) {
    alerts.push({ id: `ev-${e.id}`, level: 'news', title: `Se viene: ${e.name}`, body: `${formatDate(e.date)}${e.time ? ` a las ${e.time}` : ''}${e.location ? ` · ${e.location}` : ''}.`, to: '/calendario' })
  }
  return alerts
}

// --- Administración Nacional ----------------------------------------------------------------------
function nationalAlerts(state: State): PortalAlert[] {
  const alerts: PortalAlert[] = []
  const churches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const lastMonth = previousMonthKey()
  const dayOfMonth = Number(today().slice(8, 10))
  for (const r of (state.monthlyReports || []).filter(r => r.status === 'Enviado')) {
    const church = churches.find(c => c.id === r.churchId)
    alerts.push({ id: `rev-${r.id}-${r.updatedAt || ''}`, level: 'todo', title: `${church?.name || 'Una congregación'} envió el informe de ${monthName(String(r.month).slice(0, 7))}`, body: 'Revisalo y confirmá la recepción.', to: '/informes' })
  }
  for (const c of churches) {
    const mine = (r: Row) => r.churchId === c.id
    const stamps = ['people', 'events', 'transactions', 'monthlyReports', 'attendance']
      .flatMap(key => (state[key] || []).filter(mine).map(r => String(r.updatedAt || r.createdAt || '')))
      .filter(Boolean).sort()
    const last = stamps[stamps.length - 1]
    const idle = daysAgo(last)
    if (idle > 21) alerts.push({ id: `idle-${c.id}-${Math.floor(idle / 7)}`, level: 'urgent', title: last ? `${c.name} no anota nada hace ${idle} días` : `${c.name} todavía no empezó a usar el Portal`, body: 'Un llamado para ver si necesitan ayuda.', to: '/' })
    // Hermanos que dejaron de venir en cada iglesia (para acompañar al pastor).
    const attendance = attendanceIndex(state)
    const away = (state.people || []).filter(p => mine(p) && p.status !== 'Inactivo' && attendance(p).level === 'red' && attendance(p).lastDate)
    if (away.length) {
      alerts.push({ id: `away-${c.id}-${away.map(p => p.id).sort().join('.')}`.slice(0, 180), level: 'todo', title: `${c.name}: ${away.length === 1 ? '1 persona no viene' : `${away.length} personas no vienen`} hace ${ATTENDANCE_RED} cultos o más`, body: 'Conviene preguntarle al pastor si ya las visitó.', to: '/personas' })
    }
    const unanswered = (state.activityAssignments || []).filter(a => mine(a) && OPEN_REQUEST.includes(a.status || 'Pendiente'))
    if (unanswered.length) {
      alerts.push({ id: `unans-${c.id}-${unanswered.length}`, level: 'news', title: `${c.name}: ${unanswered.length} ${unanswered.length === 1 ? 'pedido' : 'pedidos'} de comités sin responder`, body: 'Se ve el detalle en Comités.', to: '/comites' })
    }
    const report = (state.monthlyReports || []).find(r => mine(r) && r.month === lastMonth)
    const usedLastMonth = (state.events || []).some(e => mine(e) && String(e.date || '').startsWith(lastMonth))
    if (dayOfMonth >= 10 && usedLastMonth && (!report || !SENT_REPORT.includes(report.status))) {
      alerts.push({ id: `miss-${c.id}-${lastMonth}`, level: 'todo', title: `${c.name}: falta el informe de ${monthName(lastMonth)}`, body: 'Se le puede escribir por WhatsApp desde Informes.', to: '/informes' })
    }
  }
  return alerts
}

// --- Comité nacional ------------------------------------------------------------------------------
function committeeAlerts(state: State, committeeKey: string): PortalAlert[] {
  const alerts: PortalAlert[] = []
  const activities = (state.nationalActivities || []).filter(a => a.committeeKey === committeeKey)
  const churchName = (id: string) => (state.churches || []).find(c => c.id === id)?.name || 'Una congregación'
  for (const act of activities) {
    const assignments = (state.activityAssignments || []).filter(a => a.activityId === act.id)
    for (const a of assignments.filter(a => ANSWERED.includes(a.status))) {
      alerts.push({ id: `ans-${a.id}-${a.updatedAt || ''}`, level: 'todo', title: `${churchName(a.churchId)} respondió «${act.name}»`, body: 'Revisá las fotos y la ofrenda, y aprobala.', to: '/comites' })
    }
    const pending = assignments.filter(a => OPEN_REQUEST.includes(a.status || 'Pendiente'))
    const days = act.deadline ? daysUntil(act.deadline) : null
    if (pending.length && days !== null && days <= 7 && days >= -14) {
      alerts.push({ id: `due-${act.id}-${days < 0 ? 'late' : 'soon'}`, level: 'urgent', title: days < 0 ? `«${act.name}» venció y faltan ${pending.length} iglesias` : `Quedan ${days} días para «${act.name}»`, body: `Sin responder: ${pending.slice(0, 4).map(a => churchName(a.churchId)).join(', ')}${pending.length > 4 ? '…' : ''}.`, to: '/comites' })
    }
  }
  return alerts
}

export function computeAlerts(state: State, space: Space, scope: string): PortalAlert[] {
  const order: Record<AlertLevel, number> = { urgent: 0, todo: 1, news: 2 }
  const list = space?.type === 'national_committee' && space.committeeKey ? committeeAlerts(state, space.committeeKey)
    : space?.type === 'national_admin' ? nationalAlerts(state)
    : scope ? churchAlerts(state, scope) : []
  return list.sort((a, b) => order[a.level] - order[b.level])
}

// --- Leídos, campanita y notificaciones del celular -----------------------------------------------
type Snapshot = { key: string; alerts: PortalAlert[]; read: Set<string> }
let snapshot: Snapshot = { key: '', alerts: [], read: new Set() }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(fn => fn())
const storageGet = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const storageSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento: dura lo que la pestaña */ } }
const readKey = (key: string) => `pn_alerts_read_${key}`
const notifiedKey = (key: string) => `pn_alerts_notified_${key}`
const loadSet = (k: string) => new Set<string>(JSON.parse(storageGet(k) || '[]'))

export function publishAlerts(key: string, alerts: PortalAlert[]) {
  const read = key === snapshot.key ? snapshot.read : loadSet(readKey(key))
  snapshot = { key, alerts, read }
  emit()
  void notifyNew(key, alerts.filter(a => !read.has(a.id)))
}

export function markAlertsRead(ids?: string[]) {
  const read = new Set(snapshot.read)
  for (const id of ids || snapshot.alerts.map(a => a.id)) read.add(id)
  // Se guardan solo los últimos 500 para que no crezca sin fin.
  storageSet(readKey(snapshot.key), JSON.stringify([...read].slice(-500)))
  snapshot = { ...snapshot, read }
  emit()
}

export function useAlerts() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn) }, () => snapshot)
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window
export const notificationsEnabled = () => notificationsSupported() && Notification.permission === 'granted' && storageGet('pn_notify') === '1'

export async function enableNotifications() {
  if (!notificationsSupported()) throw new Error('Este navegador no permite notificaciones. En el celular, instalá el Portal como aplicación.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('No se dio permiso. Se puede activar desde los ajustes del navegador (Notificaciones).')
  storageSet('pn_notify', '1')
}

export function disableNotifications() {
  storageSet('pn_notify', '0')
  emit()
}

export async function showNotification(title: string, body: string, to = '/') {
  const options = { body, icon: './icon-192.png', badge: './icon-192.png', tag: `pn-${title}`.slice(0, 60), data: { to } }
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined
  if (registration) await registration.showNotification(title, options)
  else new Notification(title, options)
}

// Avisa en el celular lo urgente y lo pendiente que todavía no se avisó (las novedades quedan en la campanita).
async function notifyNew(key: string, unread: PortalAlert[]) {
  if (!notificationsEnabled()) return
  const notified = loadSet(notifiedKey(key))
  const fresh = unread.filter(a => a.level !== 'news' && !notified.has(a.id))
  if (!fresh.length) return
  if (fresh.length <= 3) {
    for (const a of fresh) await showNotification(a.title, a.body, a.to).catch(() => undefined)
  } else {
    const urgent = fresh.filter(a => a.level === 'urgent').length
    await showNotification(`Tenés ${fresh.length} avisos nuevos en el Portal`, urgent ? `${urgent} urgentes. ${fresh[0].title}.` : fresh[0].title, '/').catch(() => undefined)
  }
  for (const a of fresh) notified.add(a.id)
  storageSet(notifiedKey(key), JSON.stringify([...notified].slice(-500)))
}
