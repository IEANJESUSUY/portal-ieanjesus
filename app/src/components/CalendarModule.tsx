import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  ListFilter,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Star,
  Video
} from 'lucide-react'
import { EVENT_CATEGORIES, NATIONAL_COMMITTEES } from '../../shared/catalog.mjs'

type Row = { id: string; [key: string]: any }
type State = Record<string, Row[]>

const todayStr = () => new Date().toLocaleDateString('sv-SE')

const CATEGORY_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  Culto: { bg: '#eaf2fd', fg: '#073b7a', dot: '#0b63ce' },
  Ayuno: { bg: '#fff4e5', fg: '#9a5200', dot: '#f59e0b' },
  Devocional: { bg: '#e8f7ee', fg: '#166534', dot: '#22c55e' },
  Jóvenes: { bg: '#f3e8ff', fg: '#6b21a8', dot: '#9333ea' },
  Oración: { bg: '#e0f2fe', fg: '#075985', dot: '#0284c7' },
  Célula: { bg: '#fef3c7', fg: '#92400e', dot: '#d97706' },
  Convención: { bg: '#fee2e2', fg: '#991b1b', dot: '#dc2626' },
  Campamento: { bg: '#dcfce7', fg: '#14532d', dot: '#16a34a' },
  Capacitación: { bg: '#e0e7ff', fg: '#3730a3', dot: '#4f46e5' },
  'Culto misionero': { bg: '#ffedd5', fg: '#9a3412', dot: '#ea580c' },
  Vigilia: { bg: '#f1f5f9', fg: '#1e293b', dot: '#475569' }
}

function getCategoryStyle(kind?: string) {
  return CATEGORY_COLORS[kind || 'Culto'] || { bg: '#eaf2fd', fg: '#073b7a', dot: '#2d9bf0' }
}

