// Asistencia de cada persona, calculada con las listas que ya se pasan en los cultos.
// Semáforo: verde = viene seguido · amarillo = faltó 3 o 4 cultos seguidos · rojo = 5 o más.
import { type Row, type State, today } from './utils'

export type AttendanceLevel = 'green' | 'yellow' | 'red' | 'none'
export type AttendanceStats = {
  level: AttendanceLevel
  text: string
  lastDate: string
  daysSince: number | null
  missedInRow: number
  monthCame: number
  monthTotal: number
  monthPct: number | null
  monthLabel: string
}

export const ATTENDANCE_YELLOW = 3
export const ATTENDANCE_RED = 5

function closedMonth() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleDateString('sv-SE').slice(0, 7)
}

// Prepara las listas de cada congregación una sola vez y devuelve una función para cada persona.
export function attendanceIndex(state: State) {
  const now = today()
  const month = closedMonth()
  const monthLabel = new Date(`${month}-15T12:00:00`).toLocaleDateString('es-UY', { month: 'long' })
  const eventDate = new Map((state.events || []).map(e => [e.id, String(e.date || '')]))
  const byChurch = new Map<string, Array<{ date: string; people: Set<string> }>>()
  for (const list of state.attendance || []) {
    const date = eventDate.get(list.eventId) || ''
    if (!date || date > now) continue
    const church = String(list.churchId || '')
    const lists = byChurch.get(church) || []
    lists.push({ date, people: new Set(list.people || []) })
    byChurch.set(church, lists)
  }
  for (const lists of byChurch.values()) lists.sort((a, b) => b.date.localeCompare(a.date))

  return (person: Row): AttendanceStats => {
    // Solo cuentan los cultos desde que la persona está anotada en el Portal.
    const since = String(person.createdAt || '').slice(0, 10)
    const lists = (byChurch.get(String(person.churchId || '')) || []).filter(l => !since || l.date >= since)
    let missedInRow = 0
    let lastDate = ''
    for (const list of lists) {
      if (list.people.has(person.id)) { lastDate = list.date; break }
      missedInRow++
    }
    if (!lastDate) lastDate = (byChurch.get(String(person.churchId || '')) || []).find(l => l.people.has(person.id))?.date || ''
    const ofMonth = lists.filter(l => l.date.startsWith(month))
    const monthCame = ofMonth.filter(l => l.people.has(person.id)).length
    const daysSince = lastDate ? Math.max(0, Math.round((Date.parse(now) - Date.parse(lastDate)) / 86_400_000)) : null
    const level: AttendanceLevel = !lists.length ? 'none' : missedInRow >= ATTENDANCE_RED ? 'red' : missedInRow >= ATTENDANCE_YELLOW ? 'yellow' : 'green'
    const text = level === 'none' ? 'Sin listas todavía'
      : level === 'green' ? 'Viene seguido'
      : !lastDate ? `No vino a ninguno de los ${missedInRow} cultos`
      : level === 'yellow' ? `Faltó ${missedInRow} cultos seguidos`
      : `Hace ${missedInRow} cultos que no viene`
    return {
      level,
      text,
      lastDate,
      daysSince,
      missedInRow,
      monthCame,
      monthTotal: ofMonth.length,
      monthPct: ofMonth.length ? Math.round((monthCame / ofMonth.length) * 100) : null,
      monthLabel
    }
  }
}

export const lastSeenLabel = (stats: AttendanceStats) =>
  stats.daysSince === null ? 'Todavía no vino a un culto con lista'
    : stats.daysSince === 0 ? 'Vino hoy'
    : stats.daysSince === 1 ? 'Vino ayer'
    : `Vino hace ${stats.daysSince} días`