function buildMonthGrid(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  // Monday-based index (0 = Mon ... 6 = Sun)
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = []

  const prevMonthDays = new Date(y, m - 1, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const prevDate = new Date(y, m - 2, d).toLocaleDateString('sv-SE')
    cells.push({ date: prevDate, day: d, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${yearMonth}-${String(d).padStart(2, '0')}`
    cells.push({ date, day: d, inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (startOffset + daysInMonth) + 1
    const nextDate = new Date(y, m, nextDay).toLocaleDateString('sv-SE')
    cells.push({ date: nextDate, day: nextDay, inMonth: false })
  }
  return cells
}

function shiftMonth(yearMonth: string, delta: number) {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthTitle(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number)
  const label = new Date(y, m - 1, 15).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function filterEventsForWorkspace(
  events: Row[],
  wsType: string,
  scope: string,
  committeeKey?: string,
  consolidateParentId?: string
) {
  if (wsType === 'national_committee' && committeeKey) {
    return events.filter(
      e =>
        e.committeeKey === committeeKey ||
        e.scopeAudience?.toLowerCase().includes(committeeKey) ||
        (!e.churchId && e.scopeAudience === 'Nacional')
    )
  }
  if (wsType === 'church' || wsType === 'preaching_place') {
    return events.filter(
      e =>
        e.churchId === scope ||
        e.preachingPlaceId === scope ||
        (consolidateParentId && e.churchId === consolidateParentId) ||
        (!e.churchId && e.showInChurchCalendar !== 'No')
    )
  }
  // national_admin sees all events, prioritizing national and committee events
  return events
}

export function CalendarPreviewCard({
  state,
  wsType,
  scope,
  committeeKey,
  onCreateEvent,
  compact = false,
  maxUpcoming = 4
}: {
  state: State
  wsType: string
  scope: string
  committeeKey?: string
  onCreateEvent?: () => void
  compact?: boolean
  maxUpcoming?: number
}) {
  const now = todayStr()
  const [yearMonth, setYearMonth] = useState(now.slice(0, 7))
  const allRelevant = filterEventsForWorkspace(state.events || [], wsType, scope, committeeKey)
  // En Administración Nacional priorizar eventos nacionales y de comités en la previsualización
  const prioritized =
    wsType === 'national_admin'
      ? allRelevant.filter(e => !e.churchId || e.committeeKey || ['Convención', 'Campamento', 'Capacitación', 'Culto misionero', 'Vigilia'].includes(e.kind))
      : allRelevant
  const previewEvents = (prioritized.length > 0 ? prioritized : allRelevant).sort((a, b) =>
    `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`)
  )
  const upcoming = previewEvents.filter(e => e.date >= now).slice(0, Math.max(1, maxUpcoming))
  const cells = buildMonthGrid(yearMonth)
  const eventsByDate = new Map<string, Row[]>()
  for (const ev of previewEvents) {
    if (!ev.date) continue
    const list = eventsByDate.get(ev.date) || []
    list.push(ev)
    eventsByDate.set(ev.date, list)
  }

  return (
    <section className={`workspace-section calendar-preview-widget${compact ? ' compact' : ''}`} aria-label="Previsualización del calendario">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {wsType === 'national_admin'
              ? 'Agenda Nacional'
              : wsType === 'national_committee'
              ? 'Agenda del Comité'
              : 'Calendario y encuentros'}
          </span>
          <h3>Calendario del mes</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onCreateEvent && (
            <button type="button" className="secondary-action compact-btn" onClick={onCreateEvent}>
              <Plus size={15} /> Evento
            </button>
          )}
          <Link to="/calendario" className="link-inline">
            Abrir calendario <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="calendar-preview-layout">
        {!compact && <div className="mini-calendar-box">
          <div className="mini-calendar-nav">
            <button type="button" aria-label="Mes anterior" onClick={() => setYearMonth(m => shiftMonth(m, -1))}>
              <ChevronLeft size={16} />
            </button>
            <strong>{formatMonthTitle(yearMonth)}</strong>
            <button type="button" aria-label="Mes siguiente" onClick={() => setYearMonth(m => shiftMonth(m, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mini-calendar-weekdays">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mini-calendar-grid">
            {cells.map(cell => {
              const dayEvents = eventsByDate.get(cell.date) || []
              const isToday = cell.date === now
              return (
                <Link
                  to={`/calendario?fecha=${cell.date}`}
                  key={cell.date}
                  className={`mini-calendar-day${!cell.inMonth ? ' muted' : ''}${isToday ? ' today' : ''}${dayEvents.length ? ' has-events' : ''}`}
                  title={dayEvents.length ? `${dayEvents.length} actividad(es): ${dayEvents.map(e => e.name).join(', ')}` : cell.date}
                >
                  <span>{cell.day}</span>
                  {dayEvents.length > 0 && <i className="mini-event-dot" />}
                </Link>
              )
            })}
          </div>
        </div>}

        <div className="mini-upcoming-list">
          <span className="eyebrow">Próximas actividades</span>
          {upcoming.length > 0 ? (
            upcoming.map(ev => {
              const cat = getCategoryStyle(ev.kind)
              const churchName = ev.churchId ? state.churches.find(c => c.id === ev.churchId)?.name : 'Alcance Nacional'
              return (
                <Link to={`/calendario?fecha=${ev.date}`} key={ev.id} className="mini-upcoming-item">
                  <div className="mini-upcoming-date">
                    <strong>{ev.date?.slice(8, 10)}</strong>
                    <small>
                      {ev.date
                        ? new Date(`${ev.date}T12:00:00`).toLocaleDateString('es-UY', { month: 'short' }).replace('.', '')
                        : ''}
                    </small>
                  </div>
                  <div className="mini-upcoming-body">
                    <div className="mini-upcoming-badges">
                      <span className="cat-pill" style={{ background: cat.bg, color: cat.fg }}>
                        {ev.kind || 'Culto'}
                      </span>
                      {ev.modality === 'Online' && <span className="modality-pill online">Online</span>}
                    </div>
                    <strong>{ev.name}</strong>
                    <small>
                      {ev.time ? `${ev.time} · ` : ''}
                      {ev.location || churchName}
                    </small>
                  </div>
                </Link>
              )
            })
          ) : (
            <p className="quiet-empty">No hay eventos próximos programados para este período.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export function CalendarModule({
  state,
  scope,
  wsType,
  committeeKey,
  consolidateParentId,
  onEditEvent,
  canEditEvent = () => true
}: {
  state: State
  scope: string
  wsType: string
  committeeKey?: string
  consolidateParentId?: string
  onEditEvent: (row: Row) => void
  canEditEvent?: (row: Row) => boolean
}) {
  const now = todayStr()
  const [yearMonth, setYearMonth] = useState(now.slice(0, 7))
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas')
  const [eventSearch, setEventSearch] = useState('')
  const [churchFilter, setChurchFilter] = useState<string>(scope || 'Todas')
  const [scopeMode, setScopeMode] = useState<'all' | 'national'>('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'admin'>('calendar')
  const [agendaLimit, setAgendaLimit] = useState(5)
  const [adminLimit, setAdminLimit] = useState(10)

  useEffect(() => {
    setChurchFilter(scope || 'Todas')
  }, [scope])

  useEffect(() => {
    setAgendaLimit(5)
    setAdminLimit(10)
  }, [eventSearch, categoryFilter, churchFilter, scopeMode, yearMonth, selectedDate])

  const workspaceEvents = filterEventsForWorkspace(state.events || [], wsType, scope, committeeKey, consolidateParentId)

  const filteredEvents = workspaceEvents
    .filter(ev => {
      if (categoryFilter !== 'Todas' && (ev.kind || 'Culto') !== categoryFilter) return false
      const searchText = `${ev.name || ''} ${ev.notes || ''} ${ev.location || ''} ${ev.scopeAudience || ''}`.toLocaleLowerCase()
      if (eventSearch.trim() && !searchText.includes(eventSearch.trim().toLocaleLowerCase())) return false
      if (!scope && churchFilter !== 'Todas') {
        if (churchFilter === '__nacional__') return !ev.churchId
        if (ev.churchId !== churchFilter) return false
      }
      if (wsType === 'national_admin' && scopeMode === 'national') {
        return !ev.churchId || Boolean(ev.committeeKey) || ['Convención', 'Campamento', 'Capacitación', 'Culto misionero', 'Vigilia'].includes(ev.kind)
      }
      return true
    })
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))

  const cells = buildMonthGrid(yearMonth)
  const eventsByDate = new Map<string, Row[]>()
  for (const ev of filteredEvents) {
    if (!ev.date) continue
    const list = eventsByDate.get(ev.date) || []
    list.push(ev)
    eventsByDate.set(ev.date, list)
  }

  const dayEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : []
  const agendaSource = selectedDate ? dayEvents : filteredEvents.filter(e => e.date >= now)
  const agendaEvents = agendaSource.slice(0, agendaLimit)

  const monthTotalEvents = filteredEvents.filter(e => e.date?.startsWith(yearMonth)).length
  const nationalCount = filteredEvents.filter(e => !e.churchId || e.committeeKey).length

  return (
    <div className="calendar-module">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">
            {wsType === 'national_admin'
              ? 'Agenda Nacional y Congregacional'
              : wsType === 'national_committee'
              ? 'Agenda del Comité Nacional'
              : 'Agenda Congregacional'}
          </span>
          <h2>Calendario y eventos</h2>
          <p>{filteredEvents.length} registros encontrados · {monthTotalEvents} en {formatMonthTitle(yearMonth)}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="calendar-view-tabs" role="tablist" aria-label="Modo de vista del calendario">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'calendar'}
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays size={16} /> Mes y agenda
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'admin'}
              className={viewMode === 'admin' ? 'active' : ''}
              onClick={() => setViewMode('admin')}
            >
              <ListFilter size={16} /> Lista de eventos
            </button>
          </div>
          <button
            type="button"
            className="primary-action"
            aria-label="Nuevo evento"
            onClick={() =>
              onEditEvent({
                id: '',
                churchId: scope || '',
                committeeKey: committeeKey || '',
                date: selectedDate || now,
                time: '19:00',
                kind: wsType === 'national_admin' ? 'Convención' : wsType === 'national_committee' ? 'Jóvenes' : 'Culto',
                modality: 'Presencial',
                publicVisible: 'Sí',
                featured: 'No',
                showInChurchCalendar: 'Sí',
                scopeAudience: wsType === 'national_admin' ? 'Nacional' : wsType === 'national_committee' ? 'Comité Nacional' : 'Congregación local'
              })
            }
          >
            <Plus size={17} /> Nuevo evento
          </button>
        </div>
      </div>

      {wsType !== 'national_admin' && (
        <Link className="page-action-button" to="/cultos">
          Pasar lista en un culto o evento <span>→</span>
        </Link>
      )}

      {/* Barra de filtros del calendario */}
      <div className="calendar-filter-strip">
        <label className="calendar-event-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar eventos"
            placeholder="Buscar por nombre, lugar o actividad"
            value={eventSearch}
            onChange={e => setEventSearch(e.target.value)}
          />
        </label>

        <label className="calendar-type-filter">
          <span>Tipo</span>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="Todas">Todas las actividades</option>
            {EVENT_CATEGORIES.map((category: string) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>

        <div className="calendar-extra-filters">
          {wsType === 'national_admin' && (
            <div className="scope-toggle-pills" role="group" aria-label="Alcance de los eventos">
              <button
                type="button"
                className={scopeMode === 'all' ? 'active' : ''}
                aria-pressed={scopeMode === 'all'}
                onClick={() => setScopeMode('all')}
              >
                <span>Todos</span><span className="scope-toggle-count">{workspaceEvents.length}</span>
              </button>
              <button
                type="button"
                className={scopeMode === 'national' ? 'active' : ''}
                aria-pressed={scopeMode === 'national'}
                onClick={() => setScopeMode('national')}
              >
                <span>Agenda nacional</span><span className="scope-toggle-count">{nationalCount}</span>
              </button>
            </div>
          )}

          {!scope && (
            <label className="calendar-inline-select">
              <span>Congregación</span>
              <select value={churchFilter} onChange={e => setChurchFilter(e.target.value)}>
                <option value="Todas">Todas las congregaciones</option>
                <option value="__nacional__">Alcance Nacional</option>
                {state.churches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {viewMode === 'calendar' && (
        <div className="calendar-main-layout">
          {/* Grilla mensual visual */}
          <section className="calendar-grid-panel" aria-label="Calendario mensual">
            <header className="calendar-grid-header">
              <div>
                <span className="eyebrow">Navegación mensual</span>
                <h3>{formatMonthTitle(yearMonth)}</h3>
              </div>
              <div className="calendar-month-controls">
                <button type="button" className="secondary-action" onClick={() => setYearMonth(m => shiftMonth(m, -1))}>
                  <ChevronLeft size={17} /> Anterior
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    setYearMonth(now.slice(0, 7))
                    setSelectedDate('')
                  }}
                >
                  Hoy
                </button>
                <button type="button" className="secondary-action" onClick={() => setYearMonth(m => shiftMonth(m, 1))}>
                  Siguiente <ChevronRight size={17} />
                </button>
              </div>
            </header>

            <div className="calendar-weekdays-row">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="calendar-weekday-cell">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-month-grid">
              {cells.map(cell => {
                const evs = eventsByDate.get(cell.date) || []
                const isToday = cell.date === now
                const isSelected = cell.date === selectedDate
                return (
                  <button
                    type="button"
                    key={cell.date}
                    onClick={() => setSelectedDate(prev => (prev === cell.date ? '' : cell.date))}
                    className={`calendar-day-cell${!cell.inMonth ? ' outside' : ''}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${evs.length > 0 ? ' has-events' : ''}`}
                  >
                    <div className="calendar-day-top">
                      <span className="calendar-day-num">{cell.day}</span>
                      {evs.length > 0 && <span className="calendar-day-count">{evs.length}</span>}
                    </div>
                    <div className="calendar-day-events">
                      {evs.slice(0, 2).map(ev => {
                        const style = getCategoryStyle(ev.kind)
                        return (
                          <span
                            key={ev.id}
                            className="calendar-day-pill"
                            style={{ background: style.bg, color: style.fg }}
                          >
                            <i style={{ background: style.dot }} />
                            {ev.name}
                          </span>
                        )
                      })}
                      {evs.length > 2 && <small className="calendar-day-more">+{evs.length - 2} más</small>}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Panel lateral / inferior: Agenda de próximos eventos o detalle del día */}
          <aside className="calendar-agenda-panel" aria-label="Agenda de eventos">
            <div className="calendar-agenda-header">
              <div>
                <span className="eyebrow">{selectedDate ? `Día seleccionado: ${selectedDate}` : 'Agenda programada'}</span>
                <h3>{selectedDate ? `Actividades del ${selectedDate}` : 'Próximos encuentros y eventos'}</h3>
              </div>
              {selectedDate && (
                <button type="button" className="text-button" onClick={() => setSelectedDate('')}>
                  Ver todo el mes
                </button>
              )}
            </div>

            <div className="calendar-agenda-list">
              {agendaEvents.map(ev => {
                const cat = getCategoryStyle(ev.kind)
                const church = state.churches.find(c => c.id === ev.churchId)
                const att = state.attendance.find(a => a.eventId === ev.id)
                const totalAtt = att ? (att.people?.length || 0) + Number(att.visitors || 0) : null
                const canManageAttendance = wsType !== 'national_admin' || !ev.churchId
                return (
                  <article key={ev.id} className={`calendar-agenda-card${ev.featured === 'Sí' ? ' featured' : ''}`}>
                    <div className="calendar-agenda-card-top">
                      <span className="cat-pill" style={{ background: cat.bg, color: cat.fg }}>
                        {ev.kind || 'Culto'}
                      </span>
                      {ev.modality === 'Online' ? (
                        <span className="modality-pill online">
                          <Video size={13} /> Online
                        </span>
                      ) : (
                        <span className="modality-pill">Presencial</span>
                      )}
                      {ev.featured === 'Sí' && (
                        <span className="featured-pill">
                          <Star size={12} /> Destacado
                        </span>
                      )}
                    </div>
                    <h4>{ev.name}</h4>
                    <div className="calendar-agenda-meta">
                      <span>
                        <CalendarDays size={14} /> {ev.date}
                        {ev.time ? ` · ${ev.time} hs` : ''}
                      </span>
                      <span>
                        <MapPin size={14} /> {ev.location || church?.name || 'Alcance Nacional'}
                      </span>
                      <span>
                        <Globe size={14} /> {church?.name || ev.scopeAudience || 'Nacional'}
                      </span>
                    </div>
                    {ev.onlineUrl && (
                      <a href={ev.onlineUrl} target="_blank" rel="noreferrer" className="online-event-link">
                        <Video size={14} /> Abrir enlace de sala virtual
                      </a>
                    )}
                    {ev.notes && <p className="calendar-agenda-notes">{ev.notes}</p>}
                    <div className="calendar-agenda-actions">
                      {canEditEvent(ev) && (
                        <button type="button" className="secondary-action" onClick={() => onEditEvent(ev)}>
                          Abrir / editar
                        </button>
                      )}
                      {canManageAttendance && (
                        <Link to="/cultos" className="secondary-action" style={{ textDecoration: 'none' }}>
                          {totalAtt !== null ? `Asistencia (${totalAtt})` : 'Pasar lista'}
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}

              {agendaEvents.length === 0 && (
                <div className="friendly-empty">
                  <span>📅</span>
                  <strong>Sin actividades en esta selección</strong>
                  <p>
                    {selectedDate
                      ? 'No hay encuentros programados para esta fecha. Puedes crear uno con el botón superior.'
                      : 'Todavía no hay eventos programados con estos filtros.'}
                  </p>
                </div>
              )}
            </div>
            {agendaSource.length > agendaLimit && (
              <button type="button" className="calendar-show-more" onClick={() => setAgendaLimit(limit => limit + 5)}>
                Ver más eventos ({agendaSource.length - agendaLimit} restantes)
              </button>
            )}
          </aside>
        </div>
      )}

      {viewMode === 'admin' && <section className="workspace-section calendar-admin-list" style={{ marginTop: 4 }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Gestión de agenda</span>
            <h3>Listado administrativo de encuentros y eventos</h3>
            <p>{filteredEvents.length} eventos · mostrando {Math.min(adminLimit, filteredEvents.length)}</p>
          </div>
        </div>
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nombre del encuentro</th>
                <th>Congregación / Alcance</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Categoría</th>
                <th>Modalidad / Lugar</th>
                <th>Visibilidad</th>
                <th>Ficha</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.slice(0, adminLimit).map(ev => {
                const church = state.churches.find(c => c.id === ev.churchId)
                const cat = getCategoryStyle(ev.kind)
                return (
                  <tr key={ev.id}>
                    <td>
                      <strong>{ev.name}</strong>
                    </td>
                    <td>{church?.name || ev.scopeAudience || 'Nacional'}</td>
                    <td>{ev.date}</td>
                    <td>{ev.time || '—'}</td>
                    <td>
                      <span className="cat-pill" style={{ background: cat.bg, color: cat.fg }}>
                        {ev.kind || 'Culto'}
                      </span>
                    </td>
                    <td>
                      {ev.modality === 'Online' ? 'Online' : 'Presencial'}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </td>
                    <td>
                      <small>
                        {ev.publicVisible === 'No' ? 'Interno' : 'Público'}
                        {ev.featured === 'Sí' ? ' · Destacado' : ''}
                      </small>
                    </td>
                    <td>
                      {canEditEvent(ev) && (
                        <button type="button" onClick={() => onEditEvent(ev)}>
                          Abrir / editar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredEvents.length === 0 && (
            <p className="empty-state">Todavía no hay registros con estos filtros. Usa «Nuevo registro» para comenzar.</p>
          )}
        </div>
        {filteredEvents.length > adminLimit && (
          <button type="button" className="calendar-show-more" onClick={() => setAdminLimit(limit => limit + 10)}>
            Ver más eventos ({filteredEvents.length - adminLimit} restantes)
          </button>
        )}
      </section>}
    </div>
  )
}

export function EventModal({
  row,
  state,
  scope,
  wsType,
  committeeKey,
  close,
  save
}: {
  row: Row
  state: State
  scope: string
  wsType: string
  committeeKey?: string
  close: () => void
  save: (c: string, r: Row) => Promise<any>
}) {
  const [draft, setDraft] = useState<Row>(() => ({
    name: row.name || '',
    churchId: scope || row.churchId || '',
    preachingPlaceId: row.preachingPlaceId || '',
    date: row.date || todayStr(),
    time: row.time || '19:00',
    kind: row.kind || 'Culto',
    modality: row.modality || 'Presencial',
    location: row.location || '',
    onlineUrl: row.onlineUrl || '',
    responsible: row.responsible || '',
    committeeKey: row.committeeKey || committeeKey || '',
    scopeAudience:
      row.scopeAudience ||
      (wsType === 'national_admin' ? 'Nacional' : wsType === 'national_committee' ? 'Comité Nacional' : 'Congregación local'),
    publicVisible: row.publicVisible || 'Sí',
    featured: row.featured || 'No',
    showInChurchCalendar: row.showInChurchCalendar || 'Sí',
    activityId: row.activityId || '',
    notes: row.notes || '',
    ...row
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await save('events', {
        ...draft,
        churchId: scope || draft.churchId || ''
      })
      close()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={ref}
      className="record-dialog event-dialog"
      onCancel={e => {
        if (busy) e.preventDefault()
        else close()
      }}
    >
      <form onSubmit={handleSubmit}>
        <div className="record-heading">
          <div>
            <span className="eyebrow">Calendario y Agenda</span>
            <h2>{row.id ? 'Editar evento o encuentro' : 'Nuevo evento o encuentro'}</h2>
          </div>
          <button type="button" disabled={busy} onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="record-fields">
          <label>
            <span>Nombre *</span>
            <input
              required
              aria-label="Nombre *"
              placeholder="Ej. Culto dominical, Vigilia de jóvenes, Convención..."
              value={draft.name || ''}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            />
          </label>

          <label>
            <span>Tipo *</span>
            <select
              required
              aria-label="Tipo *"
              value={draft.kind || 'Culto'}
              onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))}
            >
              {EVENT_CATEGORIES.map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Fecha *</span>
            <input
              required
              type="date"
              aria-label="Fecha *"
              value={draft.date || ''}
              onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
            />
          </label>

          <label>
            <span>Hora</span>
            <input
              type="time"
              aria-label="Hora"
              value={draft.time || ''}
              onChange={e => setDraft(d => ({ ...d, time: e.target.value }))}
            />
          </label>

          {!scope ? (
            <label>
              <span>Congregación *</span>
              <select
                aria-label="Congregación *"
                value={draft.churchId || ''}
                onChange={e => setDraft(d => ({ ...d, churchId: e.target.value }))}
              >
                <option value="">Nacional / Todas las congregaciones</option>
                {state.churches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="field-readonly-tag">
              <span>Congregación asignada</span>
              <strong>{state.churches.find(c => c.id === scope)?.name || scope}</strong>
            </div>
          )}

          <label>
            <span>Modalidad</span>
            <select
              aria-label="Modalidad"
              value={draft.modality || 'Presencial'}
              onChange={e => setDraft(d => ({ ...d, modality: e.target.value }))}
            >
              <option value="Presencial">Presencial</option>
              <option value="Online">Online</option>
              <option value="Híbrido">Híbrido</option>
            </select>
          </label>

          <label>
            <span>Lugar</span>
            <input
              aria-label="Lugar"
              placeholder="Ej. Templo central, Plaza, Sala Zoom..."
              value={draft.location || ''}
              onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
            />
          </label>

          {(draft.modality === 'Online' || draft.modality === 'Híbrido') && (
            <label>
              <span>Enlace online</span>
              <input
                type="url"
                aria-label="Enlace online"
                placeholder="https://zoom.us/j/... o https://meet.google.com/..."
                value={draft.onlineUrl || ''}
                onChange={e => setDraft(d => ({ ...d, onlineUrl: e.target.value }))}
              />
            </label>
          )}

          <label>
            <span>Responsable</span>
            <input
              aria-label="Responsable"
              placeholder="Ej. Pastor local, Junta Nacional, Comité de Jóvenes..."
              value={draft.responsible || ''}
              onChange={e => setDraft(d => ({ ...d, responsible: e.target.value }))}
            />
          </label>

          <label>
            <span>Comité relacionado</span>
            <select
              aria-label="Comité relacionado"
              value={draft.committeeKey || ''}
              onChange={e => setDraft(d => ({ ...d, committeeKey: e.target.value }))}
            >
              <option value="">Ninguno / General</option>
              {NATIONAL_COMMITTEES.map((c: any) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Destinatarios / Alcance</span>
            <input
              aria-label="Destinatarios / Alcance"
              placeholder="Ej. Toda la congregación, Jóvenes, Nacional..."
              value={draft.scopeAudience || ''}
              onChange={e => setDraft(d => ({ ...d, scopeAudience: e.target.value }))}
            />
          </label>

          <div className="event-visibility-checks" style={{ gridColumn: '1 / -1' }}>
            <label className="inline-check-option">
              <input
                type="checkbox"
                checked={draft.publicVisible !== 'No'}
                onChange={e => setDraft(d => ({ ...d, publicVisible: e.target.checked ? 'Sí' : 'No' }))}
              />
              <span>Visible públicamente</span>
            </label>
            <label className="inline-check-option">
              <input
                type="checkbox"
                checked={draft.featured === 'Sí'}
                onChange={e => setDraft(d => ({ ...d, featured: e.target.checked ? 'Sí' : 'No' }))}
              />
              <span>Destacado en el calendario</span>
            </label>
            <label className="inline-check-option">
              <input
                type="checkbox"
                checked={draft.showInChurchCalendar !== 'No'}
                onChange={e => setDraft(d => ({ ...d, showInChurchCalendar: e.target.checked ? 'Sí' : 'No' }))}
              />
              <span>Mostrar en el calendario de las congregaciones</span>
            </label>
          </div>

          <label style={{ gridColumn: '1 / -1' }}>
            <span>Notas y descripción</span>
            <textarea
              aria-label="Notas"
              rows={3}
              placeholder="Detalles del programa, invitados, indicaciones..."
              value={draft.notes || ''}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="crm-error">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" disabled={busy} className="secondary-action" onClick={close}>
            Cancelar
          </button>
          <button className="primary-action" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar registro'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
