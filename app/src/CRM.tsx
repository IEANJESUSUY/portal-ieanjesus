import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  FileText,
  Home,
  MessageSquare,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  ClipboardList,
  Video,
  Zap,
  Download,
  FileSpreadsheet,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Link2,
  LayoutGrid,
  Upload,
  UsersRound,
  MessageCircle,
  X
} from 'lucide-react'
import {
  catalog as definitions,
  calculateAge,
  getAgeCategory,
  personAgeCategory,
  segmentPerson,
  validateState,
  NATIONAL_COMMITTEES,
  LOCAL_COMMITTEES,
  DEFAULT_AGE_RANGES
} from '../shared/catalog.mjs'
import { empty as emptyState, localApi } from './local-data'
import { CloudLogin } from './components/CloudLogin'
import { UsersAdmin } from './components/UsersAdmin'
import { createDemoState } from './demo-data'
import { OperationalHome } from './components/OperationalHome'
import { PRINT_NATIONAL_SUMMARY, ReportHub } from './components/ReportStudio'
import { CalendarModule, CalendarPreviewCard, EventModal } from './components/CalendarModule'
import { whatsappLink } from './whatsapp'
import { useTableLabels } from './useTableLabels'
import { cloudApi, cloudEnabled } from './cloud'
import { EXPENSE_ITEMS, FIXED_EXPENSES, expenseItemOf } from './finance'
import { LocalChurchCommitteesView, NationalAdminCommitteesView } from './components/CommitteesModule'
import { QuickMode, requestQuickFlow } from './components/QuickMode'
import { LocalRequests } from './components/LocalRequests'
import { SectionTabs } from './components/SectionTabs'

import { type Row, type State, money, today, label, normalizeText, formatDate, plural, committeeLabel, findPossibleDuplicates, lastDateForWeekday, WEEKDAYS, compressPhoto, compressFor, parseCsv } from './utils'
import { PeopleImport } from './components/PeopleImport'
type Field = { key: string; label: string; type: string; required: boolean; options: string[] }
const catalog = definitions as Record<string, { title: string; fields: Field[] }>
const routes: Record<string, string> = {
  '/iglesias': 'churches',
  '/personas': 'people',
  '/familias': 'families',
  '/finanzas': 'transactions'
}

function parseLocalNumber(value: unknown) {
  const cleaned = String(value ?? '').replace(/[$\s]/g, '')
  if (!cleaned) return 0
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function normalizeGoogleSheetUrl(value: string) {
  const url = value.trim()
  if (!url) return ''
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1]
  if (!id) return url
  const gid = url.match(/[?&#]gid=(\d+)/)?.[1] || '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

const escapeXml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const isTitheTransaction = (row: Row) =>
  /diezmo/i.test([row.category, row.name, row.description, row.subCategory].filter(Boolean).join(' '))

function downloadExcelWorkbook(state: State, scope = '') {
  const inScope = (row: Row) => !scope || row.churchId === scope || row.preachingPlaceId === scope
  const churches = state.churches.filter(c => !scope || c.id === scope || c.parentChurchId === scope)
  const churchName = (id: string) => state.churches.find(c => c.id === id)?.name || 'Administración Nacional'
  const rows = (headers: string[], data: unknown[][]) => `<Row>${headers.map(h => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>${data.map(row => `<Row>${row.map(cell => { const numeric = typeof cell === 'number' && Number.isFinite(cell); return `<Cell><Data ss:Type="${numeric ? 'Number' : 'String'}">${escapeXml(cell)}</Data></Cell>` }).join('')}</Row>`).join('')}`
  const sheet = (name: string, headers: string[], data: unknown[][]) => `<Worksheet ss:Name="${escapeXml(name.slice(0, 31))}"><Table>${rows(headers, data)}</Table></Worksheet>`
  const scopedPeople = state.people.filter(inScope)
  const scopedFamilies = state.families.filter(inScope)
  const scopedEvents = state.events.filter(inScope)
  const scopedTx = state.transactions.filter(t => inScope(t) && !isTitheTransaction(t))
  const scopedReports = state.monthlyReports.filter(inScope)
  const scopedCellGroups = state.groups.filter(group => group.kind === 'Célula' && inScope(group))
  const scopedCellReports = (state.cellReports || []).filter(inScope)
  const income = scopedTx.filter(t => t.direction === 'Ingreso').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const expenses = scopedTx.filter(t => t.direction === 'Egreso').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const result = income - expenses
  const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#073B7A" ss:Pattern="Solid"/></Style></Styles>${sheet('Resumen', ['Indicador', 'Valor'], [['Ámbito', scope ? churchName(scope) : 'Administración Nacional'], ['Personas vinculadas', scopedPeople.filter(p => p.status !== 'Amigo').length], ['Amigos', scopedPeople.filter(p => p.status === 'Amigo').length], ['Encuentros', scopedEvents.length], ['Ingresos (UYU)', income], ['Egresos (UYU)', expenses], ['Resultado neto (UYU)', result], ['Patrimonio acumulado (UYU)', result]])}${sheet('Estado de resultados', ['Concepto', 'Importe (UYU)'], [['Ingresos', income], ['Egresos', expenses], ['Resultado neto', result]])}${sheet('Estado patrimonial', ['Concepto', 'Importe (UYU)'], [['Patrimonio acumulado', result], ['Activos registrados', 0], ['Pasivos registrados', 0]])}${sheet('Personas', ['Nombre', 'Apellidos', 'Congregación', 'Estado', 'Género', 'Fecha de nacimiento', 'Celular', 'Familia'], scopedPeople.map(p => [p.name, p.surname, churchName(p.churchId), p.status, p.gender, p.birthday, p.phone, state.families.find(f => f.id === p.familyId)?.name || '']))}${sheet('Familias', ['Familia', 'Congregación', 'Domicilio', 'Integrantes'], scopedFamilies.map(f => [f.name, churchName(f.churchId), f.address, scopedPeople.filter(p => p.familyId === f.id).map(label).join(', ')]))}${sheet('Asistencias', ['Encuentro', 'Fecha', 'Congregación', 'Personas', 'Visitas'], state.attendance.filter(a => scopedEvents.some(e => e.id === a.eventId)).map(a => { const e = state.events.find(event => event.id === a.eventId); return [e?.name || 'Encuentro', e?.date || '', churchName(a.churchId), a.people?.length || 0, a.visitors || 0] }))}${sheet('Finanzas', ['Fecha', 'Congregación', 'Movimiento', 'Categoría', 'Clasificación', 'Concepto', 'Importe (UYU)', 'Comité'], scopedTx.map(t => [t.date, churchName(t.churchId), t.direction, t.category, t.accountType || 'Operación', t.name, Number(t.amount || 0), t.committeeKey || 'Local']))}${sheet('Actividades', ['Nombre', 'Fecha límite', 'Estado', 'Comité', 'Descripción'], state.nationalActivities.map(a => [a.name, a.deadline, a.status, a.committeeKey, a.description]))}${sheet('Informes', ['Nombre', 'Período', 'Tipo', 'Estado'], scopedReports.map(r => [r.name, r.month, r.reportType === 'quarterly' ? 'Cuatrimestral' : 'Mensual', r.status]))}${sheet('Células', ['Célula', 'Congregación', 'Líder', 'Horario', 'Zona'], scopedCellGroups.map(group => [group.name, churchName(group.churchId), label(state.people.find(person => person.id === group.leaderId)), group.schedule, group.location]))}${sheet('Informes de células', ['Semana desde', 'Semana hasta', 'Célula', 'Adultos', 'Visitas', 'Niños', 'Asistencia', 'Ofrenda (UYU)', 'Origen'], scopedCellReports.map(report => { const attendance = Number(report.adults || 0) + Number(report.visitors || 0) + Number(report.children || 0); return [report.weekStart, report.weekEnd, state.groups.find(group => group.id === report.groupId)?.name || report.name, Number(report.adults || 0), Number(report.visitors || 0), Number(report.children || 0), attendance, Number(report.offering || 0), report.source] }))}</Workbook>`
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `portal-nacional-${today()}-excel.xls`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Resuelve espacios por identificador o nombre sin mezclar congregaciones.
function normalizeWorkspaceText(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b(iglesia|congregacion|congregación|lugar de predicacion|lugar de predicación)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function resolveWorkspaceId(churches: Row[], workspace?: { id?: string; name?: string } | null) {
  if (!workspace) return ''
  const direct = churches.find(c => c.id === workspace.id)
  if (direct) return direct.id
  const byName = churches.find(c => c.name === workspace.name)
  const byNormalizedName = churches.find(c => normalizeWorkspaceText(c.name) === normalizeWorkspaceText(workspace.name))
  return byName?.id || byNormalizedName?.id || workspace.id || ''
}

async function api(path: string, body?: unknown) {
  // Con la base central configurada, todo se guarda allá; si no, en este dispositivo.
  if (cloudEnabled()) return cloudApi(path, body)
  if (location.protocol === 'file:') return localApi(path, body)
  const response = await fetch(path === 'restore' ? '/api/restore' : `/api/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.')
  return result
}

// --- Componentes de Gráficos SVG con Estados Vacíos Reales ---

function EmptyChartCard({ title, period, explanation }: { title: string; period?: string; explanation: string }) {
  return (
    <div className="chart-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3>{title}</h3>
          {period && <p style={{ margin: '2px 0 10px', fontSize: '.78rem', color: '#788078' }}>Período: {period}</p>}
        </div>
      </div>
      <div className="chart-empty-state">
        <span className="chart-empty-badge">Sin datos todavía</span>
        <p>{explanation}</p>
        <svg viewBox="0 0 180 40" width="160" height="40" style={{ marginTop: 10, opacity: 0.35 }}>
          <line x1="10" y1="35" x2="170" y2="35" stroke="#788078" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="10" y1="10" x2="10" y2="35" stroke="#788078" strokeWidth="1.5" />
          <rect x="30" y="24" width="16" height="11" fill="#b0c0b2" rx="2" />
          <rect x="65" y="18" width="16" height="17" fill="#b0c0b2" rx="2" />
          <rect x="100" y="28" width="16" height="7" fill="#b0c0b2" rx="2" />
          <rect x="135" y="20" width="16" height="15" fill="#b0c0b2" rx="2" />
        </svg>
      </div>
    </div>
  )
}

function DonutChart({ items, title, subtitle, period }: { items: { label: string; value: number; color: string }[]; title: string; subtitle?: string; period?: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const total = items.reduce((s, i) => s + i.value, 0)
  let accumulatedAngle = 0

  if (total === 0) {
    return <EmptyChartCard title={title} period={period} explanation={`Sin datos todavía en ${title.toLowerCase()}. Se mostrará cuando existan registros en el período.`} />
  }

  const slices = items.map((item, index) => {
    const percentage = total > 0 ? item.value / total : 0
    const startAngle = accumulatedAngle
    const angle = percentage * 360
    accumulatedAngle += angle
    const endAngle = accumulatedAngle

    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (endAngle - 90) * (Math.PI / 180)

    const r = 70
    const x1 = 100 + r * Math.cos(startRad)
    const y1 = 100 + r * Math.sin(startRad)
    const x2 = 100 + r * Math.cos(endRad)
    const y2 = 100 + r * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0
    const d = total === 0 || percentage === 0 ? '' : angle >= 359.99
      ? `M 100 ${100 - r} A ${r} ${r} 0 1 1 99.99 ${100 - r} Z`
      : `M 100 100 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return { ...item, percentage, d, index }
  })

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      <div className="chart-container">
        <svg viewBox="0 0 200 200" width="180" height="180" style={{ overflow: 'visible' }}>
          {slices.map((s) => (
            s.d ? (
              <path
                key={s.index}
                d={s.d}
                fill={s.color}
                stroke="#fff"
                strokeWidth="2"
                opacity={hovered === null || hovered === s.index ? 1 : 0.45}
                onMouseEnter={() => setHovered(s.index)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
              />
            ) : null
          ))}
          <circle cx="100" cy="100" r="46" fill="#fff" />
          <text x="100" y="96" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#18392f">
            {hovered !== null ? items[hovered].value : total}
          </text>
          <text x="100" y="112" textAnchor="middle" fontSize="9" fill="#788078">
            {hovered !== null ? items[hovered].label : 'Total'}
          </text>
        </svg>
      </div>
      <div className="chart-legend">
        {items.map((item, idx) => (
          <div
            key={item.label}
            className="chart-legend-item"
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer', opacity: hovered === null || hovered === idx ? 1 : 0.5 }}
          >
            <span className="chart-legend-color" style={{ background: item.color }} />
            <span>{item.label}: <strong>{item.value}</strong> ({Math.round((item.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AttendanceStackedChart({ events, attendance, people }: { events: Row[]; attendance: Row[]; people: Row[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const peopleMap = new Map(people.map(p => [p.id, p]))

  const data = events.map(ev => {
    const att = attendance.find(a => a.eventId === ev.id)
    if (!att) return null
    let adults = 0
    let youth = 0
    let kids = 0
    for (const pid of att.people || []) {
      const p = peopleMap.get(pid)
      const cat = personAgeCategory(p)
      if (cat === 'Niño') kids++
      else if (cat === 'Joven') youth++
      else adults++
    }
    const visitors = Number(att.visitors || 0)
    const total = adults + youth + kids + visitors
    return { name: ev.name, date: ev.date, adults, youth, kids, visitors, total }
  }).filter(Boolean) as { name: string; date: string; adults: number; youth: number; kids: number; visitors: number; total: number }[]

  if (data.length === 0) {
    return <EmptyChartCard title="Asistencia por Culto y Actividad" explanation="Sin datos todavía de asistencias. Las barras reflejarán adultos, jóvenes, niños y visitas cuando se pase lista en los cultos." />
  }

  const maxTotal = Math.max(...data.map(d => d.total), 10)
  const height = 150
  const width = Math.max(340, data.length * 64)

  return (
    <div className="chart-card">
      <div className="page-title-row" style={{ marginBottom: 12 }}>
        <div>
          <h3>Asistencia por Culto y Desglose de Edades</h3>
          <p>Evolución de asistentes divididos en Adultos, Jóvenes, Niños y Visitas.</p>
        </div>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <svg viewBox={`0 0 ${width} 190`} width="100%" height="190" style={{ minWidth: width, maxHeight: 220 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = 20 + height * (1 - ratio)
            const val = Math.round(maxTotal * ratio)
            return (
              <g key={i}>
                <line x1="32" y1={y} x2={width - 10} y2={y} stroke="#e4ebe2" strokeDasharray="3 3" />
                <text x="26" y={y + 4} textAnchor="end" fontSize="10" fill="#889189">{val}</text>
              </g>
            )
          })}

          {data.map((d, i) => {
            const barWidth = 34
            const x = 45 + i * 56
            const scale = height / maxTotal

            const hAdults = d.adults * scale
            const hYouth = d.youth * scale
            const hKids = d.kids * scale
            const hVisitors = d.visitors * scale

            const yAdults = 20 + height - hAdults
            const yYouth = yAdults - hYouth
            const yKids = yYouth - hKids
            const yVisitors = yKids - hVisitors

            const isHovered = hoveredIdx === i

            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} style={{ cursor: 'pointer' }}>
                {d.visitors > 0 && <rect x={x} y={yVisitors} width={barWidth} height={hVisitors} fill="#f7b625" rx={d.kids === 0 && d.youth === 0 && d.adults === 0 ? 4 : 0} />}
                {d.kids > 0 && <rect x={x} y={yKids} width={barWidth} height={hKids} fill="#7cc8ff" rx={d.visitors === 0 && d.youth === 0 && d.adults === 0 ? 4 : 0} />}
                {d.youth > 0 && <rect x={x} y={yYouth} width={barWidth} height={hYouth} fill="#2d9bf0" rx={d.visitors === 0 && d.kids === 0 && d.adults === 0 ? 4 : 0} />}
                {d.adults > 0 && <rect x={x} y={yAdults} width={barWidth} height={hAdults} fill="#073b7a" rx={d.visitors === 0 && d.kids === 0 && d.youth === 0 ? 4 : 0} />}

                <text x={x + barWidth / 2} y={Math.max(16, yVisitors - 4)} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#18392f">{d.total}</text>
                <text x={x + barWidth / 2} y={184} textAnchor="middle" fontSize="9" fill="#626a64">{d.date.slice(5)}</text>

                {isHovered && (
                  <g>
                    <rect x={Math.min(x - 30, width - 150)} y={10} width="140" height="74" rx="8" fill="#18392f" opacity="0.95" />
                    <text x={Math.min(x - 22, width - 142)} y={26} fill="#fff" fontSize="10" fontWeight="bold">{d.name} ({d.date})</text>
                    <text x={Math.min(x - 22, width - 142)} y={40} fill="#e5f0e7" fontSize="9">Adultos: {d.adults}</text>
                    <text x={Math.min(x - 22, width - 142)} y={52} fill="#e9f0e1" fontSize="9">Jóvenes: {d.youth}</text>
                    <text x={Math.min(x - 22, width - 142)} y={64} fill="#f4f6e6" fontSize="9">Niños: {d.kids}</text>
                    <text x={Math.min(x - 22, width - 142)} y={76} fill="#fbf3e0" fontSize="9">Visitas: {d.visitors}</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="chart-legend">
        <div className="chart-legend-item"><span className="chart-legend-color" style={{ background: '#073b7a' }} /><span>Adultos (26+ años)</span></div>
        <div className="chart-legend-item"><span className="chart-legend-color" style={{ background: '#2d9bf0' }} /><span>Jóvenes (12-25 años)</span></div>
        <div className="chart-legend-item"><span className="chart-legend-color" style={{ background: '#7cc8ff' }} /><span>Niños (0-11 años)</span></div>
        <div className="chart-legend-item"><span className="chart-legend-color" style={{ background: '#f7b625' }} /><span>Visitas sin ficha</span></div>
      </div>
    </div>
  )
}

function MonthlyFinanceChart({ transactions }: { transactions: Row[] }) {
  const monthsMap = new Map<string, { incoming: number; outgoing: number }>()

  for (const t of transactions) {
    const month = (t.date || '').slice(0, 7)
    if (!month) continue
    if (!monthsMap.has(month)) monthsMap.set(month, { incoming: 0, outgoing: 0 })
    const item = monthsMap.get(month)!
    const amt = Math.round(Number(t.amount || 0) * 100) / 100
    if (t.direction === 'Ingreso') item.incoming += amt
    else if (t.direction === 'Egreso') item.outgoing += amt
  }

  const months = Array.from(monthsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  if (months.length === 0) {
    return <EmptyChartCard title="Ingresos y Egresos por Período" explanation="Sin datos todavía de movimientos financieros. Se reflejarán ingresos y egresos al registrar ofrendas, votos o gastos." />
  }

  const maxVal = Math.max(...months.map(([_, v]) => Math.max(v.incoming, v.outgoing)), 1000)
  const height = 130
  const width = Math.max(300, months.length * 80)

  return (
    <div className="chart-card">
      <h3>Comparativa Financiera Mensual</h3>
      <p>Ingresos y egresos en pesos uruguayos (UYU).</p>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} 175`} width="100%" height="175" style={{ minWidth: width }}>
          {[0, 0.5, 1].map((ratio, i) => {
            const y = 15 + height * (1 - ratio)
            const val = Math.round(maxVal * ratio)
            return (
              <g key={i}>
                <line x1="38" y1={y} x2={width - 10} y2={y} stroke="#e4ebe2" strokeDasharray="3 3" />
                <text x="32" y={y + 4} textAnchor="end" fontSize="9" fill="#889189">${val}</text>
              </g>
            )
          })}

          {months.map(([m, val], idx) => {
            const x = 55 + idx * 75
            const scale = height / maxVal
            const hInc = Math.max(2, val.incoming * scale)
            const hOut = Math.max(2, val.outgoing * scale)
            const yInc = 15 + height - hInc
            const yOut = 15 + height - hOut

            return (
              <g key={m}>
                <rect x={x} y={yInc} width="16" height={hInc} fill="#073b7a" rx="3" />
                <rect x={x + 18} y={yOut} width="16" height={hOut} fill="#f7b625" rx="3" />
                <text x={x + 17} y={160} textAnchor="middle" fontSize="10" fill="#626a64">{m}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="chart-legend">
        <div className="chart-legend-item"><span className="chart-legend-color" style={{ background: '#073b7a' }} /><span>Ingresos</span></div>
        <div className="chart-legend-item"><span className="chart-legend-color" style={{ background: '#f7b625' }} /><span>Egresos</span></div>
      </div>
    </div>
  )
}

// --- Componente de Búsqueda y Deduplicación de Personas (Ficha Única Nacional) ---

function PersonMatcherModal({
  people,
  churches,
  onSelectPerson,
  onCreateNew,
  onClose
}: {
  people: Row[]
  churches: Row[]
  onSelectPerson: (person: Row) => void
  onCreateNew: () => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = query.trim()
    ? people.filter(p =>
        label(p).toLowerCase().includes(query.toLowerCase()) ||
        (p.phone || '').includes(query)
      )
    : people.slice(0, 10)

  return (
    <dialog open className="record-dialog" style={{ zIndex: 100 }}>
      <div className="record-heading">
        <div>
          <span className="eyebrow">Ficha Única Nacional</span>
          <h2>Buscar persona existente</h2>
          <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#68726a' }}>
            Para evitar perfiles duplicados, busca primero si la persona ya existe en el directorio nacional.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>

      <div style={{ margin: '16px 0' }}>
        <input
          type="search"
          placeholder="Escribe nombre, apellido o celular..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          style={{ width: '100%', padding: '12px', fontSize: '.95rem', borderRadius: 10, border: '1px solid #b7c4b9' }}
        />
      </div>

      <div className="person-match-grid">
        {filtered.map(p => {
          const age = calculateAge(p.birthday)
          const churchName = churches.find(c => c.id === p.churchId)?.name || 'Congregación sin asignar'
          return (
            <div key={p.id} className="person-match-card">
              <div className="person-match-head">
                {p.photo ? (
                  <img src={p.photo} alt={label(p)} />
                ) : (
                  <div className="person-avatar" style={{ background: '#eef2eb' }}>{p.name?.[0] || '—'}</div>
                )}
                <div>
                  <strong>{label(p)}</strong>
                  <span style={{ display: 'block', fontSize: '.78rem', color: '#68726a' }}>
                    {age !== null ? `${age} años` : 'Edad no inf.'} · {p.phone || 'Sin tel.'}
                  </span>
                  <span style={{ display: 'block', fontSize: '.74rem', color: '#285a46', fontWeight: 600 }}>
                    {churchName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="primary-action"
                style={{ minHeight: 34, fontSize: '.8rem' }}
                onClick={() => onSelectPerson(p)}
              >
                Seleccionar esta ficha existente
              </button>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', padding: '24px 0', color: '#788078' }}>
          No se encontraron coincidencias para «{query}».
        </p>
      )}

      <div style={{ marginTop: 20, borderTop: '1px solid #e1e6dd', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.85rem', color: '#68726a' }}>¿No es ninguna de las anteriores?</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="secondary-action" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary-action" onClick={onCreateNew}>+ Crear nueva persona</button>
        </div>
      </div>
    </dialog>
  )
}

// --- Componente Modal de Desglose Financiero al Tocar Totales ---

function FinancialBreakdownModal({
  title,
  transactions,
  churches,
  onClose
}: {
  title: string
  transactions: Row[]
  churches: Row[]
  onClose: () => void
}) {
  const visibleTransactions = transactions.filter(t => !isTitheTransaction(t))
  const total = visibleTransactions.reduce((s, t) => s + Number(t.amount || 0), 0)

  return (
    <dialog open className="record-dialog" style={{ zIndex: 110 }}>
      <div className="record-heading">
        <div>
          <span className="eyebrow">Detalle Financiero Verificado</span>
          <h2>{title}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '.88rem', color: '#68726a' }}>
            Total consolidado: <strong>{money(total)}</strong> ({visibleTransactions.length} movimientos)
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>

      <div className="crm-table-wrap" style={{ marginTop: 16 }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Congregación</th>
              <th>Concepto / Subcategoría</th>
              <th>Importe (UYU)</th>
              <th>Estado</th>
              <th>Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map(t => {
              const ch = churches.find(c => c.id === t.churchId)
              return (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td><strong>{ch?.name || 'Nacional'}</strong></td>
                  <td>
                    {t.name}
                    {t.subCategory && <small style={{ display: 'block', color: '#68726a' }}>{t.subCategory}</small>}
                  </td>
                  <td><strong>{money(Number(t.amount || 0))}</strong></td>
                  <td>
                    <span className={`status-badge ${String(t.financialStatus || 'registrado').toLowerCase().replace(/\s+/g, '-')}`}>
                      {t.financialStatus || 'Registrado'}
                    </span>
                  </td>
                  <td>{t.reference || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="empty-state">No hay movimientos registrados para este desglose.</p>
        )}
      </div>

      <div className="modal-actions" style={{ marginTop: 20 }}>
        <button type="button" className="secondary-action" onClick={onClose}>Cerrar detalle</button>
      </div>
    </dialog>
  )
}

// --- Componente Editor de Fichas (Personas, Familias, Iglesias, etc.) ---

// --- 1. Formulario Especializado para Personas (Amigo vs. Persona Vinculada) ---

function PersonModal({
  row,
  state,
  scope,
  workspaceName,
  close,
  save
}: {
  row: Row
  state: State
  scope: string
  workspaceName?: string
  close: () => void
  save: (c: string, r: Row) => Promise<any>
}) {
  const [draft, setDraft] = useState<Row>(() => {
    const rawSt = row.status === 'Miembro' ? 'Persona vinculada' : row.status === 'Visita' ? 'Amigo' : row.status
    const st = rawSt || 'Amigo'
    return {
      ...row,
      status: st,
      churchId: row.churchId || scope || '',
      preachingPlaceId: row.preachingPlaceId || ''
    }
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [duplicates, setDuplicates] = useState<Row[]>([])
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => { ref.current?.showModal() }, [])

  const isFriend = draft.status === 'Amigo'
  const calculatedAge = draft.birthday ? calculateAge(draft.birthday) : null
  const calculatedCategory = draft.birthday ? getAgeCategory(draft.birthday) : null

  const churchId = draft.churchId || scope
  const availablePreachingPlaces = state.churches.filter(c => c.isPreachingPlace === 'Sí' && (!churchId || c.parentChurchId === churchId))
  const availableFamilies = state.families.filter(f => !churchId || f.churchId === churchId)

  async function handlePhoto(file?: File) {
    if (!file) return
    try {
      const compressed = await compressFor('person', file)
      setDraft(d => ({ ...d, photo: compressed }))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  useEffect(() => { setDuplicates([]) }, [draft.name, draft.surname, draft.phone])

  async function handleSubmit(e: { preventDefault: () => void }, confirmedNew = false) {
    e.preventDefault()
    if (!row.id && !confirmedNew) {
      const matches = findPossibleDuplicates(state.people, draft)
      if (matches.length) {
        setDuplicates(matches)
        return
      }
    }
    setBusy(true)
    setError('')
    try {
      const toSave = {
        ...draft,
        churchId: scope || draft.churchId
      }
      await save('people', toSave)
      close()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog ref={ref} className="record-dialog person-dialog" onCancel={e => { if (busy) e.preventDefault(); else close() }}>
      <form onSubmit={handleSubmit}>
        <div className="record-heading">
          <div>
            <span className="eyebrow">{isFriend ? 'Registro de Amigo' : 'Ficha de Persona Vinculada'}</span>
            <h2>{row.id ? (isFriend ? 'Editar visita' : 'Editar persona de la iglesia') : (isFriend ? 'Anotar una visita' : 'Anotar persona de la iglesia')}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: '#63788d' }}>
              {isFriend
                ? 'Registro rápido para contactos y amigos de la congregación.'
                : 'Ficha completa con información congregacional, familiar y ministerial.'}
            </p>
          </div>
          <button type="button" disabled={busy} onClick={close} aria-label="Cerrar">×</button>
        </div>

        <div className="record-mode-card">
          <div>
            <strong>{isFriend ? 'Registro rápido de amigo' : 'Ficha completa de persona vinculada'}</strong>
            <p>{isFriend ? '¿Deseas vincular a esta persona con una familia y ministerio?' : '¿Deseas registrarlo únicamente como amigo para seguimiento?'}</p>
          </div>
          {isFriend ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => setDraft(d => ({ ...d, status: 'Persona vinculada' }))}
            >
              <UserCheck size={16} /> Completar información y vincular
            </button>
          ) : (
            <button
              type="button"
              className="secondary-action"
              onClick={() => setDraft(d => ({ ...d, status: 'Amigo' }))}
            >
              <UserPlus size={16} /> Usar registro de amigo
            </button>
          )}
        </div>

        <div className="record-fields">
          <label>
            <span>Fotografía</span>
            <div className="photo-picker-row">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handlePhoto(e.target.files?.[0])} />
              {draft.photo && (
                <div className="photo-preview-chip">
                  <img src={draft.photo} alt="Vista previa" className="record-photo" />
                  <button type="button" onClick={() => setDraft(d => ({ ...d, photo: '' }))}>Quitar foto</button>
                </div>
              )}
            </div>
          </label>

          <label>
            <span>Nombre *</span>
            <input
              required
              aria-label="Nombre *"
              value={draft.name || ''}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            />
          </label>

          <label>
            <span>{isFriend && scope ? 'Apellidos (opcional)' : 'Apellidos *'}</span>
            <input
              required={!isFriend}
              aria-label={isFriend && scope ? 'Apellidos (opcional)' : 'Apellidos *'}
              value={draft.surname || ''}
              onChange={e => setDraft(d => ({ ...d, surname: e.target.value }))}
            />
          </label>

          <label>
            <span>Género</span>
            <select
              aria-label="Género"
              value={draft.gender || 'No informado'}
              onChange={e => setDraft(d => ({ ...d, gender: e.target.value }))}
            >
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="No informado">No informado</option>
            </select>
          </label>

          <label>
            <span>Fecha de nacimiento</span>
            {calculatedAge !== null && (
              <span className="cat-tag" aria-hidden="true">{calculatedAge} años · {calculatedCategory}</span>
            )}
            <input
              type="date"
              aria-label="Fecha de nacimiento"
              max={today()}
              value={draft.birthday || ''}
              onChange={e => setDraft(d => ({ ...d, birthday: e.target.value }))}
            />
          </label>

          {!draft.birthday && (
            <label>
              <span>Edad aproximada</span>
              <select
                aria-label="Edad aproximada"
                value={draft.ageGroup || ''}
                onChange={e => setDraft(d => ({ ...d, ageGroup: e.target.value }))}
              >
                <option value="">Sin indicar</option>
                <option value="Niño">Niño</option>
                <option value="Joven">Joven</option>
                <option value="Adulto">Adulto</option>
              </select>
            </label>
          )}

          <label>
            <span>Celular</span>
            <input
              type="tel"
              aria-label="Celular"
              value={draft.phone || ''}
              onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
            />
          </label>

          {!scope ? (
            <label>
              <span>Congregación *</span>
              <select
                required
                aria-label="Congregación *"
                value={draft.churchId || ''}
                onChange={e => setDraft(d => ({ ...d, churchId: e.target.value, preachingPlaceId: '', familyId: '' }))}
              >
                <option value="">Seleccionar</option>
                {state.churches.map(c => <option key={c.id} value={c.id}>{label(c)}</option>)}
              </select>
            </label>
          ) : (
            <div className="field-readonly-tag">
              <span>Congregación asignada</span>
              <strong>{state.churches.find(c => c.id === scope)?.name || workspaceName || 'Congregación actual'}</strong>
            </div>
          )}

          {!isFriend && (
            <>
              {availablePreachingPlaces.length > 0 && (
                <label>
                  <span>Lugar de predicación vinculado</span>
                  <select
                    aria-label="Lugar de predicación vinculado"
                    value={draft.preachingPlaceId || ''}
                    onChange={e => setDraft(d => ({ ...d, preachingPlaceId: e.target.value }))}
                  >
                    <option value="">Ninguno / Sede central</option>
                    {availablePreachingPlaces.map(p => <option key={p.id} value={p.id}>{label(p)}</option>)}
                  </select>
                </label>
              )}

              <label>
                <span>Familia</span>
                <select
                  aria-label="Familia"
                  value={draft.familyId || ''}
                  onChange={e => setDraft(d => ({ ...d, familyId: e.target.value }))}
                >
                  <option value="">Sin familia asignada</option>
                  {availableFamilies.map(f => <option key={f.id} value={f.id}>{label(f)}</option>)}
                </select>
              </label>

              <label>
                <span>Vínculo familiar</span>
                <select
                  aria-label="Vínculo familiar"
                  value={draft.familyRole || ''}
                  onChange={e => setDraft(d => ({ ...d, familyRole: e.target.value }))}
                >
                  <option value="">Seleccionar vínculo</option>
                  {['Padre', 'Madre', 'Hijo/a', 'Abuelo/a', 'Nieto/a', 'Tutor/a', 'Otro'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>

              <label>
                <span>Barrio</span>
                <input
                  aria-label="Barrio"
                  value={draft.neighborhood || ''}
                  onChange={e => setDraft(d => ({ ...d, neighborhood: e.target.value }))}
                />
              </label>

              <label>
                <span>Dirección (opcional)</span>
                <input
                  aria-label="Dirección"
                  value={draft.address || ''}
                  onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
                />
              </label>

              <label>
                <span>¿Está bautizado/a?</span>
                <select
                  aria-label="¿Está bautizado/a?"
                  value={draft.baptized || (draft.baptism ? 'Sí' : '')}
                  onChange={e => setDraft(d => ({ ...d, baptized: e.target.value, ...(e.target.value === 'No' ? { baptism: '', baptismPrecision: '' } : {}) }))}
                >
                  <option value="">Sin dato</option>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              </label>

              {(draft.baptized === 'Sí' || draft.baptism) && (
                <label>
                  <span>Fecha de bautismo</span>
                  <input
                    type="date"
                    aria-label="Fecha de bautismo"
                    max={today()}
                    value={draft.baptism || ''}
                    onChange={e => setDraft(d => ({ ...d, baptized: 'Sí', baptism: e.target.value, baptismPrecision: e.target.value ? 'Exacta' : '' }))}
                  />
                  {draft.baptismPrecision === 'Solo año' && (
                    <small>Fecha aproximada: solo se sabe el año. Si sabés el día, cambiala acá.</small>
                  )}
                </label>
              )}

              <label>
                <span>Responsabilidad</span>
                <input
                  aria-label="Responsabilidad o comité"
                  placeholder="Ej. Líder local de Jóvenes, Alabanza, etc."
                  value={draft.role || ''}
                  onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
                />
              </label>

              <label>
                <span>Observaciones administrativas</span>
                <textarea
                  aria-label="Observaciones administrativas"
                  value={draft.notes || ''}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                />
              </label>
            </>
          )}

          {row.id && (
            <div className="attendance-history-box">
              <h4>Historial de asistencias</h4>
              {state.attendance.filter(a => a.people.includes(row.id)).length > 0 ? (
                <ul>
                  {state.attendance.filter(a => a.people.includes(row.id)).map(a => {
                    const ev = state.events.find(e => e.id === a.eventId)
                    return <li key={a.id}>{ev?.name || 'Culto'} · {ev?.date || '—'}</li>
                  })}
                </ul>
              ) : (
                <p>Sin asistencias registradas todavía.</p>
              )}
            </div>
          )}
        </div>

        {error && <p role="alert" className="crm-error">{error}</p>}

        {duplicates.length > 0 && (
          <div className="duplicate-warning" role="alert">
            <strong>¿Ya está registrada?</strong>
            <p>Encontramos {duplicates.length === 1 ? 'una ficha parecida' : `${duplicates.length} fichas parecidas`}:</p>
            <ul>
              {duplicates.slice(0, 4).map(p => (
                <li key={p.id}>
                  <strong>{label(p)}</strong>
                  <span>
                    {[p.phone, state.churches.find(c => c.id === p.churchId)?.name].filter(Boolean).join(' · ') || 'Sin más datos'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="duplicate-warning-actions">
              <button type="button" className="secondary-action" onClick={close}>Sí, ya está · no guardar</button>
              <button type="button" className="primary-action" onClick={e => { setDuplicates([]); handleSubmit(e, true) }}>
                No, es otra persona · guardar
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions" hidden={duplicates.length > 0}>
          <button type="button" disabled={busy} className="secondary-action" onClick={close}>Cancelar</button>
          <button type="submit" className="primary-action" disabled={busy}>
            {busy ? 'Guardando…' : isFriend ? 'Guardar amigo' : 'Guardar persona vinculada'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

// --- 2. Formulario Especializado de Ingresos y Egresos (Finanzas) ---

function FinanceMovementModal({
  row,
  state,
  scope,
  workspaceName,
  committeeKey,
  close,
  save
}: {
  row: Row
  state: State
  scope: string
  workspaceName?: string
  committeeKey?: string
  close: () => void
  save: (c: string, r: Row) => Promise<any>
}) {
  const [draft, setDraft] = useState<Row>(() => ({
    direction: 'Ingreso',
    category: 'Ofrenda',
    date: today(),
    financialStatus: 'Registrado',
    churchId: scope || '',
    committeeKey: committeeKey || '',
    ...row
  }))
  const [showDetails, setShowDetails] = useState<boolean>(() => Boolean(row.eventId || row.activityId || row.personId || row.subCategory || row.reference || row.notes || (row.accountType && row.accountType !== 'Operación')))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => { ref.current?.showModal() }, [])

  const churchId = draft.churchId || scope
  const availableGroups = state.groups.filter(g => !churchId || !g.churchId || g.churchId === churchId)
  const availableEvents = state.events.filter(e => !churchId || e.churchId === churchId)
  const availablePeople = state.people.filter(p => !churchId || p.churchId === churchId)

  async function handleReceipt(file?: File) {
    if (!file) return
    try {
      const compressed = await compressFor('receipt', file)
      setDraft(d => ({ ...d, receiptPhoto: compressed }))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const resolvedChurchId = state.churches.find(c => c.id === scope)?.id
        || state.churches.find(c => c.name === workspaceName)?.id
        || state.churches.find(c => normalizeWorkspaceText(c.name) === normalizeWorkspaceText(workspaceName))?.id
        || state.churches.find(c => c.id === draft.churchId)?.id
        || state.churches.find(c => c.name === draft.churchId)?.id
        || state.churches.find(c => normalizeWorkspaceText(c.name) === normalizeWorkspaceText(draft.churchId))?.id
        || (state.churches.length === 1 ? state.churches[0].id : '')
      if (!resolvedChurchId && !committeeKey) throw new Error('No se pudo identificar la congregación activa. Cierra sesión y vuelve a ingresar al espacio local.')
      const isTithe = draft.direction === 'Ingreso' && draft.category === 'Diezmo'
      const isExpense = draft.direction === 'Egreso'
      const expenseItem = isExpense ? expenseItemOf(draft) : ''
      const toSave = {
        ...draft,
        category: isExpense ? 'Gasto' : draft.category,
        name: isTithe ? 'Cierre general de diezmos' : draft.name || draft.description || expenseItem || 'Movimiento',
        description: isTithe ? 'Cierre general de diezmos' : draft.name || draft.description || expenseItem || '',
        reference: isTithe ? '' : draft.reference || '',
        receiptPhoto: isTithe ? '' : draft.receiptPhoto || '',
        groupId: isTithe ? '' : draft.groupId || '',
        subCategory: isTithe ? '' : isExpense ? expenseItem : draft.subCategory || '',
        committeeKey: isTithe ? '' : committeeKey || draft.committeeKey || '',
        churchId: resolvedChurchId,
        financialStatus: draft.financialStatus || 'Registrado'
      }
      await save('transactions', toSave)
      close()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog ref={ref} className="record-dialog finance-movement-dialog" onCancel={e => { if (busy) e.preventDefault(); else close() }}>
      <form onSubmit={handleSubmit}>
        <div className="record-heading">
          <div>
            <span className="eyebrow">Gestión Financiera</span>
            <h2>{row.id ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: '#63788d' }}>
              Registra un ingreso o egreso de forma rápida.
            </p>
          </div>
          <button type="button" disabled={busy} onClick={close} aria-label="Cerrar">×</button>
        </div>

        {/* Selección clara de movimiento con dos botones grandes */}
        <div className="movement-toggle-row">
          <button
            type="button"
            className={`movement-btn ingreso ${draft.direction === 'Ingreso' ? 'active' : ''}`}
            onClick={() => setDraft(d => ({ ...d, direction: 'Ingreso', category: d.category === 'Gasto' ? 'Ofrenda' : d.category }))}
          >
            <ArrowDownLeft size={22} />
            <div>
              <strong>Ingreso</strong>
              <span>Diezmos, ofrendas y entradas</span>
            </div>
          </button>
          <button
            type="button"
            className={`movement-btn egreso ${draft.direction === 'Egreso' ? 'active' : ''}`}
            onClick={() => setDraft(d => ({ ...d, direction: 'Egreso', category: ['Diezmo', 'Ofrenda'].includes(d.category) ? 'Gasto' : d.category }))}
          >
            <ArrowUpRight size={22} />
            <div>
              <strong>Egreso</strong>
              <span>Gastos, compras y pagos</span>
            </div>
          </button>
        </div>

        <label style={{ display: 'none' }}>
          <span>Movimiento *</span>
          <select
            aria-label="Movimiento *"
            value={draft.direction}
            onChange={e => setDraft(d => ({ ...d, direction: e.target.value }))}
          >
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </select>
        </label>

        <div className="record-fields finance-brief-fields">
          {draft.direction === 'Egreso' ? (
            // Los gastos se anotan por rubro: así se controlan luz, agua, internet y demás servicios mes a mes.
            <label>
              <span>Rubro del gasto *</span>
              <select
                required
                aria-label="Rubro del gasto *"
                value={expenseItemOf(draft)}
                onChange={e => setDraft(d => ({ ...d, category: 'Gasto', subCategory: e.target.value }))}
              >
                {EXPENSE_ITEMS.map(item => (
                  <option key={item.label} value={item.label}>{item.label}{item.hint ? ` (${item.hint})` : ''}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              <span>Concepto *</span>
              <select
                required
                aria-label="Concepto *"
                value={draft.category || 'Ofrenda'}
                onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
              >
                {['Diezmo', 'Ofrenda', 'Donación', 'Otro']
                  .concat([draft.category].filter(c => c && !['Diezmo', 'Ofrenda', 'Donación', 'Gasto', 'Otro'].includes(c)))
                  .map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}

          <label>
            <span>{draft.category === 'Diezmo' ? 'Movimiento general' : draft.direction === 'Egreso' ? 'Detalle (opcional)' : 'Descripción o referencia *'}</span>
            <input
              required={draft.category !== 'Diezmo' && draft.direction !== 'Egreso'}
              disabled={draft.category === 'Diezmo'}
              aria-label={draft.category === 'Diezmo' ? 'Movimiento general' : 'Descripción o referencia *'}
              placeholder={draft.direction === 'Ingreso' ? 'Ej. Ofrenda del culto del domingo' : 'Ej. Compra de alimentos, pago de electricidad'}
              value={draft.category === 'Diezmo' ? 'Cierre general de diezmos' : draft.name || ''}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            />
          </label>
          {draft.category === 'Diezmo' && (
            <p className="tithe-privacy-note" role="note">
              Registra únicamente el total reunido al cierre de la semana o del mes. No escribas nombres ni adjuntes comprobantes personales.
            </p>
          )}

          <label>
            <span>Fecha *</span>
            <input
              type="date"
              required
              aria-label="Fecha *"
              value={draft.date || today()}
              onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
            />
          </label>

          <label className="amount-highlight-label">
            <span>Importe en pesos uruguayos *</span>
            <div className="amount-input-box">
              <span className="currency-tag">$ UYU</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                aria-label="Importe en pesos uruguayos *"
                placeholder="0.00"
                value={draft.amount || ''}
                onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
              />
            </div>
          </label>

          {draft.category !== 'Diezmo' && (
            <label>
              <span>Comprobante (foto opcional)</span>
              <div className="receipt-box">
                <input type="file" accept="image/*" onChange={e => handleReceipt(e.target.files?.[0])} />
                {draft.receiptPhoto && (
                  <div className="receipt-preview">
                    <img src={draft.receiptPhoto} alt="Comprobante" />
                    <button type="button" onClick={() => setDraft(d => ({ ...d, receiptPhoto: '' }))}>Quitar comprobante</button>
                  </div>
                )}
              </div>
            </label>
          )}

          {draft.category !== 'Diezmo' && (
            <label>
              <span>Comité, grupo o destino relacionado (opcional)</span>
              {/* En los gastos, subCategory guarda el rubro; acá solo se elige el grupo. */}
              <select
                value={draft.groupId || (draft.direction === 'Egreso' ? '' : draft.subCategory) || ''}
                onChange={e => {
                  const val = e.target.value
                  const groupMatch = availableGroups.find(g => g.id === val)
                  if (draft.direction === 'Egreso') setDraft(d => ({ ...d, groupId: groupMatch?.id || '' }))
                  else if (groupMatch) setDraft(d => ({ ...d, groupId: groupMatch.id, subCategory: groupMatch.name }))
                  else setDraft(d => ({ ...d, groupId: '', subCategory: val }))
                }}
              >
                <option value="">General congregacional / Sin asignar</option>
                {availableGroups.length > 0 && (
                  <optgroup label="Grupos de esta congregación">
                    {availableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </optgroup>
                )}
                {draft.direction !== 'Egreso' && (
                  <optgroup label="Comités y áreas oficiales">
                    {LOCAL_COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                )}
              </select>
            </label>
          )}

          {!scope ? (
            <label>
              <span>Congregación {committeeKey ? '(opcional para comité nacional)' : '*'}</span>
              <select
                required={!committeeKey}
                aria-label={committeeKey ? 'Congregación (opcional)' : 'Congregación *'}
                value={draft.churchId || ''}
                onChange={e => setDraft(d => ({ ...d, churchId: e.target.value }))}
              >
                <option value="">{committeeKey ? 'Nivel nacional / Sin congregación específica' : 'Seleccionar congregación'}</option>
                {state.churches.map(c => <option key={c.id} value={c.id}>{label(c)}</option>)}
              </select>
            </label>
          ) : (
            <div className="field-readonly-tag">
              <span>Congregación asignada</span>
              <strong>{workspaceName || state.churches.find(c => c.id === scope)?.name || scope}</strong>
            </div>
          )}
        </div>

        <div className="details-toggle-row">
          <button
            type="button"
            className="secondary-action details-toggle-btn"
            onClick={() => setShowDetails(open => !open)}
          >
            <SlidersHorizontal size={16} />
            {showDetails ? 'Ocultar detalles adicionales' : 'Agregar más detalles'}
          </button>
        </div>

        {showDetails && (
          <div className="record-fields finance-advanced-fields">
            <label>
              <span>Clasificación financiera</span>
              <select
                aria-label="Clasificación financiera"
                value={draft.accountType || 'Operación'}
                onChange={e => setDraft(d => ({ ...d, accountType: e.target.value }))}
              >
                <option>Operación</option>
                <option>Activo</option>
                <option>Pasivo</option>
                <option>Cuenta por cobrar</option>
                <option>Cuenta por pagar</option>
              </select>
            </label>

            <label>
              <span>Culto o evento relacionado</span>
              <select
                aria-label="Culto o evento relacionado"
                value={draft.eventId || ''}
                onChange={e => setDraft(d => ({ ...d, eventId: e.target.value }))}
              >
                <option value="">Ninguno</option>
                {availableEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </label>

            <label>
              <span>Actividad nacional relacionada</span>
              <select
                aria-label="Actividad nacional relacionada"
                value={draft.activityId || ''}
                onChange={e => setDraft(d => ({ ...d, activityId: e.target.value }))}
              >
                <option value="">Ninguna</option>
                {state.nationalActivities.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
              </select>
            </label>

            <label>
              <span>Persona aportante (opcional)</span>
              <select
                aria-label="Persona aportante (opcional)"
                value={draft.personId || ''}
                onChange={e => setDraft(d => ({ ...d, personId: e.target.value }))}
              >
                <option value="">Sin especificar</option>
                {availablePeople.map(p => <option key={p.id} value={p.id}>{label(p)}</option>)}
              </select>
            </label>

            {draft.direction !== 'Egreso' && (
              <label>
                <span>Subcategoría o destino específico</span>
                <input
                  aria-label="Subcategoría o destino"
                  placeholder="Ej. Ofrenda de damas, ofrenda misionera"
                  value={draft.subCategory || ''}
                  onChange={e => setDraft(d => ({ ...d, subCategory: e.target.value }))}
                />
              </label>
            )}

            <label>
              <span>Referencia textual del comprobante</span>
              <input
                aria-label="Referencia de comprobante"
                placeholder="Ej. Recibo Nº 4058, Transferencia bancaria"
                value={draft.reference || ''}
                onChange={e => setDraft(d => ({ ...d, reference: e.target.value }))}
              />
            </label>

            <label>
              <span>Observaciones administrativas</span>
              <textarea
                aria-label="Observaciones administrativas"
                placeholder="Notas adicionales sobre este movimiento..."
                value={draft.notes || ''}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              />
            </label>
          </div>
        )}

        {error && <p role="alert" className="crm-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" disabled={busy} className="secondary-action" onClick={close}>Cancelar</button>
          <button type="submit" className="primary-action" disabled={busy}>
            {busy ? 'Guardando…' : draft.direction === 'Egreso' ? 'Guardar egreso' : 'Guardar ingreso'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

// --- 3. Formulario Genérico para Otras Colecciones ---

function Editor({
  collection,
  row,
  state,
  scope,
  close,
  save
}: {
  collection: string
  row: Row
  state: State
  scope?: string
  close: () => void
  save: (c: string, r: Row) => Promise<any>
}) {
  const [draft, setDraft] = useState<Row>(() => ({
    churchId: scope || '',
    ...row
  }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [newMemberId, setNewMemberId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('Integrante')
  const [newFamilyLinkId, setNewFamilyLinkId] = useState('')
  const [newFamilyRelation, setNewFamilyRelation] = useState('Familia relacionada')
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => { ref.current?.showModal() }, [])
  const change = (key: string, value: any) => setDraft(d => ({
    ...d,
    [key]: value,
    ...(key === 'churchId' ? { familyId: '', personId: '', eventId: '', groupId: '', leaderId: '' } : {})
  }))

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const toSave = {
        ...draft,
        churchId: scope || draft.churchId
      }
      await save(collection, toSave)
      close()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const churchMembers = state.people.filter(p => !draft.churchId || p.churchId === draft.churchId)
  const assignedIds = new Set((draft.members || []).map((m: any) => m.personId))
  const availablePeople = churchMembers.filter(p => !assignedIds.has(p.id))

  const addMember = () => {
    if (!newMemberId) return
    const updated = [...(draft.members || []), { personId: newMemberId, role: newMemberRole || 'Integrante' }]
    change('members', updated)
    setNewMemberId('')
    setNewMemberRole('Integrante')
  }

  const removeMember = (index: number) => {
    const updated = (draft.members || []).filter((_: any, i: number) => i !== index)
    change('members', updated)
  }

  const visibleFields = catalog[collection].fields

  return (
    <dialog ref={ref} className="record-dialog" onCancel={e => { if (busy) e.preventDefault(); else close() }}>
      <form onSubmit={submit}>
        <div className="record-heading">
          <div>
            <span className="eyebrow">{catalog[collection].title}</span>
            <h2>{row.id ? 'Editar ficha' : 'Nuevo registro'}</h2>
          </div>
          <button type="button" disabled={busy} onClick={close} aria-label="Cerrar">×</button>
        </div>

        <div className="record-fields">
          {visibleFields.map(f => {
            if (scope && f.key === 'churchId') {
              return (
                <div key={f.key} className="field-readonly-tag">
                  <span>Congregación asignada</span>
                  <strong>{state.churches.find(c => c.id === scope)?.name || scope}</strong>
                </div>
              )
            }
            return (
              <label key={f.key}>
                <span>{f.label}{f.required ? ' *' : ''}</span>
                {f.type === 'textarea' ? (
                  <>
                    <textarea
                      aria-label={f.label + (f.required ? ' *' : '')}
                      value={draft[f.key] || ''}
                      onChange={e => change(f.key, e.target.value)}
                      maxLength={collection === 'nationalActivities' ? 500 : 4000}
                    />
                    {collection === 'nationalActivities' && f.key === 'description' && (
                      <div className={`char-counter ${(draft[f.key]?.length || 0) > 450 ? 'limit-near' : ''}`}>
                        {draft[f.key]?.length || 0} / 500 caracteres
                      </div>
                    )}
                  </>
                ) : f.type === 'select' || catalog[f.type] ? (
                  <select
                    aria-label={f.label + (f.required ? ' *' : '')}
                    required={f.required}
                    value={draft[f.key] || ''}
                    onChange={e => change(f.key, e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    {f.type === 'select'
                      ? f.options.map(o => <option key={o}>{o}</option>)
                      : (state[f.type] || [])
                          .filter(r => {
                            if (f.key === 'parentChurchId') return r.isPreachingPlace !== 'Sí'
                            if (f.key === 'preachingPlaceId') return r.isPreachingPlace === 'Sí' && r.parentChurchId === (draft.churchId || scope)
                            return !draft.churchId || !r.churchId || r.churchId === draft.churchId
                          })
                          .map(r => <option key={r.id} value={r.id}>{label(r)}</option>)}
                  </select>
                ) : (
                  <input
                    aria-label={f.label + (f.required ? ' *' : '')}
                    required={f.required}
                    type={['money', 'latitude', 'longitude'].includes(f.type) ? 'number' : f.type}
                    step={f.type === 'money' ? '.01' : 'any'}
                    min={f.type === 'money' ? '.01' : f.type === 'latitude' ? '-90' : f.type === 'longitude' ? '-180' : undefined}
                    max={f.key === 'birthday' ? today() : f.type === 'latitude' ? '90' : f.type === 'longitude' ? '180' : undefined}
                    maxLength={4000}
                    value={draft[f.key] || ''}
                    onChange={e => change(f.key, e.target.value)}
                  />
                )}
              </label>
            )
          })}

          {(collection === 'groups' || collection === 'families') && (
            <div className="members-section">
              <h3>{collection === 'families' ? 'Integrantes de la familia' : 'Integrantes del comité o célula'} ({(draft.members || []).length})</h3>
              <div className="members-list">
                {(draft.members || []).map((m: any, idx: number) => {
                  const p = state.people.find(person => person.id === m.personId)
                  return (
                    <div key={idx} className="member-chip">
                      <span><strong>{label(p)}</strong> <small>({m.role || 'Integrante'})</small></span>
                      <button type="button" onClick={() => removeMember(idx)} aria-label="Quitar">×</button>
                    </div>
                  )
                })}
                {!(draft.members?.length) && <p style={{ color: '#889189', fontSize: '.85rem' }}>No hay integrantes asignados todavía.</p>}
              </div>

              <div className="add-member-row">
                <select value={newMemberId} onChange={e => setNewMemberId(e.target.value)}>
                  <option value="">Seleccionar persona para agregar</option>
                  {availablePeople.map(p => <option key={p.id} value={p.id}>{label(p)}</option>)}
                </select>
                <input
                  type="text"
                  placeholder={collection === 'families' ? 'Vínculo (padre, madre, hijo...)' : 'Cargo (Secretario, Tesorero...)'}
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value)}
                />
                <button type="button" onClick={addMember} disabled={!newMemberId}>+ Agregar</button>
              </div>
            </div>
          )}

          {collection === 'families' && (
            <div className="members-section">
              <h3>Nexos con otras familias</h3>
              <p className="section-help">Relaciona fichas familiares sin crear un árbol genealógico complejo.</p>
              <div className="members-list">{(draft.familyLinks || []).map((link: any, idx: number) => <div className="member-chip" key={`${link.familyId}-${idx}`}><span><strong>{label(state.families.find(f => f.id === link.familyId))}</strong> <small>({link.relation})</small></span><button type="button" onClick={() => change('familyLinks', draft.familyLinks.filter((_: any, i: number) => i !== idx))} aria-label="Quitar nexo">×</button></div>)}</div>
              <div className="add-member-row">
                <select value={newFamilyLinkId} onChange={e => setNewFamilyLinkId(e.target.value)}><option value="">Seleccionar familia relacionada</option>{state.families.filter(f => f.id !== draft.id && (!draft.churchId || f.churchId === draft.churchId)).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                <input value={newFamilyRelation} onChange={e => setNewFamilyRelation(e.target.value)} placeholder="Relación entre familias" />
                <button type="button" disabled={!newFamilyLinkId} onClick={() => { change('familyLinks', [...(draft.familyLinks || []), { familyId: newFamilyLinkId, relation: newFamilyRelation }]); setNewFamilyLinkId('') }}>Agregar nexo</button>
              </div>
            </div>
          )}
        </div>

        {error && <p role="alert" className="crm-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" disabled={busy} className="secondary-action" onClick={close}>Cancelar</button>
          <button className="primary-action" disabled={busy}>{busy ? 'Guardando…' : 'Guardar registro'}</button>
        </div>
      </form>
    </dialog>
  )
}

// --- Orden y filtros de la lista de personas ---

type PeopleShow = 'Todos' | 'De la iglesia' | 'Visitas' | 'Bautizados' | 'Sin bautizar'
type PeopleSort = 'name' | 'oldest' | 'youngest' | 'birthday' | 'baptism'

const PEOPLE_SHOW: PeopleShow[] = ['Todos', 'De la iglesia', 'Visitas', 'Bautizados', 'Sin bautizar']
const PEOPLE_SORT: { key: PeopleSort; label: string }[] = [
  { key: 'name', label: 'Nombre (A a la Z)' },
  { key: 'oldest', label: 'Edad (mayores primero)' },
  { key: 'youngest', label: 'Edad (menores primero)' },
  { key: 'birthday', label: 'Próximos cumpleaños' },
  { key: 'baptism', label: 'Fecha de bautismo (más antiguos primero)' }
]

const isVisitStatus = (p: Row) => ['Amigo', 'Visita', 'Seguimiento'].includes(p.status)
const hasDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
// Bautizado: lo dijo la persona (aunque no recuerde la fecha) o tiene fecha de bautismo.
const isBaptized = (p: Row) => p.baptized === 'Sí' || (p.baptized !== 'No' && hasDate(p.baptism))

function baptismLabel(p: Row) {
  if (hasDate(p.baptism)) return p.baptismPrecision === 'Solo año' ? `${p.baptism.slice(0, 4)} (aprox.)` : formatDate(p.baptism)
  return p.baptized === 'Sí' ? 'Sí, sin fecha' : p.baptized === 'No' ? 'No' : '—'
}

function peopleShowFilter(show: PeopleShow) {
  return (p: Row) =>
    show === 'Todos' ||
    (show === 'De la iglesia' && !isVisitStatus(p) && p.status !== 'Inactivo') ||
    (show === 'Visitas' && isVisitStatus(p)) ||
    (show === 'Bautizados' && isBaptized(p)) ||
    (show === 'Sin bautizar' && !isBaptized(p))
}

// Días que faltan para el próximo cumpleaños (0 = hoy).
function daysToBirthday(birthday: string) {
  if (!hasDate(birthday)) return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [, m, d] = birthday.split('-').map(Number)
  let next = new Date(start.getFullYear(), m - 1, d)
  if (next < start) next = new Date(start.getFullYear() + 1, m - 1, d)
  return Math.round((next.getTime() - start.getTime()) / 86_400_000)
}

// Quien no tiene el dato va siempre al final de la lista.
function sortPeople(list: Row[], sort: PeopleSort) {
  const byName = (a: Row, b: Row) => label(a).localeCompare(label(b), 'es', { sensitivity: 'base' })
  const missingLast = (a: unknown, b: unknown) => (a == null || a === '' ? 1 : 0) - (b == null || b === '' ? 1 : 0)
  return [...list].sort((a, b) => {
    if (sort === 'name') return byName(a, b)
    if (sort === 'birthday') {
      const da = daysToBirthday(a.birthday)
      const db = daysToBirthday(b.birthday)
      return missingLast(da, db) || (da ?? 0) - (db ?? 0) || byName(a, b)
    }
    const key = sort === 'baptism' ? 'baptism' : 'birthday'
    const va = hasDate(a[key]) ? a[key] : ''
    const vb = hasDate(b[key]) ? b[key] : ''
    const order = sort === 'youngest' ? vb.localeCompare(va) : va.localeCompare(vb)
    return missingLast(va, vb) || order || byName(a, b)
  })
}

// El celular abre WhatsApp con un saludo ya escrito.
function PhoneCell({ phone, name }: { phone?: string; name?: string }) {
  if (!phone) return <>—</>
  const href = whatsappLink(phone, `Hola${name ? ` ${name}` : ''}, Dios te bendiga.`)
  if (!href) return <>{phone}</>
  return (
    <a className="phone-whatsapp" href={href} target="_blank" rel="noreferrer" title="Escribir por WhatsApp">
      <MessageCircle size={15} aria-hidden="true" /> {phone}
    </a>
  )
}

function birthdayHint(days: number | null) {
  if (days === null) return ''
  if (days === 0) return '¡Cumple hoy!'
  if (days === 1) return 'Cumple mañana'
  return `Cumple en ${days} días`
}

// Servicios fijos del mes (luz, agua, internet…): cuáles ya se anotaron y cuáles faltan.
function FixedExpensesCard({ rows, onAdd }: { rows: Row[]; onAdd: (item: string) => void }) {
  const month = today().slice(0, 7)
  const since = new Date()
  since.setMonth(since.getMonth() - 3)
  const sinceKey = since.toLocaleDateString('sv-SE').slice(0, 7)
  const expenses = rows.filter(r => r.direction === 'Egreso')
  const items = FIXED_EXPENSES.map(item => {
    const ofItem = expenses.filter(r => expenseItemOf(r) === item.label)
    const thisMonth = ofItem.filter(r => String(r.date || '').startsWith(month))
    const usual = ofItem.some(r => String(r.date || '').slice(0, 7) >= sinceKey)
    return { item, paid: thisMonth.reduce((sum, r) => sum + Number(r.amount || 0), 0), done: thisMonth.length > 0, usual }
  })
  // Se muestran los servicios que la iglesia suele pagar; si todavía no anotó ninguno, todos.
  const shown = items.some(i => i.usual || i.done) ? items.filter(i => i.usual || i.done) : items
  const hidden = items.filter(i => !shown.includes(i))
  const pending = shown.filter(i => !i.done).length
  return (
    <section className="fixed-expenses" aria-label="Servicios del mes">
      <div className="fixed-expenses-head">
        <div>
          <span className="eyebrow">Gastos fijos</span>
          <h3>Servicios de {new Date().toLocaleDateString('es-UY', { month: 'long' })}</h3>
        </div>
        <span className={`count-pill${pending ? ' warn' : ''}`}>{pending ? `${pending} por anotar` : 'Todo anotado'}</span>
      </div>
      <div className="fixed-expenses-grid">
        {shown.map(({ item, paid, done }) => (
          <button
            key={item.label}
            type="button"
            className={`fixed-expense${done ? ' done' : ''}`}
            onClick={() => onAdd(item.label)}
            aria-label={done ? `${item.label}: anotado ${money(paid)}. Anotar otro pago` : `Anotar el pago de ${item.label}`}
          >
            <strong>{item.label}</strong>
            <span>{done ? `✓ ${money(paid)}` : 'Anotar pago'}</span>
          </button>
        ))}
        {hidden.length > 0 && (
          <button type="button" className="fixed-expense other" onClick={() => onAdd(hidden[0].item.label)}>
            <strong>+ Otro servicio</strong>
            <span>{hidden.map(i => i.item.label).join(', ')}</span>
          </button>
        )}
      </div>
    </section>
  )
}

// --- Directorio y Listados Comunes (con segmentación por congregación Lote 1 y Lote 2) ---

function Directory({
  collection,
  state,
  scope,
  query,
  edit,
  onOpenMatcher,
  onImport,
  committeeKey,
  consolidateParentId,
  readOnly = false,
  createOnly = false
}: {
  collection: string
  state: State
  scope: string
  query: string
  edit: (c: string, r: Row) => void
  onOpenMatcher?: () => void
  onImport?: () => void
  committeeKey?: string
  consolidateParentId?: string
  readOnly?: boolean
  createOnly?: boolean
}) {
  const location = useLocation()
  const [selectedChurchId, setSelectedChurchId] = useState<string>(
    () => new URLSearchParams(location.search).get('iglesia') || ''
  )
  const [visibleCount, setVisibleCount] = useState(12)
  const [showTitheAmounts, setShowTitheAmounts] = useState(false)
  const [peopleShow, setPeopleShow] = useState<PeopleShow>('Todos')
  const [peopleSort, setPeopleSort] = useState<PeopleSort>('name')

  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('iglesia')
    setSelectedChurchId(wanted || '')
  }, [location.search, collection, scope])

  useEffect(() => {
    setVisibleCount(12)
  }, [collection, query, selectedChurchId, scope, peopleShow, peopleSort])

  const schema = catalog[collection]
  const committeePeople: Row[] | null =
    collection === 'people' && committeeKey
      ? state.committeeMembers
          .filter(m => m.committeeKey === committeeKey && m.status !== 'Inactivo')
          .map(
            m =>
              ({
                ...(state.people.find(p => p.id === m.personId) || {}),
                committeeRole: m.roleSpecialty || (m.isLocalLeader === 'Sí' ? 'Líder local' : 'Integrante')
              } as Row)
          )
          .filter(p => p.id)
      : null
  const sourceRows: Row[] = committeePeople || state[collection]
  const baseRows = sourceRows.filter(
    r =>
      (!scope ||
        (collection === 'churches'
          ? r.id === scope || (consolidateParentId && r.id === consolidateParentId)
          : r.churchId === scope ||
            r.preachingPlaceId === scope ||
            (consolidateParentId && r.churchId === consolidateParentId))) &&
      (!scope && collection === 'transactions' ? !isTitheTransaction(r) : true) &&
      (!committeeKey || collection !== 'transactions' || r.committeeKey === committeeKey) &&
      Object.entries(r).some(
        ([key, v]) =>
          key !== 'photo' &&
          typeof v !== 'object' &&
          String(v).toLocaleLowerCase().includes(query.toLocaleLowerCase())
      )
  )
  const churchRows = baseRows.filter(r => !selectedChurchId || r.churchId === selectedChurchId)
  const rows = collection === 'people' ? sortPeople(churchRows.filter(peopleShowFilter(peopleShow)), peopleSort) : churchRows
  // Los movimientos se muestran del más reciente al más antiguo.
  if (collection === 'transactions') rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  const visibleRows = rows.slice(0, visibleCount)
  const mainChurches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const hideNationalRows = !scope && !selectedChurchId && !committeeKey && ['people', 'families', 'transactions'].includes(collection)

  const columns = committeePeople
    ? [
        schema.fields.find(f => f.key === 'name')!,
        schema.fields.find(f => f.key === 'surname')!,
        schema.fields.find(f => f.key === 'churchId')!,
        { key: 'committeeRole', label: 'Responsabilidad', type: 'text', required: false, options: [] }
      ]
    : schema.fields.filter(f => !['photo', 'textarea'].includes(f.type)).slice(0, collection === 'people' ? 6 : 5)
  const financialRows = rows.filter(r => !isTitheTransaction(r))
  const financeIncome = financialRows
    .filter(r => r.direction === 'Ingreso')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const financeExpense = financialRows
    .filter(r => r.direction === 'Egreso')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const financeReceivable = financialRows
    .filter(r => r.accountType === 'Cuenta por cobrar')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const financePayable = financialRows
    .filter(r => r.accountType === 'Cuenta por pagar')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)

  return (
    <>
      <div className="page-title-row">
        <div>
          <h2>{schema.title}</h2>
          <p>{rows.length} registros encontrados</p>
        </div>
        <div className={`directory-actions${readOnly && !createOnly ? ' read-only-actions' : ''}`} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {collection === 'people' && !committeeKey && (
            <>
              <Link
                className="secondary-action"
                to="/familias"
                style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                <Home size={17} /> Familias
              </Link>
              {onOpenMatcher && !scope && (
                <button className="secondary-action" onClick={onOpenMatcher}>
                  <Search size={17} /> Buscar personas repetidas
                </button>
              )}
              {onImport && (
                <button className="secondary-action" onClick={onImport}>
                  <Upload size={17} /> Importar del formulario
                </button>
              )}
              <button
                className="secondary-action"
                onClick={() => edit('people', { id: '', churchId: scope, status: 'Amigo' })}
              >
                <UserPlus size={17} /> Anotar una visita
              </button>
              <button
                className="primary-action"
                onClick={() => edit('people', { id: '', churchId: scope, status: 'Persona vinculada' })}
              >
                <UserCheck size={17} /> Anotar persona de la iglesia
              </button>
            </>
          )}
          {collection === 'transactions' && scope && rows.some(isTitheTransaction) && (
            <button
              type="button"
              className="secondary-action"
              aria-pressed={showTitheAmounts}
              onClick={() => setShowTitheAmounts(value => !value)}
            >
              {showTitheAmounts ? 'Ocultar montos de diezmos' : 'Ver montos de diezmos'}
            </button>
          )}
          {collection === 'transactions' && (
            <button
              className="primary-action"
              onClick={() =>
                edit('transactions', {
                  id: '',
                  churchId: scope || selectedChurchId,
                  committeeKey: committeeKey || '',
                  direction: 'Ingreso',
                  financialStatus: 'Registrado',
                  date: today()
                })
              }
            >
              <Plus size={17} /> Anotar dinero
            </button>
          )}
          {collection !== 'people' && collection !== 'transactions' && !committeePeople && (
            <button
              className="primary-action"
              onClick={() => edit(collection, { id: '', churchId: scope, committeeKey: committeeKey || '' })}
            >
              <Plus size={17} /> Nuevo registro
            </button>
          )}
        </div>
      </div>
      {collection === 'events' && (
        <Link className="page-action-button" to="/cultos">
          Pasar lista en un culto o evento <span>→</span>
        </Link>
      )}
      {collection === 'transactions' && (
        <p>Registra ingresos y egresos rápidamente. Los importes están expresados en pesos uruguayos (UYU). Los totales no incluyen los diezmos, que se mantienen reservados.</p>
      )}
      {collection === 'transactions' && (
        <div className="finance-kpis finance-ledger-summary" aria-label="Resumen financiero">
          <div>
            <span>Ingresos</span>
            <strong>{money(financeIncome)}</strong>
          </div>
          <div>
            <span>Egresos</span>
            <strong>{money(financeExpense)}</strong>
          </div>
          <div className="finance-result">
            <span>Resultado</span>
            <strong>{money(financeIncome - financeExpense)}</strong>
          </div>
          {/* Cuentas por cobrar y por pagar solo aparecen si alguien las usa. */}
          {financeReceivable > 0 && (
            <div>
              <span>Por cobrar</span>
              <strong>{money(financeReceivable)}</strong>
            </div>
          )}
          {financePayable > 0 && (
            <div>
              <span>Por pagar</span>
              <strong>{money(financePayable)}</strong>
            </div>
          )}
        </div>
      )}

      {collection === 'transactions' && scope && !committeeKey && !readOnly && (
        <FixedExpensesCard
          rows={baseRows}
          onAdd={item => edit('transactions', { id: '', churchId: scope, direction: 'Egreso', category: 'Gasto', subCategory: item, financialStatus: 'Registrado', date: today() })}
        />
      )}

      {/* Lote 1 y Lote 2: Primera vista de Finanzas segmentada por congregación */}
      {!scope && collection === 'transactions' && (
        <section className="workspace-section" style={{ marginBottom: 18 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Resumen por congregación</span>
              <h3>
                {selectedChurchId
                  ? `Movimientos de ${state.churches.find(c => c.id === selectedChurchId)?.name || 'Congregación'}`
                  : 'Estado financiero segmentado por congregación'}
              </h3>
            </div>
            {selectedChurchId && (
              <button type="button" className="secondary-action compact-btn" onClick={() => setSelectedChurchId('')}>
                Ver consolidado nacional ({baseRows.length})
              </button>
            )}
          </div>
          <div className="congregation-cards-grid">
            {mainChurches.map(ch => {
              const chTxs = baseRows.filter(t => t.churchId === ch.id)
              const inc = chTxs.filter(t => t.direction === 'Ingreso').reduce((s, t) => s + Number(t.amount || 0), 0)
              const exp = chTxs.filter(t => t.direction === 'Egreso').reduce((s, t) => s + Number(t.amount || 0), 0)
              const receipts = chTxs.filter(t => t.receiptPhoto || t.reference).length
              const active = selectedChurchId === ch.id
              return (
                <article
                  key={ch.id}
                  className={`congregation-summary-card${active ? ' selected' : ''}`}
                  onClick={() => setSelectedChurchId(prev => (prev === ch.id ? '' : ch.id))}
                >
                  <div className="congregation-card-head">
                    <div>
                      <span className="eyebrow">{ch.department || ch.city}</span>
                      <h4>{ch.name}</h4>
                    </div>
                    <span className="count-pill">{chTxs.length} mov.</span>
                  </div>
                  <div className="congregation-card-metrics">
                    <div>
                      <span>Ingresos</span>
                      <strong>{money(inc)}</strong>
                    </div>
                    <div>
                      <span>Egresos</span>
                      <strong>{money(exp)}</strong>
                    </div>
                    <div>
                      <span>Saldo neto</span>
                      <strong>{money(inc - exp)}</strong>
                    </div>
                    <div>
                      <span>Comprobantes</span>
                      <strong>{receipts}</strong>
                    </div>
                  </div>
                  <div className="congregation-card-footer">
                    <span>
                      {active ? 'Mostrando detalle de esta iglesia' : 'Abrir movimientos y comprobantes →'}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* Lote 1 y Lote 2: Segmentación por congregación en Personas / Líderes */}
      {!scope && (collection === 'people' || collection === 'families') && (
        <section className="workspace-section" style={{ marginBottom: 18 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{collection === 'people' ? 'Distribución por congregación' : 'Familias por congregación'}</span>
              <h3>
                {collection === 'families'
                  ? 'Elige una congregación para consultar sus familias'
                  : committeeKey
                  ? 'Líderes e integrantes del comité por congregación'
                  : 'Personas y familias agrupadas por congregación'}
              </h3>
            </div>
            {selectedChurchId && (
              <button type="button" className="secondary-action compact-btn" onClick={() => setSelectedChurchId('')}>
                Ver todas las congregaciones ({baseRows.length})
              </button>
            )}
          </div>
          <div className="congregation-cards-grid compact">
            {mainChurches.map(ch => {
              const churchRecords = baseRows.filter(record => record.churchId === ch.id)
              const members = churchRecords.filter(p => p.status !== 'Amigo').length
              const friends = churchRecords.filter(p => p.status === 'Amigo').length
              const active = selectedChurchId === ch.id
              return (
                <button
                  type="button"
                  key={ch.id}
                  className={`congregation-summary-card button-card${active ? ' selected' : ''}`}
                  onClick={() => setSelectedChurchId(prev => (prev === ch.id ? '' : ch.id))}
                >
                  <div className="congregation-card-head">
                    <strong>{ch.name}</strong>
                    <span className="count-pill">{churchRecords.length} {collection === 'people' ? 'personas' : 'familias'}</span>
                  </div>
                  {collection === 'people' && (
                    <small style={{ color: '#5b6f82' }}>
                      {plural(members, 'vinculada', 'vinculadas')} · {plural(friends, 'amigo', 'amigos')}
                    </small>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {hideNationalRows ? (
        <section className="directory-empty-prompt" aria-live="polite">
          <Building2 size={22} />
          <div>
            <strong>Elige una congregación para ver el detalle</strong>
            <span>Así mantenemos separadas las fichas locales y evitamos mezclar sus registros.</span>
          </div>
        </section>
      ) : collection === 'people' ? (
        <>
        <div className="people-tools" aria-label="Ordenar y filtrar personas">
          <div className="people-show" role="group" aria-label="Mostrar">
            {PEOPLE_SHOW.map(option => (
              <button
                key={option}
                type="button"
                aria-pressed={peopleShow === option}
                className={peopleShow === option ? 'active' : ''}
                onClick={() => setPeopleShow(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <label className="people-sort">
            <span>Ordenar por</span>
            <select value={peopleSort} onChange={e => setPeopleSort(e.target.value as PeopleSort)}>
              {PEOPLE_SORT.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className={`crm-table-wrap${readOnly ? ' directory-read-only' : ''}`}>
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>Foto</th>
                <th>Nombre y apellido</th>
                <th>Tipo</th>
                <th>Celular</th>
                <th>Nacimiento / Edad</th>
                <th>Bautismo</th>
                <th>Responsabilidad</th>
                {!scope && <th>Congregación</th>}
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(r => {
                const normStatus =
                  r.status === 'Amigo' || r.status === 'Visita' || r.status === 'Seguimiento'
                    ? 'Amigo'
                    : r.status === 'Inactivo'
                    ? 'Inactivo'
                    : 'Persona vinculada'
                const statusClass =
                  normStatus === 'Amigo' ? 'amigo' : normStatus === 'Inactivo' ? 'inactivo' : 'vinculada'
                const ch = state.churches.find(c => c.id === r.churchId)
                const age = calculateAge(r.birthday)
                return (
                  <tr key={r.id}>
                    <td>
                      {r.photo ? (
                        <img
                          src={r.photo}
                          alt={label(r)}
                          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#eaf2fd',
                            color: '#073b7a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '.8rem'
                          }}
                        >
                          {(r.name?.[0] || '—').toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{label(r)}</strong>
                    </td>
                    <td>
                      <span className={`person-chip-badge ${statusClass}`}>
                        {normStatus === 'Persona vinculada' ? 'De la iglesia' : normStatus === 'Amigo' ? 'Visita' : normStatus}
                      </span>
                    </td>
                    <td><PhoneCell phone={r.phone} name={r.name} /></td>
                    <td>
                      {r.birthday ? (
                        <span>
                          {formatDate(r.birthday)} {age !== null && <small className="cat-tag">{age} años</small>}
                          {peopleSort === 'birthday' && <small className="birthday-hint">{birthdayHint(daysToBirthday(r.birthday))}</small>}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{baptismLabel(r)}</td>
                    <td>{r.committeeRole || r.role || '—'}</td>
                    {!scope && <td>{ch?.name || '—'}</td>}
                    <td>
                      <button onClick={() => edit(collection, r)}>Abrir / editar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && <p className="empty-state">No se encontraron personas con estos filtros.</p>}
        </div>
        </>
      ) : collection === 'transactions' ? (
        <div className={`crm-table-wrap${readOnly ? ' directory-read-only' : ''}`}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto o rubro</th>
                <th>Descripción</th>
                <th>Importe</th>
                <th>Comité o destino</th>
                <th>Comprobante</th>
                {!scope && <th>Congregación</th>}
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(r => {
                const isIngreso = r.direction !== 'Egreso'
                const isTithe = isTitheTransaction(r)
                const ch = state.churches.find(c => c.id === r.churchId)
                return (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td>
                      <span className={`direction-badge ${isIngreso ? 'ingreso' : 'egreso'}`}>
                        {isIngreso ? '↓ Ingreso' : '↑ Egreso'}
                      </span>
                    </td>
                    <td>
                      <strong>{isIngreso ? r.category || '—' : expenseItemOf(r)}</strong>
                      {r.accountType && r.accountType !== 'Operación' && <small style={{ display: 'block' }}>{r.accountType}</small>}
                    </td>
                    <td>{isTithe ? 'Cierre general de diezmos' : r.description || r.name || '—'}</td>
                    <td>
                      <strong style={{ color: isIngreso ? '#073b7a' : '#c93b2b', fontSize: '.95rem' }}>
                        {isTithe && !showTitheAmounts ? '••••••' : isIngreso ? '+' + money(Number(r.amount || 0)) : '-' + money(Number(r.amount || 0))}
                      </strong>
                    </td>
                    <td>{isTithe ? 'General' : committeeLabel(r.committeeKey) || state.groups.find(g => g.id === r.groupId)?.name || (isIngreso ? r.subCategory : '') || 'General'}</td>
                    <td>
                      {!isTithe && r.receiptPhoto ? (
                        <span
                          style={{
                            fontSize: '.8rem',
                            color: '#2d9bf0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          Foto adjunta
                        </span>
                      ) : r.reference ? (
                        <small style={{ color: '#63788d' }}>{r.reference}</small>
                      ) : (
                        '—'
                      )}
                    </td>
                    {!scope && <td>{ch?.name || '—'}</td>}
                    <td>
                      <button onClick={() => edit(collection, r)}>Abrir / editar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && <p className="empty-state">No se encontraron movimientos con estos filtros.</p>}
        </div>
      ) : (
        <div className={`crm-table-wrap${readOnly ? ' directory-read-only' : ''}`}>
          <table className="crm-table">
            <thead>
              <tr>
                {columns.map(f => (
                  <th key={f.key}>{f.label}</th>
                ))}
                {collection === 'groups' && <th>Integrantes</th>}
                <th>Ficha</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(r => (
                <tr key={r.id}>
                  {columns.map(f => (
                    <td key={f.key}>
                      {f.key === 'birthday' && r.birthday ? (
                        <span>
                          {formatDate(r.birthday)}{' '}
                          <small className="cat-tag">
                            {calculateAge(r.birthday) !== null ? `${calculateAge(r.birthday)} años` : ''}
                          </small>
                        </span>
                      ) : f.type === 'tel' ? (
                        <PhoneCell phone={r[f.key]} name={label(r)} />
                      ) : f.type === 'money' ? (
                        money(Number(r[f.key]))
                      ) : catalog[f.type] ? (
                        label(state[f.type].find(v => v.id === r[f.key]))
                      ) : (
                        r[f.key] || '—'
                      )}
                    </td>
                  ))}
                  {collection === 'groups' && <td>{(r.members || []).length} miembros</td>}
                  <td>
                    <button onClick={() => edit(collection, r)}>Abrir / editar</button>
                    {collection === 'families' && r.latitude && r.longitude && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(
                          r.latitude
                        )}&mlon=${encodeURIComponent(r.longitude)}#map=16/${encodeURIComponent(
                          r.latitude
                        )}/${encodeURIComponent(r.longitude)}`}
                      >
                        Ver ubicación
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty-state">
              Todavía no hay registros con estos filtros. Usa «Nuevo registro» para comenzar.
            </p>
          )}
        </div>
      )}
      {rows.length > visibleCount && !hideNationalRows && (
        <button type="button" className="calendar-show-more directory-show-more" onClick={() => setVisibleCount(count => count + 12)}>
          Ver más registros ({rows.length - visibleCount} restantes)
        </button>
      )}
    </>
  )
}

// --- Pasar Lista de Asistencia, Eventos Nacionales y Planilla Histórica Automática (Lote 1 y Lote 3) ---

function Attendance({
  state,
  scope,
  save
}: {
  state: State
  scope: string
  save: (c: string, r: Row) => Promise<any>
}) {
  const routeLocation = useLocation()
  const navigateAttendance = useNavigate()
  const focusDialog = useRef<HTMLDialogElement>(null)
  const [scheduleChurch, setScheduleChurch] = useState(scope)
  const [quickGuestPhoto, setQuickGuestPhoto] = useState('')
  const [dirty, setDirty] = useState(false)
  const [eventId, setEvent] = useState('')
  // Culto de un horario habitual que todavía no existe: se crea recién al guardar la lista.
  const [draftEvent, setDraftEvent] = useState<Row | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [visitors, setVisitors] = useState(0)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'Todos' | 'Adulto' | 'Joven' | 'Niño'>('Todos')
  const [relatedActivityId, setRelatedActivityId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [scheduleName, setScheduleName] = useState('Culto dominical')
  const [scheduleDay, setScheduleDay] = useState('Domingo')
  const [scheduleTime, setScheduleTime] = useState('19:00')
  const [focusMode, setFocusMode] = useState(false)
  const [quickGuestOpen, setQuickGuestOpen] = useState(false)
  const [quickGuestName, setQuickGuestName] = useState('')
  const [quickGuestPhone, setQuickGuestPhone] = useState('')
  const [quickGuestBusy, setQuickGuestBusy] = useState(false)
  const [attendanceReminder, setAttendanceReminder] = useState('')

  // Filtros de la Planilla Histórica Automática (Matriz)
  const [matrixMonth, setMatrixMonth] = useState(() => today().slice(0, 7))
  const [matrixKind, setMatrixKind] = useState<string>('Todos')
  const [matrixAge, setMatrixAge] = useState<'Todos' | 'Adulto' | 'Joven' | 'Niño'>('Todos')
  const [matrixSearch, setMatrixSearch] = useState('')

  const event = draftEvent || state.events.find(
    e => e.id === eventId && (!scope || e.churchId === scope || e.preachingPlaceId === scope || !e.churchId)
  )
  // Si el evento es nacional (sin churchId específico), permite tomar asistencia de todas las congregaciones
  const people = state.people.filter(
    p => (!event?.churchId || p.churchId === event.churchId) && (!scope || p.churchId === scope) && p.status !== 'Inactivo'
  )

  const availableActivities = state.nationalActivities.filter(
    na =>
      na.status !== 'Archivada' &&
      state.activityAssignments.some(aa => aa.activityId === na.id && (!scope || aa.churchId === scope))
  )

  useEffect(() => {
    setEvent('')
    setSelected([])
    setMessage('')
    setFocusMode(false)
    setAttendanceReminder('')
  }, [scope])

  useEffect(() => {
    const checkReminder = () => {
      if (!event?.date || !event.time) {
        setAttendanceReminder('')
        return
      }
      const startsAt = new Date(`${event.date}T${event.time}:00`).getTime()
      const alreadySaved = state.attendance.some(a => a.eventId === event.id)
      const elapsed = Date.now() - startsAt
      setAttendanceReminder(
        elapsed >= 60 * 60 * 1000 && elapsed < 12 * 60 * 60 * 1000 && !alreadySaved
          ? 'El culto comenzó hace más de una hora. Recuerda guardar la asistencia.'
          : ''
      )
    }
    checkReminder()
    const timer = window.setInterval(checkReminder, 60_000)
    return () => window.clearInterval(timer)
  }, [event?.id, event?.date, event?.time, state.attendance])

  function choose(id: string, openFocus = true) {
    setDraftEvent(null)
    setEvent(id)
    setDirty(false)
    setSearch('')
    setActiveTab('Todos')
    const old = state.attendance.find(a => a.eventId === id)
    setSelected(old?.people || [])
    setVisitors(old?.visitors || 0)
    setRelatedActivityId(old?.activityId || '')
    setMessage('')
    setFocusMode(openFocus)
  }

  const filteredPeople = people.filter(p => {
    const cat = personAgeCategory(p)
    const matchesTab = activeTab === 'Todos' || cat === activeTab
    const matchesSearch =
      !search || label(p).toLowerCase().includes(search.toLowerCase()) || (p.phone || '').includes(search)
    return matchesTab && matchesSearch
  })

  async function saveAttendance() {
    if (!event) return
    setBusy(true)
    try {
      let savedEventId = eventId
      if (draftEvent) {
        const savedEvent = await save('events', draftEvent)
        savedEventId = savedEvent.id
        setDraftEvent(null)
        setEvent(savedEventId)
      }
      const assignment = state.activityAssignments.find(
        aa => aa.activityId === relatedActivityId && aa.churchId === event.churchId
      )
      await save('attendance', {
        id: '',
        eventId: savedEventId,
        people: selected,
        visitors,
        activityId: relatedActivityId,
        assignmentId: assignment?.id || ''
      })
      setDirty(false)
      setMessage('Asistencia guardada.')
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Alternar asistencia directamente desde una celda de la Planilla Histórica Automática
  async function toggleMatrixCell(targetEvent: Row, personId: string) {
    setBusy(true)
    try {
      const existingAtt = state.attendance.find(a => a.eventId === targetEvent.id)
      const currentPeople: string[] = existingAtt?.people || []
      const nextPeople = currentPeople.includes(personId)
        ? currentPeople.filter(id => id !== personId)
        : [...currentPeople, personId]
      await save('attendance', {
        id: existingAtt?.id || '',
        eventId: targetEvent.id,
        people: nextPeople,
        visitors: existingAtt?.visitors || 0,
        activityId: existingAtt?.activityId || '',
        assignmentId: existingAtt?.assignmentId || ''
      })
      if (eventId === targetEvent.id) {
        setSelected(nextPeople)
      }
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function addQuickGuest() {
    const fullName = quickGuestName.trim()
    if (!fullName || !event) return
    setQuickGuestBusy(true)
    try {
      const parts = fullName.split(/\s+/)
      const saved = await save('people', {
        id: '',
        name: parts.shift() || fullName,
        surname: parts.join(' '),
        churchId: event.churchId || scope || state.churches[0]?.id || 'ch-maldonado',
        status: 'Amigo',
        phone: quickGuestPhone.trim(),
        birthday: '',
        gender: '',
        photo: quickGuestPhoto,
        notes: 'Registrado rápidamente durante la toma de asistencia. Completar ficha posteriormente.'
      })
      if (saved?.id) setSelected(current => [...new Set([...current, saved.id])])
      setQuickGuestName('')
      setQuickGuestPhone('')
      setQuickGuestPhoto('')
      setDirty(true)
      setQuickGuestOpen(false)
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setQuickGuestBusy(false)
    }
  }

  useEffect(() => {
    const node = focusDialog.current
    if (!focusMode || !event || !node) return
    node.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      node.close()
      document.body.style.overflow = previous
    }
  }, [focusMode, Boolean(event)])

  useEffect(() => {
    if (new URLSearchParams(routeLocation.search).get('pasar') !== 'hoy') return
    const existing = state.events.find(
      e => e.date === today() && (!scope || e.churchId === scope || e.preachingPlaceId === scope)
    )
    if (existing) choose(existing.id, true)
    navigateAttendance('/cultos', { replace: true })
  }, [routeLocation.search, scope])

  // Lote 3: No crear una nueva lista si ya existe una para esa misma fecha y horario
  async function startService(schedule: Row) {
    setBusy(true)
    setMessage('')
    const serviceDate = lastDateForWeekday(schedule.day)
    try {
      const existing = state.events.find(
        e =>
          e.date === serviceDate &&
          e.churchId === schedule.churchId &&
          (e.scheduleId === schedule.id || (!e.scheduleId && (e.kind || 'Culto') === 'Culto' && e.time === schedule.time)) &&
          (e.preachingPlaceId || '') === (schedule.preachingPlaceId || '')
      )
      if (existing) {
        choose(existing.id, true)
        return
      }
      choose('', true)
      setDraftEvent({
        id: '',
        name: schedule.name,
        churchId: schedule.churchId,
        preachingPlaceId: schedule.preachingPlaceId || '',
        date: serviceDate,
        time: schedule.time,
        kind: 'Culto',
        scheduleId: schedule.id,
        location: schedule.location || '',
        responsible: '',
        activityId: '',
        notes: `Horario habitual de ${schedule.day}.`
      })
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function closeList() {
    if (dirty && !window.confirm('Hay cambios de asistencia sin guardar. ¿Salir sin guardarlos?')) return
    setFocusMode(false)
    setDraftEvent(null)
    setQuickGuestOpen(false)
  }

  // Deduplicar horarios habituales visualmente por día y hora
  const uniqueSchedules = (state.serviceSchedules || [])
    .filter(s => s.status !== 'Inactivo' && (!scope || s.churchId === scope || s.preachingPlaceId === scope))
    .filter(
      (s, idx, arr) =>
        arr.findIndex(x => x.churchId === s.churchId && x.day === s.day && x.time === s.time) === idx
    )

  // Eventos para la Planilla Histórica Automática (Matriz)
  const scopedMatrixEvents = state.events
    .filter(e => (!scope ? !e.churchId : e.churchId === scope || e.preachingPlaceId === scope))
    .filter(e => !matrixMonth || (e.date || '').startsWith(matrixMonth))
    .filter(e => matrixKind === 'Todos' || (e.kind || 'Culto') === matrixKind)
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))

  const matrixPeople = state.people
    .filter(p => (!scope || p.churchId === scope) && p.status !== 'Inactivo')
    .filter(p => matrixAge === 'Todos' || personAgeCategory(p) === matrixAge)
    .filter(p => !matrixSearch || label(p).toLowerCase().includes(matrixSearch.toLowerCase()))

  const mainChurches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const nationalSpecialEvents = state.events.filter(
    e => !e.churchId || ['Convención', 'Campamento', 'Capacitación', 'Culto misionero', 'Vigilia'].includes(e.kind)
  )

  return (
    <>
      {focusMode && event && (
        <dialog
          ref={focusDialog}
          className="attendance-focus-dialog"
          aria-label="Tomar asistencia"
          onCancel={e => {
            e.preventDefault()
            closeList()
          }}
        >
          <header className="attendance-focus-header">
            <div>
              <span className="eyebrow">
                Toma de asistencia · {event.kind || 'Culto'} {event.modality === 'Online' ? '· Online' : ''}
              </span>
              <h2>{event.name}</h2>
              <p>
                {formatDate(event.date)}
                {event.time ? ` · ${event.time} hs` : ''} · marca el casillero de cada persona presente
              </p>
            </div>
            <button
              type="button"
              className="attendance-focus-close"
              onClick={closeList}
              aria-label="Cerrar toma de asistencia"
            >
              <X size={22} />
            </button>
          </header>
          <div className="attendance-focus-summary">
            <strong>{selected.length + visitors}</strong>
            <span>presentes</span>
            <strong>{people.length}</strong>
            <span>personas en padrón</span>
            <button type="button" className="secondary-action" onClick={() => setQuickGuestOpen(true)}>
              <UserPlus size={17} /> Añadir amigo
            </button>
          </div>
          <div className="attendance-focus-toolbar">
            <label>
              <Search size={18} />
              <input
                type="search"
                aria-label="Buscar hermano"
                placeholder="Buscar por nombre…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setSelected([...new Set([...selected, ...filteredPeople.map(p => p.id)])])
                setDirty(true)
              }}
            >
              Marcar visibles
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setSelected([])
                setDirty(true)
              }}
            >
              Limpiar
            </button>
          </div>
          <div className="attendance-filter-row" role="group" aria-label="Filtrar personas">
            {(['Todos', 'Adulto', 'Joven', 'Niño'] as const).map(t => (
              <button
                key={t}
                aria-pressed={activeTab === t}
                className={activeTab === t ? 'active' : ''}
                onClick={() => setActiveTab(t)}
              >
                {t === 'Todos' ? 'Todos' : t === 'Adulto' ? 'Adultos' : t === 'Joven' ? 'Jóvenes' : 'Niños'}
              </button>
            ))}
          </div>
          <div className="attendance-focus-list">
            {filteredPeople.map(p => {
              const checked = selected.includes(p.id)
              const pChurch = !scope ? state.churches.find(c => c.id === p.churchId)?.name : ''
              return (
                <label key={p.id} className={`attendance-focus-person${checked ? ' checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      setSelected(ids => (e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id)))
                      setDirty(true)
                    }}
                  />
                  <span className="attendance-focus-check">{checked ? '✓' : ''}</span>
                  {p.photo ? (
                    <img src={p.photo} alt="" />
                  ) : (
                    <span className="attendance-focus-avatar">{p.name?.[0] || '—'}</span>
                  )}
                  <span className="attendance-focus-person-copy">
                    <strong>{label(p)}</strong>
                    <small>
                      {p.birthday || p.ageGroup ? personAgeCategory(p) : 'Edad sin registrar'}
                      {p.status === 'Amigo' ? ' · Amigo' : ' · Vinculado'}
                      {pChurch ? ` · ${pChurch}` : ''}
                    </small>
                  </span>
                </label>
              )
            })}
            {!filteredPeople.length && (
              <div className="attendance-focus-empty">
                No encontramos a esa persona. Usa “Añadir amigo” para registrarla ahora.
              </div>
            )}
          </div>
          {availableActivities.length > 0 && (
            <details className="attendance-activity-link">
              <summary>Vincular asistencia a una actividad nacional</summary>
              <label>
                Actividad nacional
                <select
                  value={relatedActivityId}
                  onChange={e => {
                    setRelatedActivityId(e.target.value)
                    setDirty(true)
                  }}
                >
                  <option value="">Sin vincular</option>
                  {availableActivities.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </details>
          )}
          <footer className="attendance-focus-footer">
            <label className="attendance-visitor-input">
              <span>Visitas sin ficha</span>
              <input
                type="number"
                aria-label="Visitas sin ficha"
                min="0"
                max="100000"
                value={visitors}
                onChange={e => {
                  setVisitors(Math.max(0, Math.min(100000, Math.trunc(Number(e.target.value) || 0))))
                  setDirty(true)
                }}
              />
            </label>
            <div className="attendance-focus-footer-actions">
              <button type="button" className="secondary-action" onClick={closeList}>
                Volver
              </button>
              <button type="button" className="primary-action" disabled={busy} onClick={saveAttendance}>
                <CheckCircle2 size={18} /> {busy ? 'Guardando…' : 'Guardar asistencia'}
              </button>
            </div>
          </footer>
          {message && (
            <p role="status" className="crm-success attendance-focus-message">
              {message}
            </p>
          )}
          {quickGuestOpen && (
            <div className="quick-guest-card">
              <div>
                <span className="eyebrow">Registro rápido</span>
                <h3>¿Vino alguien nuevo?</h3>
                <p>Guarda solo lo necesario ahora. La ficha completa se puede terminar después.</p>
              </div>
              <label>
                Nombre y apellido
                <input
                  autoFocus
                  value={quickGuestName}
                  onChange={e => setQuickGuestName(e.target.value)}
                  placeholder="Ej. Juan López"
                />
              </label>
              <label>
                Celular (opcional)
                <input
                  value={quickGuestPhone}
                  onChange={e => setQuickGuestPhone(e.target.value)}
                  placeholder="09…"
                />
              </label>
              <label>
                Foto de perfil (opcional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setQuickGuestBusy(true)
                      try {
                        setQuickGuestPhoto(await compressFor('person', file))
                      } catch (err) {
                        setMessage((err as Error).message)
                      } finally {
                        setQuickGuestBusy(false)
                      }
                    }
                  }}
                />
              </label>
              <div className="quick-guest-actions">
                <button type="button" className="secondary-action" onClick={() => setQuickGuestOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-action"
                  disabled={!quickGuestName.trim() || quickGuestBusy}
                  onClick={addQuickGuest}
                >
                  {quickGuestBusy ? 'Guardando…' : 'Guardar y marcar presente'}
                </button>
              </div>
            </div>
          )}
        </dialog>
      )}

      <div className="page-title-row">
        <div>
          <span className="eyebrow">
            {scope ? 'Toma de asistencia y planilla histórica' : 'Asistencia Nacional y Resumen por Congregación'}
          </span>
          <h2>Cultos y asistencia</h2>
          <p>
            {scope
              ? 'Pasa lista en el encuentro actual con tarjetas amplias o consulta la planilla histórica automática por fecha.'
              : 'Registra asistencia en eventos nacionales extraordinarios (convenciones, campamentos) y supervisa el resumen por congregación.'}
          </p>
        </div>
        <div>
          <Link
            className="secondary-action"
            to="/calendario"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <CalendarDays size={17} /> Ver calendario y eventos
          </Link>
        </div>
      </div>

      {/* Lote 1: En Administración Nacional NO aparece configuración de cultos habituales locales */}
      {scope ? (
        <section className="service-schedule-panel">
          <div className="schedule-heading">
            <div>
              <span className="eyebrow">Configuración local</span>
              <h3>Cultos habituales</h3>
              <p>
                {scope === 'ch-maldonado'
                  ? 'Congregación Maldonado cuenta con dos cultos habituales semanales (Jueves y Domingo). Otras reuniones conservan su tipo propio en el Calendario.'
                  : 'Se configuran una sola vez y quedan disponibles para pasar lista sin duplicar registros.'}
              </p>
            </div>
          </div>
          <div className="schedule-list">
            {uniqueSchedules.map(s => (
              <button
                key={s.id}
                type="button"
                className="schedule-chip"
                disabled={busy}
                onClick={() => startService(s)}
              >
                <strong>{s.day}</strong>
                <span>
                  {s.time} · {s.name}
                </span>
                <small>
                  {lastDateForWeekday(s.day) === today() ? 'Pasar lista hoy' : `Pasar lista del ${s.day.toLowerCase()} ${formatDate(lastDateForWeekday(s.day)).slice(0, 5)}`} <ArrowRight size={16} />
                </small>
              </button>
            ))}
          </div>
          <details className="schedule-configuration">
            <summary>Configurar días y horarios habituales</summary>
            <div className="schedule-form">
              <label>
                Nombre
                <input value={scheduleName} onChange={e => setScheduleName(e.target.value)} />
              </label>
              <label>
                Día
                <select value={scheduleDay} onChange={e => setScheduleDay(e.target.value)}>
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Hora
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
              </label>
              <button
                type="button"
                disabled={!scheduleName.trim() || !scheduleTime}
                className="secondary-action"
                onClick={async () => {
                  try {
                    await save('serviceSchedules', {
                      id: '',
                      name: scheduleName,
                      churchId: scope || scheduleChurch,
                      day: scheduleDay,
                      time: scheduleTime,
                      location: '',
                      status: 'Activo'
                    })
                    setMessage('Horario guardado. Ya puedes pasar lista.')
                  } catch (e) {
                    setMessage((e as Error).message)
                  }
                }}
              >
                <Plus size={17} /> Agregar horario
              </button>
            </div>
          </details>
        </section>
      ) : (
        <>
          {/* Lote 1: Eventos Nacionales Especiales y Resumen de Asistencia por Congregación */}
          <section className="workspace-section" style={{ marginBottom: 18 }}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Eventos Nacionales Extraordinarios</span>
                <h3>Convenciones, Campamentos y Encuentros Nacionales</h3>
                <p>
                  Toma asistencia nacional identificando la congregación de cada delegado o participante.
                </p>
              </div>
              <Link to="/calendario" className="secondary-action compact-btn" style={{ textDecoration: 'none' }}>
                <Plus size={15} /> Crear evento nacional
              </Link>
            </div>
            <div className="congregation-cards-grid">
              {nationalSpecialEvents.map(ev => {
                const att = state.attendance.find(a => a.eventId === ev.id)
                const total = att ? (att.people?.length || 0) + Number(att.visitors || 0) : 0
                return (
                  <article key={ev.id} className="congregation-summary-card" onClick={() => choose(ev.id, true)}>
                    <div className="congregation-card-head">
                      <div>
                        <span className="eyebrow">{ev.kind || 'Evento Nacional'}</span>
                        <h4>{ev.name}</h4>
                      </div>
                      <span className="count-pill">{total} asist.</span>
                    </div>
                    <p style={{ margin: '4px 0 10px', fontSize: '.83rem', color: '#5b6f82' }}>
                      {ev.date} · {ev.time || '18:00'} · {ev.location || 'Sede Nacional'}
                    </p>
                    <div className="congregation-card-footer">
                      <span>{att ? 'Revisar asistencia por congregación →' : 'Tomar asistencia nacional →'}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="workspace-section" style={{ marginBottom: 18 }}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Resumen Nacional</span>
                <h3>Asistencia acumulada segmentada por congregación</h3>
              </div>
            </div>
            <div className="congregation-cards-grid compact">
              {mainChurches.map(ch => {
                const chEvents = state.events.filter(e => e.churchId === ch.id)
                const chAtt = state.attendance.filter(a => chEvents.some(e => e.id === a.eventId))
                const totalAtt = chAtt.reduce((s, a) => s + (a.people?.length || 0) + Number(a.visitors || 0), 0)
                const avgAtt = chAtt.length ? Math.round(totalAtt / chAtt.length) : 0
                return (
                  <article key={ch.id} className="congregation-summary-card">
                    <div className="congregation-card-head">
                      <strong>{ch.name}</strong>
                      <span className="count-pill">{chAtt.length} listas</span>
                    </div>
                    <div className="congregation-card-metrics">
                      <div>
                        <span>Encuentros</span>
                        <strong>{chEvents.length}</strong>
                      </div>
                      <div>
                        <span>Asistencia acum.</span>
                        <strong>{totalAtt}</strong>
                      </div>
                      <div>
                        <span>Promedio</span>
                        <strong>{avgAtt}</strong>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}

      <div className="crm-controls">
        <label>
          Culto o evento
          <select aria-label="Culto o evento" value={eventId} onChange={e => choose(e.target.value)}>
            <option value="">Seleccionar encuentro</option>
            {state.events
              .filter(e => !scope || e.churchId === scope || e.preachingPlaceId === scope || !e.churchId)
              .map(e => (
                <option key={e.id} value={e.id}>
                  {e.date} · {e.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      {message && !focusMode && (
        <p role="status" className="crm-success">
          {message}
        </p>
      )}
      {event && (
        <div className="attendance-focus-launch">
          <div>
            <strong>
              {event.name} ({event.kind || 'Culto'})
            </strong>
            <span>
              {state.attendance.some(a => a.eventId === event.id)
                ? 'Asistencia guardada. Puedes revisarla o corregirla.'
                : 'Selecciona las personas presentes y guarda la lista.'}
            </span>
          </div>
          <button className="primary-action" onClick={() => choose(event.id, true)}>
            Abrir toma de asistencia
          </button>
        </div>
      )}

      {/* Lote 3: Experiencia 2 — Planilla histórica automática (Matriz por persona y fecha) */}
      {scope && (
        <section className="workspace-section attendance-matrix-section" aria-label="Planilla histórica automática">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Planilla histórica automática</span>
              <h3>Matriz de asistencia por persona y encuentro</h3>
              <p>
                Cada fila corresponde a una persona y cada columna a una reunión celebrada. Se actualiza automáticamente
                al guardar asistencia o haciendo clic en cualquier casillero.
              </p>
            </div>
          </div>

          <div className="attendance-matrix-filters">
            <label>
              <span>Mes</span>
              <input type="month" value={matrixMonth} onChange={e => setMatrixMonth(e.target.value)} />
            </label>
            <label>
              <span>Tipo de reunión</span>
              <select value={matrixKind} onChange={e => setMatrixKind(e.target.value)}>
                {['Todos', 'Culto', 'Jóvenes', 'Ayuno', 'Devocional', 'Oración', 'Evento'].map(k => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Grupo de edad</span>
              <select value={matrixAge} onChange={e => setMatrixAge(e.target.value as any)}>
                <option value="Todos">Todos</option>
                <option value="Adulto">Adultos</option>
                <option value="Joven">Jóvenes</option>
                <option value="Niño">Niños</option>
              </select>
            </label>
            <label>
              <span>Buscar persona</span>
              <input
                type="search"
                placeholder="Nombre o apellido..."
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
              />
            </label>
          </div>

          {scopedMatrixEvents.length > 0 ? (
            <div className="attendance-matrix-scroll">
              <table className="attendance-matrix-table">
                <thead>
                  <tr>
                    <th className="sticky-person-col">Persona</th>
                    {scopedMatrixEvents.map(ev => (
                      <th key={ev.id} className="matrix-event-col">
                        <button
                          type="button"
                          className="matrix-col-header-btn"
                          onClick={() => choose(ev.id, true)}
                          title={`Abrir lista: ${ev.name} (${ev.date})`}
                        >
                          <strong>{ev.date?.slice(8, 10)}/{ev.date?.slice(5, 7)}</strong>
                          <span>{ev.kind || 'Culto'}</span>
                          <small>{ev.name}</small>
                        </button>
                      </th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixPeople.map(person => {
                    let attendedCount = 0
                    return (
                      <tr key={person.id}>
                        <td className="sticky-person-col">
                          <strong>{label(person)}</strong>
                          <small>
                            {person.status === 'Amigo' ? 'Amigo' : 'Vinculado'} ·{' '}
                            {personAgeCategory(person) || 'Adulto'}
                          </small>
                        </td>
                        {scopedMatrixEvents.map(ev => {
                          const att = state.attendance.find(a => a.eventId === ev.id)
                          const isPresent = Boolean(att?.people?.includes(person.id))
                          if (isPresent) attendedCount++
                          return (
                            <td key={ev.id} className="matrix-check-cell">
                              <button
                                type="button"
                                className={`matrix-cell-btn${isPresent ? ' present' : ''}`}
                                onClick={() => toggleMatrixCell(ev, person.id)}
                                aria-label={`${label(person)} en ${ev.name} (${ev.date}): ${
                                  isPresent ? 'Presente' : 'Ausente'
                                }`}
                              >
                                {isPresent ? '✓' : ''}
                              </button>
                            </td>
                          )
                        })}
                        <td className="matrix-person-total">
                          <strong>
                            {attendedCount}/{scopedMatrixEvents.length}
                          </strong>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="quiet-empty">No hay encuentros registrados para el filtro seleccionado.</p>
          )}
        </section>
      )}

      <section className="workspace-section attendance-history">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Registro de encuentros</span>
            <h3>Listas recientes</h3>
          </div>
          <Link className="secondary-action" to="/calendario">
            <Plus size={17} /> Culto especial
          </Link>
        </div>
        {state.events
          .filter(e => !scope || e.churchId === scope || e.preachingPlaceId === scope)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 12)
          .map(e => {
            const saved = state.attendance.find(a => a.eventId === e.id)
            return (
              <button className="work-row" key={e.id} onClick={() => choose(e.id, true)}>
                <CalendarDays />
                <div>
                  <strong>{e.name}</strong>
                  <small>
                    {e.date} · {e.time || 'Sin hora'} · {e.kind || 'Culto'} ·{' '}
                    {saved ? `${saved.people.length + Number(saved.visitors || 0)} asistentes` : 'Lista pendiente'}
                  </small>
                </div>
                <span className="row-action">
                  {saved ? 'Revisar' : 'Pasar lista'} <ArrowRight size={17} />
                </span>
              </button>
            )
          })}
        {!state.events.some(e => !scope || e.churchId === scope || e.preachingPlaceId === scope) && (
          <p className="quiet-empty">Configura un horario habitual o crea un culto especial para comenzar.</p>
        )}
      </section>
    </>
  )
}

// --- Células y grupos de amistad (Agrupadas por congregación en Administración Nacional — Lote 1) ---

const CELL_COLORS = ['#0b63ce', '#2b9b35', '#ff8a00', '#159ed6', '#6f2aa8', '#df0712', '#f7b625', '#082d67']

function CellDonutCard({
  title,
  subtitle,
  items,
  formatter = (value: number) => String(value),
  centerLabel = 'TOTAL'
}: {
  title: string
  subtitle: string
  items: { label: string; value: number; color: string }[]
  formatter?: (value: number) => string
  centerLabel?: string
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const radius = 58
  const circumference = 2 * Math.PI * radius
  let progress = 0
  return (
    <article className="cell-chart-card">
      <div className="cell-chart-heading">
        <div>
          <span>{subtitle}</span>
          <h3>{title}</h3>
        </div>
        <BarChart3 size={21} />
      </div>
      <div className="cell-chart-content">
        <div className="cell-donut-wrap" aria-label={`${title}: ${formatter(total)}`}>
          <svg className="cell-donut" viewBox="0 0 160 160" role="img">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#eaf2f8" strokeWidth="24" />
            {total > 0 &&
              items.map((item, index) => {
                const length = (item.value / total) * circumference
                const offset = -progress
                progress += length
                return (
                  <circle
                    key={`${item.label}-${index}`}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="24"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                    transform="rotate(-90 80 80)"
                  />
                )
              })}
          </svg>
          <div className="cell-donut-center">
            <small>{centerLabel}</small>
            <strong>{formatter(total)}</strong>
          </div>
        </div>
        <ol className="cell-ranking">
          {[...items]
            .sort((a, b) => b.value - a.value)
            .map((item, index) => (
              <li key={item.label}>
                <span className="cell-rank-number" style={{ background: item.color }}>
                  {index + 1}
                </span>
                <strong>{item.label}</strong>
                <b>{formatter(item.value)}</b>
              </li>
            ))}
        </ol>
      </div>
    </article>
  )
}

function CellGroupsDashboard({
  state,
  scope,
  save
}: {
  state: State
  scope: string
  save: (collection: string, row: Row) => Promise<any>
}) {
  const location = useLocation()
  const [selectedChurchId, setSelectedChurchId] = useState<string>(
    () => new URLSearchParams(location.search).get('iglesia') || ''
  )
  const effectiveScope = scope || selectedChurchId
  const showLocalDetails = Boolean(scope)
  const showNationalChurchDetails = !scope && Boolean(selectedChurchId)

  const allCellGroups = state.groups.filter(group => group.kind === 'Célula')
  const scopedGroups = allCellGroups.filter(group => !effectiveScope || group.churchId === effectiveScope)
  const allReports = (state.cellReports || []).filter(report => !effectiveScope || report.churchId === effectiveScope)
  const newest = [...allReports].sort((a, b) => String(b.weekEnd).localeCompare(String(a.weekEnd)))[0]
  const [weekStart, setWeekStart] = useState(newest?.weekStart || today())
  const [weekEnd, setWeekEnd] = useState(newest?.weekEnd || today())
  const [reportOpen, setReportOpen] = useState(false)
  const [cellOpen, setCellOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('pn_cells_sheet_url') || '')
  const [busy, setBusy] = useState(false)
  const [cellDraft, setCellDraft] = useState({
    name: '',
    churchId: scope || state.churches.find(c => c.isPreachingPlace !== 'Sí')?.id || '',
    leaderId: '',
    schedule: '',
    location: ''
  })
  const [reportDraft, setReportDraft] = useState({
    groupId: scopedGroups[0]?.id || '',
    adults: '',
    visitors: '',
    children: '',
    offering: '',
    leader: ''
  })

  const reports = allReports.filter(report => report.weekStart === weekStart && report.weekEnd === weekEnd)
  const groupRows = scopedGroups.map((group, index) => {
    const matching = reports.filter(report => report.groupId === group.id)
    const adults = matching.reduce((sum, report) => sum + Number(report.adults || 0), 0)
    const visitors = matching.reduce((sum, report) => sum + Number(report.visitors || 0), 0)
    const children = matching.reduce((sum, report) => sum + Number(report.children || 0), 0)
    return {
      group,
      adults,
      visitors,
      children,
      attendance: adults + visitors + children,
      offering: matching.reduce((sum, report) => sum + Number(report.offering || 0), 0),
      color: CELL_COLORS[index % CELL_COLORS.length],
      submitted: matching.length > 0
    }
  })
  const totalAttendance = groupRows.reduce((sum, row) => sum + row.attendance, 0)
  const totalOffering = groupRows.reduce((sum, row) => sum + row.offering, 0)
  const printSummary = () => {
    const popup = window.open('', '_blank', 'width=1100,height=760')
    if (!popup) {
      setMessage('Permite las ventanas emergentes para imprimir el resumen.')
      return
    }
    const congregation = effectiveScope
      ? state.churches.find(church => church.id === effectiveScope)?.name || 'Congregación'
      : 'Todas las congregaciones'
    const bodyRows = groupRows.map(row =>
      '<tr><td>' + escapeXml(row.group.name) + '</td>' +
      (!scope ? '<td>' + escapeXml(state.churches.find(church => church.id === row.group.churchId)?.name || '—') + '</td>' : '') +
      '<td>' + escapeXml(label(state.people.find(person => person.id === row.group.leaderId))) + '</td>' +
      '<td>' + row.adults + '</td><td>' + row.visitors + '</td><td>' + row.children + '</td>' +
      '<td><strong>' + row.attendance + '</strong></td><td>' + escapeXml(money(row.offering)) + '</td>' +
      '<td>' + (row.submitted ? 'Recibido' : 'Pendiente') + '</td></tr>'
    ).join('')
    popup.document.write(
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resumen de células</title>' +
      '<style>body{font:14px Arial,sans-serif;color:#253858;margin:32px}h1{margin:0 0 6px}p{color:#66758a}header{border-bottom:3px solid #2d4c88;padding-bottom:16px;margin-bottom:20px}.totals{display:flex;gap:24px;margin:20px 0}.totals div{padding:12px 18px;background:#f2f6fc;border-radius:10px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #dbe3ef;padding:10px;text-align:left}th{background:#eef3fa}@media print{body{margin:12mm}}</style></head><body>' +
      '<header><small>PORTAL NACIONAL · INFORME DE CÉLULAS</small><h1>Células y grupos de amistad</h1><p>' +
      escapeXml(congregation) + ' · Semana ' + escapeXml(weekStart) + ' — ' + escapeXml(weekEnd) +
      '</p></header><div class="totals"><div>Asistencia total<br><strong>' + totalAttendance +
      '</strong></div><div>Ofrendas registradas<br><strong>' + escapeXml(money(totalOffering)) +
      '</strong></div><div>Grupos informados<br><strong>' + groupRows.filter(row => row.submitted).length +
      ' de ' + groupRows.length + '</strong></div></div><table><thead><tr><th>Célula</th>' +
      (!scope ? '<th>Congregación</th>' : '') +
      '<th>Responsable</th><th>Adultos</th><th>Visitas</th><th>Niños</th><th>Total</th><th>Ofrenda</th><th>Estado</th></tr></thead><tbody>' +
      (bodyRows || '<tr><td colspan="9">No hay informes en este período.</td></tr>') +
      '</tbody></table></body></html>'
    )
    popup.document.close()
    popup.focus()
    popup.setTimeout(() => popup.print(), 350)
  }
  const categoryItems = [
    { label: 'Adultos', value: groupRows.reduce((sum, row) => sum + row.adults, 0), color: '#0b63ce' },
    { label: 'Visitas', value: groupRows.reduce((sum, row) => sum + row.visitors, 0), color: '#2b9b35' },
    { label: 'Niños', value: groupRows.reduce((sum, row) => sum + row.children, 0), color: '#ff7900' }
  ]

  async function createCell(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await save('groups', {
        id: '',
        name: cellDraft.name,
        kind: 'Célula',
        churchId: cellDraft.churchId,
        leaderId: cellDraft.leaderId,
        schedule: cellDraft.schedule,
        location: cellDraft.location,
        notes: 'Grupo de amistad registrado desde el módulo de células.',
        members: []
      })
      setCellOpen(false)
      setCellDraft(current => ({ ...current, name: '', leaderId: '', schedule: '', location: '' }))
      setMessage('La célula quedó registrada.')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function createReport(event: FormEvent) {
    event.preventDefault()
    const group = state.groups.find(item => item.id === reportDraft.groupId)
    if (!group) {
      setMessage('Selecciona una célula existente.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const previous = allReports.find(
        report => report.groupId === group.id && report.weekStart === weekStart && report.weekEnd === weekEnd
      )
      await save('cellReports', {
        id: previous?.id || '',
        name: `${group.name} · ${weekStart} a ${weekEnd}`,
        churchId: group.churchId,
        groupId: group.id,
        weekStart,
        weekEnd,
        adults: reportDraft.adults || '0',
        visitors: reportDraft.visitors || '0',
        children: reportDraft.children || '0',
        offering: reportDraft.offering || '0',
        leader: reportDraft.leader,
        source: 'Carga local',
        notes: ''
      })
      setReportOpen(false)
      setReportDraft(current => ({ ...current, adults: '', visitors: '', children: '', offering: '', leader: '' }))
      setMessage(previous ? 'El informe semanal fue actualizado.' : 'El informe semanal fue guardado.')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function importResponses(text: string, source: 'Google Forms / CSV' | 'Enlace público de Google Sheets') {
    const parsed = parseCsv(text)
    if (parsed.length < 2) throw new Error('El archivo no contiene respuestas para importar.')
    const headers = parsed[0].map(normalizeText)
    const findColumn = (...names: string[]) =>
      headers.findIndex(header =>
        names.some(name => header === normalizeText(name) || header.includes(normalizeText(name)))
      )
    const indexes = {
      group: findColumn('célula', 'celula', 'grupo de amistad', 'grupo'),
      adults: findColumn('adultos', 'adulto'),
      visitors: findColumn('visitas', 'visitantes', 'amigos'),
      children: findColumn('niños', 'ninos', 'menores'),
      offering: findColumn('ofrenda', 'ofrendas'),
      leader: findColumn('líder', 'lider', 'responsable'),
      start: findColumn('inicio de la semana', 'fecha inicio'),
      end: findColumn('fin de la semana', 'fecha fin')
    }
    if (indexes.group < 0) throw new Error('No encontré una columna llamada Célula o Grupo de amistad.')
    let imported = 0
    const missing = new Set<string>()
    for (const values of parsed.slice(1)) {
      const groupName = values[indexes.group]?.trim()
      if (!groupName) continue
      const group = scopedGroups.find(item => normalizeText(item.name) === normalizeText(groupName))
      if (!group) {
        missing.add(groupName)
        continue
      }
      const start = /^\d{4}-\d{2}-\d{2}$/.test(values[indexes.start] || '') ? values[indexes.start] : weekStart
      const end = /^\d{4}-\d{2}-\d{2}$/.test(values[indexes.end] || '') ? values[indexes.end] : weekEnd
      const previous = allReports.find(
        report => report.groupId === group.id && report.weekStart === start && report.weekEnd === end
      )
      await save('cellReports', {
        id: previous?.id || '',
        name: `${group.name} · ${start} a ${end}`,
        churchId: group.churchId,
        groupId: group.id,
        weekStart: start,
        weekEnd: end,
        adults: String(parseLocalNumber(values[indexes.adults])),
        visitors: String(parseLocalNumber(values[indexes.visitors])),
        children: String(parseLocalNumber(values[indexes.children])),
        offering: String(parseLocalNumber(values[indexes.offering])),
        leader: indexes.leader >= 0 ? values[indexes.leader] : '',
        source,
        notes: ''
      })
      imported++
    }
    if (!imported && missing.size)
      throw new Error(`No se importó nada. Primero crea estas células: ${[...missing].join(', ')}.`)
    setMessage(
      `${imported} respuesta${imported === 1 ? '' : 's'} importada${imported === 1 ? '' : 's'}${
        missing.size ? `. Sin coincidencia: ${[...missing].join(', ')}` : '.'
      }`
    )
    setImportOpen(false)
  }

  async function syncSheet() {
    const url = normalizeGoogleSheetUrl(sheetUrl)
    if (!url) {
      setMessage('Pega primero el enlace de la hoja de respuestas.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      localStorage.setItem('pn_cells_sheet_url', sheetUrl)
      const response = await fetch(url)
      if (!response.ok)
        throw new Error('No se pudo leer la hoja. Debe estar publicada o compartida para lectura mediante enlace.')
      await importResponses(await response.text(), 'Enlace público de Google Sheets')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const mainChurches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')

  return (
    <section className="cells-page">
      <header className="cells-hero">
        <div>
          <span className="eyebrow">{scope ? 'Gestión congregacional' : 'Supervisión Nacional de Células'}</span>
          <h2>Células y grupos de amistad</h2>
          <p>Recibe los informes semanales y convierte las respuestas en un resumen listo para compartir.</p>
        </div>
        {showLocalDetails && <div className="cells-hero-actions">
          <button type="button" className="secondary-action" onClick={() => setImportOpen(true)}>
            <Upload size={17} /> Importar respuestas
          </button>
          <button type="button" className="primary-action" onClick={() => setReportOpen(true)}>
            <CheckCircle2 size={17} /> Cargar informe
          </button>
        </div>}
      </header>

      <div className="cells-period-bar">
        {showLocalDetails ? (
          <>
            <div className="cells-period-title">
              <span>Semana informada</span>
              <strong>{weekStart} — {weekEnd}</strong>
            </div>
            <label>
              Desde
              <input type="date" value={weekStart} onChange={event => setWeekStart(event.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={weekEnd} onChange={event => setWeekEnd(event.target.value)} />
            </label>
            <button type="button" className="secondary-action" onClick={() => setCellOpen(true)}>
              <Plus size={17} /> Nueva célula
            </button>
          </>
        ) : showNationalChurchDetails ? (
          <div className="cells-period-title">
            <span>Vista de consulta</span>
            <strong>{state.churches.find(church => church.id === selectedChurchId)?.name || 'Congregación'} · {plural(scopedGroups.length, 'célula', 'células')}</strong>
          </div>
        ) : (
          <div className="cells-period-title">
            <span>Supervisión por congregación</span>
            <strong>Elige una congregación para consultar las células registradas.</strong>
          </div>
        )}
      </div>
      {message && (
        <p className="cells-message" role="status">
          {message}
        </p>
      )}

      {showLocalDetails && <div className="cells-kpis">
        <div>
          <UsersRound size={22} />
          <span>Asistencia total</span>
          <strong>{totalAttendance}</strong>
          <small>
            {reports.length} de {scopedGroups.length} células informaron
          </small>
        </div>
        <div>
          <span className="cell-kpi-currency">$</span>
          <span>Ofrendas recibidas</span>
          <strong>{money(totalOffering)}</strong>
          <small>Acumulado de la semana</small>
        </div>
        <div>
          <CheckCircle2 size={22} />
          <span>Cumplimiento</span>
          <strong>{scopedGroups.length ? Math.round((reports.length / scopedGroups.length) * 100) : 0}%</strong>
          <small>{Math.max(0, scopedGroups.length - reports.length)} informes pendientes</small>
        </div>
      </div>}

      {/* Lote 1: Agrupación de células por congregación en Administración Nacional */}
      {!scope && (
        <section className="workspace-section" style={{ marginBottom: 18 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Agrupación Nacional</span>
              <h3>Células por congregación</h3>
            </div>
            {selectedChurchId && (
              <button type="button" className="secondary-action compact-btn" onClick={() => setSelectedChurchId('')}>
                Ver todas las congregaciones
              </button>
            )}
          </div>
          <div className="congregation-cards-grid">
            {mainChurches.map(ch => {
              const chGroups = allCellGroups.filter(g => g.churchId === ch.id)
              const active = selectedChurchId === ch.id
              return (
                <article
                  key={ch.id}
                  className={`congregation-summary-card${active ? ' selected' : ''}`}
                  onClick={() => setSelectedChurchId(prev => (prev === ch.id ? '' : ch.id))}
                >
                  <div className="congregation-card-head">
                    <div>
                      <span className="eyebrow">{ch.department || ch.city}</span>
                      <h4>{ch.name}</h4>
                    </div>
                    <span className="count-pill">{plural(chGroups.length, 'célula', 'células')}</span>
                  </div>
                  <div className="congregation-card-footer">
                    <span>{active ? 'Congregación seleccionada' : 'Abrir células →'}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {showNationalChurchDetails && (
        <section className="workspace-section" aria-label="Células de la congregación seleccionada">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Directorio local</span>
              <h3>{state.churches.find(church => church.id === selectedChurchId)?.name || 'Congregación'}</h3>
            </div>
            <button type="button" className="secondary-action compact-btn" onClick={() => setSelectedChurchId('')}>
              Volver a congregaciones
            </button>
          </div>
          {scopedGroups.length ? (
            <div className="cells-table-wrap">
              <table>
                <thead><tr><th>Célula</th><th>Responsable</th><th>Integrantes</th></tr></thead>
                <tbody>
                  {scopedGroups.map(group => (
                    <tr key={group.id}>
                      <td><strong>{group.name}</strong></td>
                      <td>{label(state.people.find(person => person.id === group.leaderId))}</td>
                      <td>{(group.members || []).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">Esta congregación todavía no tiene células registradas.</p>}
        </section>
      )}

      {showLocalDetails && <div className="cells-analytics-grid">
        <CellDonutCard
          title="Asistencia total por grupo"
          subtitle="Grupos de amistad"
          items={groupRows.map(row => ({ label: row.group.name, value: row.attendance, color: row.color }))}
          centerLabel="ASISTENTES"
        />
        <CellDonutCard
          title="Ofrendas por célula"
          subtitle="Resumen financiero"
          items={groupRows.map(row => ({ label: row.group.name, value: row.offering, color: row.color }))}
          formatter={money}
          centerLabel="OFRENDAS"
        />
        <CellDonutCard
          title="Asistencia por categoría"
          subtitle="Composición semanal"
          items={categoryItems}
          centerLabel="ASISTENTES"
        />
      </div>}

      {showLocalDetails && <section className="cells-submissions">
        <div className="cells-section-heading">
          <div>
            <span className="eyebrow">Seguimiento</span>
            <h3>Estado de los informes</h3>
          </div>
          <button type="button" className="secondary-action" onClick={printSummary}>
            <Printer size={17} /> Imprimir resumen
          </button>
        </div>
        <div className="cells-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Célula</th>
                {!scope && <th>Congregación</th>}
                <th>Líder</th>
                <th>Adultos</th>
                <th>Visitas</th>
                <th>Niños</th>
                <th>Total</th>
                <th>Ofrenda</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {groupRows.map(row => {
                const report = reports.find(item => item.groupId === row.group.id)
                const chName = state.churches.find(c => c.id === row.group.churchId)?.name || '—'
                return (
                  <tr key={row.group.id}>
                    <td>
                      <strong>{row.group.name}</strong>
                      <small>{row.group.schedule || 'Sin horario habitual'}</small>
                    </td>
                    {!scope && <td>{chName}</td>}
                    <td>
                      {report?.leader || label(state.people.find(person => person.id === row.group.leaderId))}
                    </td>
                    <td>{row.adults}</td>
                    <td>{row.visitors}</td>
                    <td>{row.children}</td>
                    <td>
                      <b>{row.attendance}</b>
                    </td>
                    <td>{money(row.offering)}</td>
                    <td>
                      <span className={`cell-status ${row.submitted ? 'done' : 'pending'}`}>
                        {row.submitted ? 'Recibido' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>}

      {reportOpen && (
        <div className="modal-backdrop">
          <div className="person-modal cell-modal" role="dialog" aria-modal="true" aria-label="Cargar informe semanal">
            <div className="record-heading">
              <div>
                <span className="eyebrow">Informe semanal</span>
                <h2>Cargar respuesta de una célula</h2>
                <p>Los totales se incorporan inmediatamente a los gráficos.</p>
              </div>
              <button type="button" className="icon-close" onClick={() => setReportOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={createReport}>
              <label>
                Célula
                <select
                  value={reportDraft.groupId}
                  onChange={event => setReportDraft({ ...reportDraft, groupId: event.target.value })}
                  required
                >
                  <option value="">Seleccionar</option>
                  {scopedGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Adultos
                <input
                  type="number"
                  min="0"
                  value={reportDraft.adults}
                  onChange={event => setReportDraft({ ...reportDraft, adults: event.target.value })}
                  required
                />
              </label>
              <label>
                Visitas
                <input
                  type="number"
                  min="0"
                  value={reportDraft.visitors}
                  onChange={event => setReportDraft({ ...reportDraft, visitors: event.target.value })}
                  required
                />
              </label>
              <label>
                Niños
                <input
                  type="number"
                  min="0"
                  value={reportDraft.children}
                  onChange={event => setReportDraft({ ...reportDraft, children: event.target.value })}
                  required
                />
              </label>
              <label>
                Ofrenda (UYU)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reportDraft.offering}
                  onChange={event => setReportDraft({ ...reportDraft, offering: event.target.value })}
                  required
                />
              </label>
              <label>
                Líder que informa
                <input
                  value={reportDraft.leader}
                  onChange={event => setReportDraft({ ...reportDraft, leader: event.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setReportOpen(false)}>
                  Cancelar
                </button>
                <button className="primary-action" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar informe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cellOpen && (
        <div className="modal-backdrop">
          <div className="person-modal cell-modal" role="dialog" aria-modal="true" aria-label="Crear célula">
            <div className="record-heading">
              <div>
                <span className="eyebrow">Directorio local</span>
                <h2>Nueva célula</h2>
                <p>Quedará disponible para la carga semanal y la importación.</p>
              </div>
              <button type="button" className="icon-close" onClick={() => setCellOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={createCell}>
              <label>
                Nombre
                <input
                  value={cellDraft.name}
                  onChange={event => setCellDraft({ ...cellDraft, name: event.target.value })}
                  required
                />
              </label>
              {!scope && (
                <label>
                  Congregación
                  <select
                    value={cellDraft.churchId}
                    onChange={event => setCellDraft({ ...cellDraft, churchId: event.target.value })}
                    required
                  >
                    <option value="">Seleccionar</option>
                    {state.churches
                      .filter(church => church.isPreachingPlace !== 'Sí')
                      .map(church => (
                        <option key={church.id} value={church.id}>
                          {church.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label>
                Líder
                <select
                  value={cellDraft.leaderId}
                  onChange={event => setCellDraft({ ...cellDraft, leaderId: event.target.value })}
                >
                  <option value="">Sin asignar</option>
                  {state.people
                    .filter(person => person.churchId === cellDraft.churchId)
                    .map(person => (
                      <option key={person.id} value={person.id}>
                        {label(person)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Día y hora
                <input
                  value={cellDraft.schedule}
                  onChange={event => setCellDraft({ ...cellDraft, schedule: event.target.value })}
                  placeholder="Ej. Miércoles 20:00"
                />
              </label>
              <label>
                Lugar o zona
                <input
                  value={cellDraft.location}
                  onChange={event => setCellDraft({ ...cellDraft, location: event.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setCellOpen(false)}>
                  Cancelar
                </button>
                <button className="primary-action" disabled={busy}>
                  {busy ? 'Guardando…' : 'Crear célula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-backdrop">
          <div
            className="person-modal cell-import-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Importar respuestas"
          >
            <div className="record-heading">
              <div>
                <span className="eyebrow">Google Forms</span>
                <h2>Importar respuestas semanales</h2>
                <p>Usa la hoja vinculada al formulario o descarga sus respuestas como CSV.</p>
              </div>
              <button type="button" className="icon-close" onClick={() => setImportOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="cell-import-body">
              <div className="cell-import-option">
                <Link2 size={23} />
                <div>
                  <strong>Sincronizar una hoja pública</strong>
                  <p>
                    Pega el enlace de Google Sheets. La hoja debe estar publicada o compartida para lectura mediante
                    enlace.
                  </p>
                </div>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={event => setSheetUrl(event.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <button type="button" className="primary-action" onClick={syncSheet} disabled={busy}>
                  {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
                </button>
              </div>
              <div className="cell-import-divider">
                <span>o</span>
              </div>
              <label className="cell-file-drop">
                <Upload size={25} />
                <strong>Elegir archivo CSV</strong>
                <span>Columnas reconocidas: Célula, Adultos, Visitas, Niños, Ofrenda y Líder.</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async event => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    setBusy(true)
                    try {
                      await importResponses(await file.text(), 'Google Forms / CSV')
                    } catch (error) {
                      setMessage((error as Error).message)
                    } finally {
                      setBusy(false)
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// --- Informes Cuatrimestrales y Gráficos Compartidos ---

function Reports({
  state,
  scope,
  committeeKey,
  onOpenBreakdown,
  save,
  canReview = false
}: {
  state: State
  scope: string
  committeeKey?: string
  onOpenBreakdown: (title: string, txs: Row[]) => void
  save?: (c: string, r: Row) => Promise<any>
  canReview?: boolean
}) {
  const currentYear = new Date().getFullYear()
  const [from, setFrom] = useState(`${currentYear}-01-01`)
  const [to, setTo] = useState(today())
  const [reportView, setReportView] = useState<'summary' | 'detail'>('summary')
  const [selectedCommitteeChurchId, setSelectedCommitteeChurchId] = useState('')
  const scoped = (key: string) => state[key].filter(r => !scope || r.churchId === scope || r.preachingPlaceId === scope)
  const tx = scoped('transactions').filter(
    r => r.date >= from && r.date <= to && !isTitheTransaction(r) && !['Cuenta por cobrar', 'Cuenta por pagar'].includes(r.accountType)
  )
  const incoming =
    tx.filter(r => r.direction === 'Ingreso').reduce((s, r) => s + Math.round(Number(r.amount) * 100), 0) / 100
  const outgoing =
    tx.filter(r => r.direction === 'Egreso').reduce((s, r) => s + Math.round(Number(r.amount) * 100), 0) / 100
  const events = scoped('events').filter(e => e.date >= from && e.date <= to)
  const attendance = state.attendance.filter(a => events.some(e => e.id === a.eventId))
  const scopedPeople = scoped('people')

  // Datos demográficos por edad
  let countAdults = 0
  let countYouth = 0
  let countKids = 0
  for (const p of scopedPeople) {
    const cat = personAgeCategory(p)
    if (cat === 'Niño') countKids++
    else if (cat === 'Joven') countYouth++
    else countAdults++
  }

  const demographicData = [
    { label: 'Adultos (26+)', value: countAdults, color: '#073b7a' },
    { label: 'Jóvenes (12-25)', value: countYouth, color: '#2d9bf0' },
    { label: 'Niños (0-11)', value: countKids, color: '#7cc8ff' }
  ]

  // Datos para conceptos de ingresos
  const ofrendas = tx
    .filter(t => t.direction === 'Ingreso' && t.category === 'Ofrenda')
    .reduce((s, t) => s + Number(t.amount || 0), 0)
  const donaciones = tx
    .filter(t => t.direction === 'Ingreso' && t.category === 'Donación')
    .reduce((s, t) => s + Number(t.amount || 0), 0)
  const otros = tx
    .filter(t => t.direction === 'Ingreso' && !['Ofrenda', 'Diezmo', 'Donación'].includes(t.category))
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  const incomeCategoriesData = [
    { label: 'Ofrendas', value: Math.round(ofrendas), color: '#073b7a' },
    { label: 'Donaciones', value: Math.round(donaciones), color: '#7cc8ff' },
    { label: 'Otros', value: Math.round(otros), color: '#f7b625' }
  ]

  // Cumplimiento de entregas por congregación
  const assignmentsInPeriod = state.activityAssignments.filter(aa => {
    const act = state.nationalActivities.find(a => a.id === aa.activityId)
    return act && act.deadline >= from && act.deadline <= to && (!scope || aa.churchId === scope)
  })
  const totalAssignments = assignmentsInPeriod.length
  const approvedAssignments = assignmentsInPeriod.filter(a => a.status === 'Aprobada' || a.status === 'Enviada').length
  const pendingAssignments = totalAssignments - approvedAssignments

  const complianceData = [
    { label: 'Entregadas / Aprobadas', value: approvedAssignments, color: '#2d9bf0' },
    { label: 'Pendientes', value: pendingAssignments, color: '#f7b625' }
  ]

  const netResult = incoming - outgoing
  const committeeInfo = committeeKey ? NATIONAL_COMMITTEES.find(c => c.key === committeeKey) : null
  const reportChurch = committeeInfo
    ? committeeInfo.name
    : state.churches.find(c => c.id === scope)?.name || 'Administración Nacional'
  const mainChurches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  // En la congregación lo importante es preparar y enviar; el análisis queda plegado.
  const localView = Boolean(scope) && !committeeKey

  return (
    <>
      <div className="report-center-header">
        <div>
          <span className="eyebrow">
            {committeeInfo
              ? `Informes del ${committeeInfo.name}`
              : canReview && !scope
                ? 'Recepción y Supervisión Nacional'
                : 'Centro de informes'}
          </span>
          <h2>Informes</h2>
          <p>
            {committeeInfo
              ? 'Actividades realizadas, asistencia por congregación, estado de asignaciones y finanzas propias del comité.'
              : canReview && !scope
                ? 'Supervisa los informes mensuales y cuatrimestrales enviados por cada congregación.'
                : 'Un solo lugar para preparar, revisar y enviar la información de la congregación.'}
          </p>
        </div>
        <div className="report-header-actions">
          <button className="secondary-action" onClick={() => downloadExcelWorkbook(state, scope)}>
            <FileSpreadsheet size={17} /> Exportar datos
          </button>
          <button
            className="primary-action"
            onClick={() => (canReview && !scope && !committeeInfo ? window.dispatchEvent(new Event(PRINT_NATIONAL_SUMMARY)) : window.print())}
          >
            <Printer size={17} /> Imprimir resumen
          </button>
        </div>
      </div>

      {/* Lote 2: Si es un Comité Nacional, mostrar informe ejecutivo del comité segmentado por congregación */}
      {committeeInfo ? (
        <section className="workspace-section" style={{ marginBottom: 20 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">Desempeño por congregación</span>
              <h3>Actividades, asistencia y respuestas del {committeeInfo.name}</h3>
              <p>
                Resumen segmentado por iglesia: participación en eventos del comité, devoluciones enviadas y aportes recibidos.
              </p>
            </div>
            {selectedCommitteeChurchId && (
              <button
                type="button"
                className="secondary-action compact-btn"
                onClick={() => setSelectedCommitteeChurchId('')}
              >
                Ver todas las congregaciones
              </button>
            )}
          </div>
          <div className="congregation-cards-grid">
            {mainChurches.map(ch => {
              const chAssignments = state.activityAssignments.filter(a => a.churchId === ch.id)
              const chDone = chAssignments.filter(a => ['Enviada', 'Aprobada'].includes(a.status)).length
              const chPending = chAssignments.length - chDone
              const chAtt = chAssignments.reduce(
                (s, a) => s + Number(a.attendanceCount || 0) + Number(a.visitorsCount || 0),
                0
              )
              const chFunds = tx
                .filter(t => t.churchId === ch.id && t.direction === 'Ingreso' && !isTitheTransaction(t))
                .reduce((s, t) => s + Number(t.amount || 0), 0)
              const active = selectedCommitteeChurchId === ch.id
              return (
                <article
                  key={ch.id}
                  className={`congregation-summary-card${active ? ' selected' : ''}`}
                  onClick={() => setSelectedCommitteeChurchId(prev => (prev === ch.id ? '' : ch.id))}
                >
                  <div className="congregation-card-head">
                    <div>
                      <span className="eyebrow">{ch.department || ch.city}</span>
                      <h4>{ch.name}</h4>
                    </div>
                    <span className={`status-badge ${chPending === 0 ? 'aprobada' : 'pendiente'}`}>
                      {chDone}/{chAssignments.length} entregas
                    </span>
                  </div>
                  <div className="congregation-card-metrics">
                    <div>
                      <span>Asistencia rep.</span>
                      <strong>{chAtt}</strong>
                    </div>
                    <div>
                      <span>Aportes al comité</span>
                      <strong>{money(chFunds)}</strong>
                    </div>
                    <div>
                      <span>Pendientes</span>
                      <strong>{chPending}</strong>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        save && (
          <ReportHub state={state} scope={scope} save={save} compressPhoto={compressPhoto} canReview={canReview} />
        )
      )}

      <details className={`report-analysis${localView ? '' : ' always-open'}`} open={!localView}>
        <summary>Ver números y gráficos del período</summary>
      <div className="analytics-heading">
        <span className="eyebrow">Consultar registros</span>
        <h3>Análisis del período</h3>
        <p>Explora los gráficos o abre el detalle de cada movimiento. Esta vista complementa la gestión del período.</p>
      </div>

      <div className="crm-controls report-filter-bar">
        <label>
          Período rápido
          <select
            defaultValue="personalizado"
            onChange={e => {
              const now = new Date()
              const end = today()
              const start = new Date(now)
              if (e.target.value === 'semana') start.setDate(now.getDate() - 6)
              if (e.target.value === 'mes') start.setDate(1)
              if (e.target.value === 'bimestre') start.setMonth(now.getMonth() - 1, 1)
              if (e.target.value === 'cuatrimestre') start.setMonth(Math.floor(now.getMonth() / 4) * 4, 1)
              if (e.target.value !== 'personalizado') {
                setFrom(start.toLocaleDateString('sv-SE'))
                setTo(end)
              }
            }}
          >
            <option value="personalizado">Personalizado</option>
            <option value="semana">Últimos 7 días</option>
            <option value="mes">Mes actual</option>
            <option value="bimestre">Bimestre actual</option>
            <option value="cuatrimestre">Cuatrimestre actual</option>
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <label>
          Cuatrimestre
          <select
            onChange={e => {
              const c = Number(e.target.value)
              if (c === 1) {
                setFrom(`${currentYear}-01-01`)
                setTo(`${currentYear}-04-30`)
              } else if (c === 2) {
                setFrom(`${currentYear}-05-01`)
                setTo(`${currentYear}-08-31`)
              } else if (c === 3) {
                setFrom(`${currentYear}-09-01`)
                setTo(`${currentYear}-12-31`)
              }
            }}
          >
            <option value="">Seleccionar cuatrimestre</option>
            <option value={1}>1º Cuatrimestre (Ene – Abr)</option>
            <option value={2}>2º Cuatrimestre (May – Ago)</option>
            <option value={3}>3º Cuatrimestre (Sep – Dic)</option>
          </select>
        </label>
        <button
          onClick={() => {
            const year = new Date().getFullYear()
            const start = Math.floor(new Date().getMonth() / 4) * 4
            setFrom(`${year}-${String(start + 1).padStart(2, '0')}-01`)
            setTo(new Date(year, start + 4, 0).toLocaleDateString('sv-SE'))
          }}
        >
          Cuatrimestre actual
        </button>
      </div>

      <section
        className="financial-statement-strip report-overview-strip directory-summary"
        aria-label="Resumen contable del período"
      >
        <div className="statement-heading">
          <span className="eyebrow">Resumen del período</span>
          <strong>Ingresos, egresos y resultado</strong>
          <small>
            {reportChurch} · {from} a {to}
          </small>
        </div>
        <button
          className="statement-value income"
          onClick={() => onOpenBreakdown('Ingresos del período', tx.filter(t => t.direction === 'Ingreso'))}
        >
          <span>Ingresos · ver registros</span>
          <strong>{money(incoming)}</strong>
        </button>
        <button
          className="statement-value expense"
          onClick={() => onOpenBreakdown('Egresos del período', tx.filter(t => t.direction === 'Egreso'))}
        >
          <span>Egresos · ver registros</span>
          <strong>{money(outgoing)}</strong>
        </button>
        <div className={`statement-value ${netResult >= 0 ? 'positive' : 'negative'}`}>
          <span>Resultado neto</span>
          <strong>{money(netResult)}</strong>
        </div>
      </section>

      <div className="report-view-switcher" role="tablist" aria-label="Vista del informe">
        <button
          type="button"
          className={reportView === 'summary' ? 'active' : ''}
          onClick={() => setReportView('summary')}
        >
          <BarChart3 size={16} /> Resumen visual
        </button>
        <button
          type="button"
          className={reportView === 'detail' ? 'active' : ''}
          onClick={() => setReportView('detail')}
        >
          <FileText size={16} /> Detalle y trazabilidad por congregación
        </button>
      </div>

      {reportView === 'summary' ? (
        <>
          <div className="section-heading report-summary-heading">
            <div>
              <span className="eyebrow">Lectura rápida</span>
              <h3>Resumen de actividad</h3>
              <p>Asistencia y seguimiento registrados en {reportChurch} para el período seleccionado.</p>
            </div>
          </div>
          <div className="report-activity-strip">
            <div>
              <span>Actividades en el calendario</span>
              <strong>{events.length}</strong>
            </div>
            <div>
              <span>Listas de asistencia</span>
              <strong>{attendance.length}</strong>
            </div>
            <div>
              <span>Asistencias acumuladas</span>
              <strong>{attendance.reduce((sum, a) => sum + a.people.length + a.visitors, 0)}</strong>
            </div>
            <div>
              <span>Entregas pendientes</span>
              <strong>{pendingAssignments}</strong>
            </div>
          </div>
          <div className="charts-grid report-charts-grid">
            <AttendanceStackedChart events={events} attendance={attendance} people={state.people} />
            <MonthlyFinanceChart transactions={tx} />
            <DonutChart
              items={incomeCategoriesData}
              title="Distribución de ingresos"
              subtitle="Desglose por concepto (UYU)"
              period={`${from} a ${to}`}
            />
          </div>
          <div className="charts-grid report-charts-grid report-secondary-charts">
            <DonutChart
              items={complianceData}
              title="Cumplimiento de entregas"
              subtitle="Entregadas vs pendientes"
              period={`${from} a ${to}`}
            />
            <DonutChart
              items={demographicData}
              title="Población por grupos de edad"
              subtitle="Distribución de personas registradas"
            />
          </div>
        </>
      ) : (
        <>
          <div className="report-detail-grid">
            <div className="report-detail-card">
              <span className="eyebrow">Asistencia</span>
              <h3>Lectura operativa</h3>
              <p>
                {events.length
                  ? `Se registraron ${events.length} encuentros y ${attendance.length} listas en el período.`
                  : 'Todavía no hay encuentros registrados en este período.'}
              </p>
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  onOpenBreakdown(
                    'Asistencias del período',
                    attendance.map(a => ({
                      ...a,
                      name: state.events.find(e => e.id === a.eventId)?.name || 'Encuentro'
                    }))
                  )
                }
              >
                Ver registros
              </button>
            </div>
            <div className="report-detail-card">
              <span className="eyebrow">Entregas</span>
              <h3>Seguimiento nacional</h3>
              <p>
                {totalAssignments
                  ? `${approvedAssignments} entregas enviadas o aprobadas y ${pendingAssignments} pendientes.`
                  : 'No hay entregas nacionales para este período.'}
              </p>
            </div>
          </div>
          <div className="charts-grid report-charts-grid report-secondary-charts">
            <DonutChart
              items={complianceData}
              title="Cumplimiento de entregas"
              subtitle="Entregadas vs pendientes"
              period={`${from} a ${to}`}
            />
            <DonutChart
              items={demographicData}
              title="Población por grupos de edad"
              subtitle="Distribución de personas registradas"
            />
          </div>
        </>
      )}

      {reportView === 'detail' && (
        <div className="crm-table-wrap report-traceability-table">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Congregación</th>
                <th>Personas vinculadas</th>
                <th>Encuentros</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {state.churches
                .filter(c => !scope || c.id === scope)
                .map(c => {
                  const churchTx = tx.filter(t => t.churchId === c.id)
                  const inc = churchTx
                    .filter(t => t.direction === 'Ingreso')
                    .reduce((s, t) => s + Number(t.amount || 0), 0)
                  const out = churchTx
                    .filter(t => t.direction === 'Egreso')
                    .reduce((s, t) => s + Number(t.amount || 0), 0)
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>{state.people.filter(p => p.churchId === c.id).length}</td>
                      <td>{events.filter(e => e.churchId === c.id).length}</td>
                      <td>{money(inc)}</td>
                      <td>{money(out)}</td>
                      <td>
                        <strong>{money(inc - out)}</strong>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
      </details>
    </>
  )
}

// --- Formulario de Devolución de Actividad para Congregaciones ---

function CongregationReturnForm({
  assignment,
  activity,
  state,
  onSaveAssignment,
  onClose
}: {
  assignment: Row
  activity: Row
  state: State
  onSaveAssignment: (updated: Row) => Promise<void>
  onClose: () => void
}) {
  const [localDate, setLocalDate] = useState(assignment.localDate || today())
  const [eventId, setEventId] = useState(assignment.eventId || '')
  const [attendanceCount, setAttendanceCount] = useState(assignment.attendanceCount || 0)
  const [visitorsCount, setVisitorsCount] = useState(assignment.visitorsCount || 0)
  const [places, setPlaces] = useState(assignment.places || '')
  const [previousActivitiesCount, setPreviousActivitiesCount] = useState(assignment.previousActivitiesCount || 0)
  const [description, setDescription] = useState(assignment.description || '')
  const [photos, setPhotos] = useState<string[]>(assignment.photos || [])
  const [notes, setNotes] = useState(assignment.notes || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // El total es lo primero que ve el pastor; el desglose queda disponible si lo necesita.
  const initialFin = assignment.financialData || {}
  const [preOfferings, setPreOfferings] = useState(Number(initialFin.preMissionaryOfferings || 0))
  const [serviceOffering, setServiceOffering] = useState(Number(initialFin.missionaryServiceOffering || 0))
  const [pledges, setPledges] = useState(Number(initialFin.pledges || 0))
  const [otherIncome, setOtherIncome] = useState(Number(initialFin.otherAuthorizedIncome || 0))
  const [expenses, setExpenses] = useState(Number(initialFin.expenses || 0))
  const [totalSent, setTotalSent] = useState(Number(initialFin.totalSent || 0))
  const [offeringTotal, setOfferingTotal] = useState(Number(initialFin.reportedOfferingTotal ?? (
    Number(initialFin.preMissionaryOfferings || 0) + Number(initialFin.missionaryServiceOffering || 0) +
    Number(initialFin.pledges || 0) + Number(initialFin.otherAuthorizedIncome || 0)
  )))

  const totalGathered = offeringTotal - expenses

  const handleAddPhoto = async (file?: File) => {
    if (!file) return
    if (photos.length >= 2) {
      setError('Solo se permite un máximo de 2 fotografías por devolución.')
      return
    }
    setError('')
    try {
      const compressed = await compressFor('activity', file)
      setPhotos([...photos, compressed])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx))
  }

  const submit = async (status: 'Iniciada' | 'Enviada') => {
    setBusy(true)
    setError('')
    try {
      const financialData = {
        preMissionaryOfferings: preOfferings,
        missionaryServiceOffering: serviceOffering,
        pledges,
        otherAuthorizedIncome: otherIncome,
        reportedOfferingTotal: offeringTotal,
        expenses,
        totalGathered,
        totalSent,
        totalReceived: initialFin.totalReceived || 0,
        status: status === 'Enviada' ? 'Enviado' : 'Registrado'
      }

      const updated = {
        ...assignment,
        status,
        localDate,
        eventId,
        attendanceCount: Number(attendanceCount),
        visitorsCount: Number(visitorsCount),
        places,
        previousActivitiesCount: Number(previousActivitiesCount),
        description,
        photos,
        notes,
        financialData,
        submittedAt: status === 'Enviada' ? new Date().toISOString() : assignment.submittedAt || ''
      }
      await onSaveAssignment(updated)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const localEvents = state.events.filter(e => e.churchId === assignment.churchId)

  return (
    <dialog open className="record-dialog" style={{ zIndex: 90 }}>
      <div className="record-heading">
        <div>
          <span className="eyebrow">Devolución Congregacional</span>
          <h2>{activity.name}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '.88rem', color: '#68726a' }}>
            Fecha límite de entrega: <strong>{activity.deadline}</strong> · Modalidad: {activity.dateMode}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>

      {activity.instructions && (
        <div
          style={{
            background: '#f8faf6',
            padding: 14,
            borderRadius: 12,
            margin: '14px 0',
            border: '1px solid #d5ded3'
          }}
        >
          <strong>Instrucciones del comité nacional:</strong>
          <p style={{ margin: '4px 0 0', fontSize: '.85rem' }}>{activity.instructions}</p>
        </div>
      )}

      <div className="record-fields" style={{ marginTop: 14 }}>
        <label>
          <span>Fecha local en que se realizó *</span>
          <input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} required />
        </label>

        <label>
          <span>Culto local relacionado</span>
          <select
            value={eventId}
            onChange={e => {
              setEventId(e.target.value)
              const ev = state.events.find(x => x.id === e.target.value)
              if (ev) {
                const att = state.attendance.find(a => a.eventId === ev.id)
                if (att) {
                  setAttendanceCount(att.people.length)
                  setVisitorsCount(att.visitors)
                }
              }
            }}
          >
            <option value="">Seleccionar culto celebrado</option>
            {localEvents.map(e => (
              <option key={e.id} value={e.id}>
                {e.date} · {e.name}
              </option>
            ))}
          </select>
        </label>

        {activity.requiresAttendance !== 'No' && (
          <>
            <label>
              <span>Asistencia de hermanos</span>
              <input type="number" min="0" value={attendanceCount} onChange={e => setAttendanceCount(Number(e.target.value))} />
            </label>
            <label>
              <span>Cantidad de visitas</span>
              <input type="number" min="0" value={visitorsCount} onChange={e => setVisitorsCount(Number(e.target.value))} />
            </label>
          </>
        )}

        <label>
          <span>Cantidad de cultos o actividades previas</span>
          <input
            type="number"
            min="0"
            value={previousActivitiesCount}
            onChange={e => setPreviousActivitiesCount(Number(e.target.value))}
          />
        </label>

        <label>
          <span>Lugares donde se realizó</span>
          <input
            type="text"
            placeholder="Ej. Templo central y anexo norte"
            value={places}
            onChange={e => setPlaces(e.target.value)}
          />
        </label>

        <label style={{ gridColumn: '1 / -1' }}>
          <span>Descripción de lo realizado</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Breve reseña de la actividad..."
          />
        </label>
      </div>

      {activity.requiresOffering !== 'No' && (
      <>
      {/* Información Económica Desglosada */}
      <section
        style={{ marginTop: 20, background: '#fbfcfb', padding: 18, borderRadius: 16, border: '1px solid #dbe3da' }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '.95rem', color: '#18392f' }}>Ofrenda reunida (UYU)</h3>
        <p style={{ margin: '0 0 12px', color: '#68726a', fontSize: '.85rem' }}>
          Ingresa el total. Si necesitas informar cada concepto, abre el desglose opcional.
        </p>
        <label style={{ display: 'block', maxWidth: 420 }}>
          <span style={{ fontSize: '.8rem' }}>Total de ofrendas e ingresos</span>
          <input type="number" min="0" step=".01" value={offeringTotal} onChange={e => setOfferingTotal(Number(e.target.value))} />
        </label>
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>Agregar desglose opcional</summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          <label>
            <span style={{ fontSize: '.8rem' }}>Ofrendas premisioneras</span>
            <input
              type="number"
              min="0"
              step=".01"
              value={preOfferings}
              onChange={e => { const value = Number(e.target.value); setPreOfferings(value); setOfferingTotal(value + serviceOffering + pledges + otherIncome) }}
            />
          </label>
          <label>
            <span style={{ fontSize: '.8rem' }}>Ofrenda del culto misionero</span>
            <input
              type="number"
              min="0"
              step=".01"
              value={serviceOffering}
              onChange={e => { const value = Number(e.target.value); setServiceOffering(value); setOfferingTotal(preOfferings + value + pledges + otherIncome) }}
            />
          </label>
          <label>
            <span style={{ fontSize: '.8rem' }}>Votos misioneros de hermanos</span>
            <input
              type="number"
              min="0"
              step=".01"
              value={pledges}
              onChange={e => { const value = Number(e.target.value); setPledges(value); setOfferingTotal(preOfferings + serviceOffering + value + otherIncome) }}
            />
          </label>
          <label>
            <span style={{ fontSize: '.8rem' }}>Otros ingresos autorizados</span>
            <input
              type="number"
              min="0"
              step=".01"
              value={otherIncome}
              onChange={e => { const value = Number(e.target.value); setOtherIncome(value); setOfferingTotal(preOfferings + serviceOffering + pledges + value) }}
            />
          </label>
          <label>
            <span style={{ fontSize: '.8rem' }}>Gastos relacionados</span>
            <input
              type="number"
              min="0"
              step=".01"
              value={expenses}
              onChange={e => setExpenses(Number(e.target.value))}
            />
          </label>
          <label>
            <span style={{ fontSize: '.8rem' }}>Total enviado al comité</span>
            <input
              type="number"
              min="0"
              step=".01"
              value={totalSent}
              onChange={e => setTotalSent(Number(e.target.value))}
            />
          </label>
        </div>
        </details>
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: '#edf4ec',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>Total neto reunido por la congregación:</span>
          <strong>{money(totalGathered)}</strong>
        </div>
      </section>
      </>
      )}

      {/* Fotografías (Hasta 2, optimizadas en WebP) */}
      <section style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Fotografías y evidencias ({photos.length} de 2 permitidas)</h3>
          {photos.length < 2 && (
            <label className="secondary-action" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '.8rem' }}>
              Subir fotografía
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => handleAddPhoto(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        <div className="photo-slots">
          {photos.map((p, idx) => (
            <div key={idx} className="photo-slot">
              <img src={p} alt={`Evidencia ${idx + 1}`} />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  background: '#faebe6',
                  color: '#8b291e',
                  border: 0,
                  borderRadius: 6,
                  padding: '2px 8px',
                  cursor: 'pointer'
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
          {photos.length === 0 && (
            <div className="photo-slot" style={{ gridColumn: '1 / -1' }}>
              <p style={{ margin: 0, color: '#788078', fontSize: '.85rem' }}>
                No se han adjuntado fotos todavía. Las fotos se optimizan y comprimen automáticamente a WebP.
              </p>
            </div>
          )}
        </div>
      </section>

      <label style={{ display: 'block', marginTop: 16 }}>
        <span>Comentarios u observaciones finales</span>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Detalles a tener en cuenta por el comité..."
        />
      </label>

      {error && (
        <p role="alert" className="crm-error">
          {error}
        </p>
      )}

      <div className="modal-actions" style={{ marginTop: 20 }}>
        <button type="button" className="secondary-action" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="secondary-action" onClick={() => submit('Iniciada')} disabled={busy}>
          Guardar borrador
        </button>
        <button type="button" className="primary-action" onClick={() => submit('Enviada')} disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar devolución al comité nacional'}
        </button>
      </div>
    </dialog>
  )
}

// --- Revisión y Consolidación por el Comité Nacional ---

function CommitteeReviewModal({
  assignment,
  activity,
  church,
  onUpdateStatus,
  onClose
}: {
  assignment: Row
  activity: Row
  church?: Row
  onUpdateStatus: (id: string, newStatus: string, feedback: string, confirmedReceived: boolean) => Promise<void>
  onClose: () => void
}) {
  const [feedback, setFeedback] = useState(assignment.feedback || '')
  const [busy, setBusy] = useState(false)
  const fin = assignment.financialData || {}

  const handleAction = async (status: string, confirmFunds: boolean) => {
    setBusy(true)
    try {
      await onUpdateStatus(assignment.id, status, feedback, confirmFunds)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog open className="record-dialog" style={{ zIndex: 90 }}>
      <div className="record-heading">
        <div>
          <span className="eyebrow">Revisión de Entrega</span>
          <h2>{church?.name || 'Congregación'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '.88rem', color: '#68726a' }}>
            Actividad: <strong>{activity.name}</strong> · Fecha local: {assignment.localDate || 'No informada'}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '16px 0' }}>
        <div style={{ background: '#f8faf6', padding: 12, borderRadius: 10 }}>
          <span style={{ fontSize: '.78rem', color: '#68726a' }}>Asistencia total</span>
          <p style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {assignment.attendanceCount || 0} hermanos
          </p>
          <small>{assignment.visitorsCount || 0} visitas sin ficha</small>
        </div>
        <div style={{ background: '#f8faf6', padding: 12, borderRadius: 10 }}>
          <span style={{ fontSize: '.78rem', color: '#68726a' }}>Total informado como enviado</span>
          <p style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>{money(fin.totalSent || 0)}</p>
          <small>Estado fondos: {fin.status || 'Registrado'}</small>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #d5ded3', borderRadius: 12, padding: 14, margin: '14px 0' }}>
        <h4 style={{ margin: '0 0 8px' }}>Desglose financiero enviado:</h4>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '.85rem' }}>
          <li>Ofrendas premisioneras: {money(fin.preMissionaryOfferings || 0)}</li>
          <li>Ofrenda del culto misionero: {money(fin.missionaryServiceOffering || 0)}</li>
          <li>Votos misioneros de personas: {money(fin.pledges || 0)}</li>
          <li>Otros ingresos: {money(fin.otherAuthorizedIncome || 0)}</li>
          <li>Gastos reportados: {money(fin.expenses || 0)}</li>
          <li>
            Total reunido en la iglesia: <strong>{money(fin.totalGathered || 0)}</strong>
          </li>
        </ul>
      </div>

      {assignment.description && (
        <div style={{ margin: '14px 0' }}>
          <strong>Descripción enviada por la iglesia:</strong>
          <p style={{ margin: '4px 0 0', fontSize: '.88rem' }}>{assignment.description}</p>
        </div>
      )}

      {assignment.photos?.length > 0 && (
        <div style={{ margin: '14px 0' }}>
          <strong>Fotografías y evidencias adjuntas:</strong>
          <div className="photo-slots" style={{ marginTop: 8 }}>
            {assignment.photos.map((p: string, i: number) => (
              <div key={i} className="photo-slot">
                <img src={p} alt={`Evidencia ${i + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      <label style={{ display: 'block', marginTop: 14 }}>
        <span>Observaciones o devolución del comité a la congregación</span>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Escribe comentarios u observaciones para el pastor/secretario..."
        />
      </label>

      <div className="modal-actions" style={{ marginTop: 20, flexWrap: 'wrap' }}>
        <button type="button" className="secondary-action" onClick={onClose} disabled={busy}>
          Cerrar
        </button>
        {fin.status !== 'Recibido' && fin.status !== 'Conciliado' && (
          <button
            type="button"
            className="secondary-action"
            style={{ background: '#eaf4eb', color: '#1e8b4e' }}
            disabled={busy}
            onClick={() => handleAction(assignment.status, true)}
          >
            Confirmar recepción de fondos (${fin.totalSent || 0})
          </button>
        )}
        <button
          type="button"
          className="secondary-action"
          style={{ background: '#faebe6', color: '#8b291e' }}
          disabled={busy}
          onClick={() => handleAction('Observada', false)}
        >
          Observar entrega
        </button>
        <button
          type="button"
          className="primary-action"
          disabled={busy}
          onClick={() => handleAction('Aprobada', false)}
        >
          {busy ? 'Guardando…' : 'Aprobar entrega'}
        </button>
      </div>
    </dialog>
  )
}

// --- Vista Especializada de Comités Nacionales (Lote 2: Panel Ejecutivo vs Actividades y Matriz + Asistencia Presencial/Online) ---

function CommitteeWorkspaceView({
  committeeKey,
  mode = 'panel',
  state,
  onSaveRecord,
  onOpenBreakdown
}: {
  committeeKey: string
  mode?: 'panel' | 'operativo'
  state: State
  onSaveRecord: (col: string, rec: Row) => Promise<any>
  onOpenBreakdown: (title: string, txs: Row[]) => void
}) {
  const [activeTab, setActiveTab] = useState<
    'panel' | 'actividades' | 'asignaciones' | 'asistencia' | 'lideres' | 'especifico'
  >(mode === 'operativo' ? 'actividades' : 'panel')
  const [reviewingAssignment, setReviewingAssignment] = useState<Row | null>(null)
  const [editingActivity, setEditingActivity] = useState<Row | null>(null)
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>('')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [creatingEventOpen, setCreatingEventOpen] = useState(false)
  const [eventDraft, setEventDraft] = useState({
    name: '',
    date: today(),
    time: '20:00',
    modality: 'Presencial',
    onlineLink: '',
    location: 'Sede Nacional / Zoom',
    kind: 'Reunión de comité'
  })
  const [attBusy, setAttBusy] = useState(false)
  const [attMessage, setAttMessage] = useState('')

  useEffect(() => {
    setActiveTab(mode === 'operativo' ? 'actividades' : 'panel')
  }, [mode])

  const committee = NATIONAL_COMMITTEES.find(c => c.key === committeeKey) || NATIONAL_COMMITTEES[1]
  const mainChurches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const activities = state.nationalActivities.filter(a => a.committeeKey === committeeKey)
  const assignments = state.activityAssignments.filter(aa => activities.some(a => a.id === aa.activityId))
  const leaders = state.committeeMembers.filter(cm => cm.committeeKey === committeeKey)

  // Eventos propios del comité (Presenciales y Online)
  const committeeEvents: Row[] = (state.events || [])
    .filter((e: Row) => e.committeeKey === committeeKey || (e.scope === 'committee' && !e.committeeKey))
    .sort((a: Row, b: Row) => String(b.date || '').localeCompare(String(a.date || '')))

  const currentCommitteeEvent =
    committeeEvents.find((e: Row) => e.id === selectedEventId) || committeeEvents[0] || null
  const currentEventAttendance = currentCommitteeEvent
    ? state.attendance.find(a => a.eventId === currentCommitteeEvent.id)
    : undefined

  // Finanzas del comité
  const committeeTxs = state.transactions.filter(t => t.committeeKey === committeeKey && !isTitheTransaction(t))
  const totalReceived = committeeTxs
    .filter(t => t.direction === 'Ingreso')
    .reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalOutgoing = committeeTxs
    .filter(t => t.direction === 'Egreso')
    .reduce((s, t) => s + Number(t.amount || 0), 0)

  // Asistencia acumulada de las entregas y eventos de este comité
  const totalAttendance = assignments.reduce(
    (s, a) => s + (Number(a.attendanceCount) || 0) + (Number(a.visitorsCount) || 0),
    0
  )
  const submittedAssignments = assignments.filter(a => ['Enviada', 'Aprobada', 'Corregida'].includes(a.status)).length
  const pendingAssignments = assignments.filter(a => ['Pendiente', 'Iniciada', 'Observada'].includes(a.status)).length
  const completionRate = assignments.length ? Math.round((submittedAssignments / assignments.length) * 100) : 0
  const nextDeadline = [...activities]
    .filter(a => a.deadline && !['Terminada', 'Archivada'].includes(a.status))
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0]

  // Manejo de guardado y creación de actividad con asignaciones a iglesias sin recargar la página
  const handleSaveActivity = async (draft: Row) => {
    let targetChurches = draft.targetChurches || []
    if (draft.scopeType === 'Todas las congregaciones' || !draft.targetChurches || draft.targetChurches.length === 0) {
      targetChurches = mainChurches.map(c => c.id)
    }

    const savedAct = await onSaveRecord('nationalActivities', {
      ...draft,
      committeeKey,
      targetChurches
    })

    if (savedAct && savedAct.status === 'Publicada') {
      for (const chId of targetChurches) {
        const existing = state.activityAssignments.find(aa => aa.activityId === savedAct.id && aa.churchId === chId)
        if (!existing) {
          await onSaveRecord('activityAssignments', {
            id: '',
            name: `${savedAct.name} - ${state.churches.find(c => c.id === chId)?.name || 'Congregación'}`,
            activityId: savedAct.id,
            churchId: chId,
            status: 'Pendiente',
            localDate: savedAct.dateMode === 'Fecha nacional común' ? savedAct.date : ''
          })
        }
      }
    }

    setEditingActivity(null)
  }

  const handleUpdateAssignmentStatus = async (
    id: string,
    newStatus: string,
    feedback: string,
    confirmedReceived: boolean
  ) => {
    const original = assignments.find(a => a.id === id)
    if (!original) return

    const updatedFin = { ...(original.financialData || {}) }
    if (confirmedReceived) {
      updatedFin.status = 'Recibido'
      updatedFin.totalReceived = updatedFin.totalSent

      await onSaveRecord('transactions', {
        id: '',
        name: `Recepción fondos ${original.name}`,
        churchId: original.churchId,
        date: today(),
        direction: 'Ingreso',
        category: 'Ofrenda',
        subCategory: 'Ofrenda misionera recibida',
        amount: String(updatedFin.totalSent || 0),
        activityId: original.activityId,
        committeeKey,
        financialStatus: 'Recibido'
      })
    }

    const updated = {
      ...original,
      status: newStatus,
      feedback,
      financialData: updatedFin,
      reviewedAt: new Date().toISOString()
    }
    await onSaveRecord('activityAssignments', updated)
  }

  const handleCreateCommitteeEvent = async (e: FormEvent) => {
    e.preventDefault()
    if (!eventDraft.name.trim()) return
    setAttBusy(true)
    try {
      const created = await onSaveRecord('events', {
        id: '',
        name: eventDraft.name.trim(),
        churchId: '',
        date: eventDraft.date,
        time: eventDraft.time,
        kind: eventDraft.kind,
        category: 'Reunión de comité',
        modality: eventDraft.modality,
        onlineLink: eventDraft.onlineLink,
        location: eventDraft.location,
        scope: 'committee',
        committeeKey,
        visibility: 'Comité',
        featured: 'Sí',
        showInChurchCalendars: 'Sí'
      })
      if (created?.id) setSelectedEventId(created.id)
      setCreatingEventOpen(false)
      setEventDraft({
        name: '',
        date: today(),
        time: '20:00',
        modality: 'Presencial',
        onlineLink: '',
        location: 'Sede Nacional / Zoom',
        kind: 'Reunión de comité'
      })
      setAttMessage('Evento del comité creado y listo para tomar asistencia.')
    } finally {
      setAttBusy(false)
    }
  }

  const toggleCommitteeAttendee = async (personId: string) => {
    if (!currentCommitteeEvent) return
    const prevPeople: string[] = currentEventAttendance?.people || []
    const nextPeople = prevPeople.includes(personId)
      ? prevPeople.filter(id => id !== personId)
      : [...prevPeople, personId]
    setAttBusy(true)
    try {
      await onSaveRecord('attendance', {
        id: currentEventAttendance?.id || '',
        name: `Asistencia ${currentCommitteeEvent.name}`,
        eventId: currentCommitteeEvent.id,
        people: nextPeople,
        visitors: Number(currentEventAttendance?.visitors || 0),
        visitorsByChurch: currentEventAttendance?.visitorsByChurch || {},
        onlineConfirmations:
          currentCommitteeEvent.modality === 'Online'
            ? nextPeople
            : currentEventAttendance?.onlineConfirmations || [],
        notes:
          currentEventAttendance?.notes ||
          `Asistencia ${currentCommitteeEvent.modality || 'Presencial'} registrada por congregación.`
      })
      setAttMessage('Asistencia del evento actualizada.')
    } finally {
      setAttBusy(false)
    }
  }

  const updateVisitorsForChurch = async (churchId: string, count: number) => {
    if (!currentCommitteeEvent) return
    const nextByChurch = { ...(currentEventAttendance?.visitorsByChurch || {}), [churchId]: Math.max(0, count) }
    const totalVisitors = Object.values(nextByChurch).reduce((s: number, v: any) => s + Number(v || 0), 0)
    await onSaveRecord('attendance', {
      id: currentEventAttendance?.id || '',
      name: `Asistencia ${currentCommitteeEvent.name}`,
      eventId: currentCommitteeEvent.id,
      people: currentEventAttendance?.people || [],
      visitors: totalVisitors,
      visitorsByChurch: nextByChurch,
      onlineConfirmations: currentEventAttendance?.onlineConfirmations || [],
      notes: currentEventAttendance?.notes || ''
    })
  }

  const filteredAssignments = selectedChurchFilter
    ? assignments.filter(a => a.churchId === selectedChurchFilter)
    : assignments

  return (
    <>
      <section className="committee-hero">
        <div className="committee-hero-copy">
          <span className="committee-kicker">
            {mode === 'operativo' ? 'Espacio operativo · Actividades y Matriz' : 'Panel Ejecutivo · Comité Nacional'}
          </span>
          <h2>{committee.name}</h2>
          <p>
            {mode === 'operativo'
              ? 'Crea actividades nacionales, asigna tareas a las congregaciones, revisa devoluciones y toma asistencia en eventos del comité.'
              : 'Resumen ejecutivo de atención inmediata: próximo vencimiento, respuestas por congregación y agenda del comité.'}
          </p>
          <div className="committee-hero-meta">
            <span>{activities.filter(a => a.status === 'Publicada').length} actividades activas</span>
            <span>{mainChurches.length} congregaciones</span>
            <span>{leaders.length} líderes vinculados</span>
          </div>
        </div>
        <div className="committee-hero-action">
          <span>Acción principal</span>
          <button
            className="primary-action"
            aria-label="+ Crear Actividad Nacional"
            onClick={() =>
              setEditingActivity({
                id: '',
                name: '',
                kind: 'Culto misionero',
                motto: '',
                description: '',
                committeeKey,
                scopeType: 'Todas las congregaciones',
                dateMode: 'Fecha definida por cada congregación',
                deadline: `${new Date().getFullYear()}-11-30`,
                status: 'Publicada',
                targetChurches: []
              })
            }
          >
            + Nueva actividad
          </button>
        </div>
      </section>

      {/* El Inicio del comité es solo el panel; desde ahí, un atajo abre una pestaña y se puede volver. */}
      {mode === 'panel' && activeTab !== 'panel' && (
        <button type="button" className="committee-back" onClick={() => setActiveTab('panel')}>
          ← Volver al inicio del comité
        </button>
      )}
      {(mode === 'operativo' || activeTab !== 'panel') && (
      <div className="committee-nav">
        <button
          className={`committee-nav-tab ${activeTab === 'actividades' ? 'active' : ''}`}
          onClick={() => setActiveTab('actividades')}
        >
          Actividades ({activities.length})
        </button>
        <button
          className={`committee-nav-tab ${activeTab === 'asignaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('asignaciones')}
        >
          Pedidos y respuestas ({assignments.length})
        </button>
        <button
          className={`committee-nav-tab ${activeTab === 'asistencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('asistencia')}
        >
          Asistencia ({committeeEvents.length})
        </button>
        <button
          className={`committee-nav-tab ${activeTab === 'lideres' ? 'active' : ''}`}
          onClick={() => setActiveTab('lideres')}
        >
          Líderes ({leaders.length})
        </button>
        {['jovenes', 'damas', 'musica', 'comunicaciones'].includes(committeeKey) && (
          <button
            className={`committee-nav-tab ${activeTab === 'especifico' ? 'active' : ''}`}
            onClick={() => setActiveTab('especifico')}
          >
            Herramientas de {committee.name}
          </button>
        )}
      </div>
      )}

      {activeTab === 'panel' && (
        <>
          <div className="committee-overview">
            <article className="overview-card featured">
              <div className="overview-icon">✓</div>
              <div>
                <span>Cumplimiento nacional</span>
                <strong>{completionRate}%</strong>
                <small>
                  {submittedAssignments} de {assignments.length} devoluciones recibidas
                </small>
              </div>
              <div className="progress-track">
                <i style={{ width: `${completionRate}%` }} />
              </div>
            </article>
            <article className="overview-card">
              <div className="overview-icon sand">⌛</div>
              <div>
                <span>Por completar</span>
                <strong>{pendingAssignments}</strong>
                <small>devoluciones requieren seguimiento</small>
              </div>
            </article>
            <article className="overview-card">
              <div className="overview-icon blue">◎</div>
              <div>
                <span>Asistencia reunida</span>
                <strong>{totalAttendance}</strong>
                <small>personas y visitas reportadas</small>
              </div>
            </article>
            <article
              className="overview-card money-card stat-drilldown"
              onClick={() =>
                onOpenBreakdown(
                  `Ingresos ${committee.name}`,
                  committeeTxs.filter(t => t.direction === 'Ingreso')
                )
              }
            >
              <div className="overview-icon gold">$</div>
              <div>
                <span>Fondos recibidos</span>
                <strong>{money(totalReceived)}</strong>
                <small>ver movimientos confirmados →</small>
              </div>
            </article>
          </div>

          {/* Lote 2: Estado de participación y respuesta segmentado por congregación */}
          <section className="workspace-section" style={{ marginBottom: 18 }}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Seguimiento por congregación</span>
                <h3>Estado de respuestas y asistencia por iglesia</h3>
                <p>Identifica rápidamente qué congregaciones ya respondieron y cuáles requieren acompañamiento.</p>
              </div>
              <Link to="/comites" className="secondary-action compact-btn" style={{ textDecoration: 'none' }}>
                Abrir matriz operativa →
              </Link>
            </div>
            <div className="congregation-cards-grid">
              {mainChurches.map(ch => {
                const chAssign = assignments.filter(a => a.churchId === ch.id)
                const chDone = chAssign.filter(a => ['Enviada', 'Aprobada'].includes(a.status)).length
                const chPending = chAssign.length - chDone
                const chLeader = leaders.find(l => l.churchId === ch.id)
                const leaderPerson = chLeader ? state.people.find(p => p.id === chLeader.personId) : undefined
                return (
                  <article
                    key={ch.id}
                    className="congregation-summary-card"
                    onClick={() => {
                      setSelectedChurchFilter(ch.id)
                      setActiveTab('asignaciones')
                    }}
                  >
                    <div className="congregation-card-head">
                      <div>
                        <span className="eyebrow">{ch.department || ch.city}</span>
                        <h4>{ch.name}</h4>
                      </div>
                      <span className={`status-badge ${chPending === 0 ? 'aprobada' : 'pendiente'}`}>
                        {chPending === 0 ? 'Al día' : `${chPending} pend.`}
                      </span>
                    </div>
                    <div className="congregation-card-metrics">
                      <div>
                        <span>Líder local</span>
                        <strong>{leaderPerson ? label(leaderPerson) : 'Por designar'}</strong>
                      </div>
                      <div>
                        <span>Entregas</span>
                        <strong>
                          {chDone}/{chAssign.length}
                        </strong>
                      </div>
                    </div>
                    <div className="congregation-card-footer">
                      <span>Revisar entregas de {ch.name} →</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <div className="committee-dashboard-grid">
            <section className="panel activity-overview-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Seguimiento nacional</span>
                  <h3>Actividades en curso</h3>
                </div>
                <button className="text-button" onClick={() => setActiveTab('actividades')}>
                  Ver todas →
                </button>
              </div>
              <div className="activity-card-list">
                {activities.slice(0, 4).map(a => {
                  const acts = assignments.filter(aa => aa.activityId === a.id)
                  const delivered = acts.filter(aa => ['Enviada', 'Aprobada', 'Corregida'].includes(aa.status)).length
                  const progress = acts.length ? Math.round((delivered / acts.length) * 100) : 0
                  return (
                    <button className="national-activity-card" key={a.id} onClick={() => setEditingActivity(a)}>
                      <div className="activity-card-date">
                        <strong>{a.deadline?.slice(8, 10) || '—'}</strong>
                        <span>
                          {a.deadline
                            ? new Date(`${a.deadline}T12:00:00`)
                                .toLocaleDateString('es-UY', { month: 'short' })
                                .replace('.', '')
                            : 'sin fecha'}
                        </span>
                      </div>
                      <div className="activity-card-body">
                        <div className="activity-card-top">
                          <span className="activity-type">{a.kind}</span>
                          <span className={`status-badge ${String(a.status).toLowerCase().replace(' ', '-')}`}>
                            {a.status}
                          </span>
                        </div>
                        <strong>{a.name}</strong>
                        <small>{a.motto || a.description || 'Actividad nacional del comité'}</small>
                        <div className="activity-progress-row">
                          <div className="progress-track">
                            <i style={{ width: `${progress}%` }} />
                          </div>
                          <span>
                            {delivered}/{acts.length}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
                {activities.length === 0 && (
                  <div className="friendly-empty">
                    <span>✦</span>
                    <strong>Aún no hay actividades</strong>
                    <p>Crea la primera actividad para distribuirla entre las congregaciones.</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="panel committee-side-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Próximo paso</span>
                  <h3>Atención requerida</h3>
                </div>
              </div>
              {nextDeadline ? (
                <div className="deadline-feature">
                  <span className="deadline-label">Próximo vencimiento</span>
                  <strong>{nextDeadline.name}</strong>
                  <p>
                    {new Date(`${nextDeadline.deadline}T12:00:00`).toLocaleDateString('es-UY', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('asignaciones')
                    }}
                  >
                    Revisar congregaciones
                  </button>
                </div>
              ) : (
                <div className="friendly-empty compact">
                  <span>✓</span>
                  <strong>Todo al día</strong>
                  <p>No hay vencimientos próximos.</p>
                </div>
              )}
              <div className="mini-stat-list">
                <div>
                  <span>Enviadas para revisión</span>
                  <strong>{assignments.filter(a => a.status === 'Enviada').length}</strong>
                </div>
                <div>
                  <span>Observadas</span>
                  <strong>{assignments.filter(a => a.status === 'Observada').length}</strong>
                </div>
                <div>
                  <span>Aprobadas</span>
                  <strong>{assignments.filter(a => a.status === 'Aprobada').length}</strong>
                </div>
                <div
                  className="clickable"
                  onClick={() =>
                    onOpenBreakdown(
                      `Egresos ${committee.name}`,
                      committeeTxs.filter(t => t.direction === 'Egreso')
                    )
                  }
                >
                  <span>Egresos registrados</span>
                  <strong>{money(totalOutgoing)}</strong>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <CalendarPreviewCard
                  state={state}
                  wsType="national_committee"
                  scope=""
                  committeeKey={committeeKey}
                  onCreateEvent={() => setCreatingEventOpen(true)}
                  compact
                  maxUpcoming={2}
                />
              </div>
            </aside>
          </div>
        </>
      )}

      {activeTab === 'actividades' && (
        <>
          <div className="workspace-section" style={{ marginBottom: 18 }}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Gestión operativa</span>
                <h3>Actividades publicadas por el comité</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="secondary-action compact-btn" onClick={() => setActiveTab('asistencia')}>
                  Pasar asistencia en evento del comité
                </button>
                <button type="button" className="secondary-action compact-btn" onClick={() => setActiveTab('asignaciones')}>
                  Ver matriz de entregas ({assignments.length})
                </button>
              </div>
            </div>
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Tema / Lema</th>
                    <th>Fecha límite</th>
                    <th>Cumplimiento</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(a => {
                    const actAssigns = assignments.filter(aa => aa.activityId === a.id)
                    const done = actAssigns.filter(aa => ['Enviada', 'Aprobada'].includes(aa.status)).length
                    return (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                        </td>
                        <td>{a.kind}</td>
                        <td>{a.motto || '—'}</td>
                        <td>{a.deadline}</td>
                        <td>
                          <strong>
                            {done}/{actAssigns.length}
                          </strong>{' '}
                          iglesias
                        </td>
                        <td>
                          <span className="status-badge iniciada">{a.status}</span>
                        </td>
                        <td>
                          <button onClick={() => setEditingActivity(a)}>Editar actividad</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {activities.length === 0 && <p className="empty-state">No hay actividades registradas.</p>}
            </div>
          </div>
        </>
      )}

      {activeTab === 'asignaciones' && (
        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Matriz por congregación</span>
              <h3>Asignaciones y devoluciones recibidas</h3>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                aria-label="Filtrar por congregación"
                value={selectedChurchFilter}
                onChange={e => setSelectedChurchFilter(e.target.value)}
              >
                <option value="">Todas las congregaciones</option>
                {mainChurches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Congregación</th>
                  <th>Actividad</th>
                  <th>Fecha local</th>
                  <th>Estado de entrega</th>
                  <th>Asistencia</th>
                  <th>Total económico</th>
                  <th>Fotos</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(aa => {
                  const ch = state.churches.find(c => c.id === aa.churchId)
                  const act = state.nationalActivities.find(a => a.id === aa.activityId)
                  const fin = aa.financialData || {}
                  const st = String(aa.status || 'Pendiente').toLowerCase()
                  return (
                    <tr key={aa.id}>
                      <td>
                        <strong>{ch?.name || 'Congregación'}</strong>
                      </td>
                      <td>{act?.name || 'Actividad'}</td>
                      <td>{aa.localDate || 'Por definir'}</td>
                      <td>
                        <span className={`status-badge ${st}`}>{aa.status}</span>
                      </td>
                      <td>{aa.attendanceCount ? `${aa.attendanceCount} (+${aa.visitorsCount || 0})` : '—'}</td>
                      <td>{fin.totalSent ? money(fin.totalSent) : '—'}</td>
                      <td>{aa.photos?.length ? `${aa.photos.length} foto${aa.photos.length === 1 ? '' : 's'}` : '0'}</td>
                      <td>
                        <button onClick={() => setReviewingAssignment(aa)}>Revisar entrega</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredAssignments.length === 0 && <p className="empty-state">No hay asignaciones para mostrar.</p>}
          </div>
        </div>
      )}

      {/* Lote 2: Toma de asistencia en eventos del comité (Presencial y Online identificando la congregación) */}
      {activeTab === 'asistencia' && (
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Eventos presenciales y online</span>
              <h3>Asistencia en encuentros del {committee.name} por congregación</h3>
              <p>
                Registra los participantes presentes o conectados online identificando claramente a qué congregación pertenecen.
              </p>
            </div>
            <button type="button" className="primary-action compact-btn" onClick={() => setCreatingEventOpen(true)}>
              <Plus size={15} /> Nuevo evento del comité
            </button>
          </div>

          {attMessage && (
            <p role="status" className="crm-success" style={{ marginBottom: 12 }}>
              {attMessage}
            </p>
          )}

          <div className="crm-controls" style={{ marginBottom: 16 }}>
            <label>
              <span>Seleccionar encuentro del comité</span>
              <select
                value={currentCommitteeEvent?.id || ''}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                {committeeEvents.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.date} · {ev.name} ({ev.modality || 'Presencial'})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {currentCommitteeEvent ? (
            <>
              <div className="national-kpi-strip" style={{ marginBottom: 16 }}>
                <article className="kpi-metric-card">
                  <span>Evento seleccionado</span>
                  <strong>{currentCommitteeEvent.name}</strong>
                  <small>
                    {currentCommitteeEvent.date} · {currentCommitteeEvent.time || '20:00'}
                  </small>
                </article>
                <article className="kpi-metric-card">
                  <span>Modalidad</span>
                  <strong>{currentCommitteeEvent.modality || 'Presencial'}</strong>
                  <small>{currentCommitteeEvent.onlineLink || currentCommitteeEvent.location || 'Nacional'}</small>
                </article>
                <article className="kpi-metric-card">
                  <span>Participantes registrados</span>
                  <strong>
                    {(currentEventAttendance?.people?.length || 0) + Number(currentEventAttendance?.visitors || 0)}
                  </strong>
                  <small>
                    {currentEventAttendance?.people?.length || 0} en padrón +{' '}
                    {Number(currentEventAttendance?.visitors || 0)} invitados
                  </small>
                </article>
              </div>

              <div className="congregation-cards-grid">
                {mainChurches.map(ch => {
                  const chPeople = state.people.filter(p => p.churchId === ch.id)
                  const presentIds: string[] = currentEventAttendance?.people || []
                  const chPresentCount = chPeople.filter(p => presentIds.includes(p.id)).length
                  const chVisitors = Number(currentEventAttendance?.visitorsByChurch?.[ch.id] || 0)
                  return (
                    <article key={ch.id} className="congregation-summary-card" style={{ cursor: 'default' }}>
                      <div className="congregation-card-head">
                        <div>
                          <span className="eyebrow">{ch.department || ch.city}</span>
                          <h4>{ch.name}</h4>
                        </div>
                        <span className="count-pill">{chPresentCount + chVisitors} asist.</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
                        {chPeople.map(person => {
                          const checked = presentIds.includes(person.id)
                          return (
                            <label
                              key={person.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: checked ? '#e8f4ec' : '#f8fafc',
                                border: checked ? '1px solid #2b9b35' : '1px solid #e2e8f0',
                                cursor: 'pointer',
                                fontSize: '.85rem'
                              }}
                            >
                              <span>
                                <strong>{label(person)}</strong>{' '}
                                <small style={{ color: '#64748b' }}>({person.ministryRole || 'Miembro'})</small>
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={attBusy}
                                onChange={() => toggleCommitteeAttendee(person.id)}
                              />
                            </label>
                          )
                        })}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.8rem', marginTop: 8 }}>
                        <span>Otros participantes / visitas de {ch.name}:</span>
                        <input
                          type="number"
                          min="0"
                          style={{ width: 72, padding: '4px 8px' }}
                          value={chVisitors}
                          onChange={e => updateVisitorsForChurch(ch.id, Number(e.target.value))}
                        />
                      </label>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="quiet-empty">Crea un evento del comité para registrar asistencia presencial u online.</p>
          )}

          {creatingEventOpen && (
            <dialog open className="record-dialog" style={{ zIndex: 95 }}>
              <form onSubmit={handleCreateCommitteeEvent}>
                <div className="record-heading">
                  <div>
                    <span className="eyebrow">Agenda del comité</span>
                    <h2>Nuevo encuentro del {committee.name}</h2>
                  </div>
                  <button type="button" onClick={() => setCreatingEventOpen(false)} aria-label="Cerrar">
                    ×
                  </button>
                </div>
                <div className="record-fields">
                  <label>
                    <span>Nombre del encuentro *</span>
                    <input
                      required
                      value={eventDraft.name}
                      onChange={e => setEventDraft({ ...eventDraft, name: e.target.value })}
                      placeholder="Ej. Vigilia Nacional Juvenil / Reunión Online de Líderes"
                    />
                  </label>
                  <label>
                    <span>Modalidad *</span>
                    <select
                      value={eventDraft.modality}
                      onChange={e => setEventDraft({ ...eventDraft, modality: e.target.value })}
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </label>
                  <label>
                    <span>Fecha *</span>
                    <input
                      type="date"
                      required
                      value={eventDraft.date}
                      onChange={e => setEventDraft({ ...eventDraft, date: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Hora</span>
                    <input
                      type="time"
                      value={eventDraft.time}
                      onChange={e => setEventDraft({ ...eventDraft, time: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Lugar o Sede</span>
                    <input
                      value={eventDraft.location}
                      onChange={e => setEventDraft({ ...eventDraft, location: e.target.value })}
                    />
                  </label>
                  {eventDraft.modality !== 'Presencial' && (
                    <label>
                      <span>Enlace de conexión (Zoom / Meet)</span>
                      <input
                        value={eventDraft.onlineLink}
                        onChange={e => setEventDraft({ ...eventDraft, onlineLink: e.target.value })}
                        placeholder="https://..."
                      />
                    </label>
                  )}
                </div>
                <div className="modal-actions">
                  <button type="button" className="secondary-action" onClick={() => setCreatingEventOpen(false)}>
                    Cancelar
                  </button>
                  <button className="primary-action" disabled={attBusy}>
                    Crear encuentro
                  </button>
                </div>
              </form>
            </dialog>
          )}
        </section>
      )}

      {activeTab === 'lideres' && (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Congregación</th>
                <th>Líder / Integrante</th>
                <th>¿Es líder local?</th>
                <th>Especialidad / Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map(l => {
                const p = state.people.find(person => person.id === l.personId)
                const ch = state.churches.find(c => c.id === (l.churchId || p?.churchId))
                return (
                  <tr key={l.id}>
                    <td>
                      <strong>{ch?.name || 'Nacional'}</strong>
                    </td>
                    <td>
                      <strong>{label(p)}</strong>
                    </td>
                    <td>{l.isLocalLeader || 'Sí'}</td>
                    <td>{l.roleSpecialty || 'Representante'}</td>
                    <td>
                      <span className="status-badge enviada">{l.status || 'Activo'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {leaders.length === 0 && <p className="empty-state">No hay líderes registrados para este comité.</p>}
        </div>
      )}

      {/* Módulos Especializados Autorizados */}
      {activeTab === 'especifico' && committeeKey === 'jovenes' && (
        <div>
          <h3>Módulo de Jóvenes: Cultos Misioneros y Vigilias</h3>
          <p style={{ color: '#788078', fontSize: '.85rem' }}>
            Rango de edad juvenil predeterminado: 12 a 25 años, segmentado por congregación.
          </p>
          <div className="directory-summary">
            <div>
              Jóvenes identificados{' '}
              <strong>{state.people.filter(p => personAgeCategory(p) === 'Joven').length}</strong>
            </div>
            <div>
              Líderes locales juveniles <strong>{leaders.filter(l => l.isLocalLeader === 'Sí').length}</strong>
            </div>
            <div>
              Vigilias y encuentros juveniles{' '}
              <strong>
                {
                  state.events.filter(
                    e => e.kind === 'Jóvenes' || e.kind === 'Ayuno' || (e.name || '').toLowerCase().includes('vigilia')
                  ).length
                }
              </strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'especifico' && committeeKey === 'damas' && (
        <div>
          <h3>Módulo de Damas: Programas Virtuosas, Mujeres Sabias y Rayos de Luz</h3>
          <p style={{ color: '#788078', fontSize: '.85rem' }}>
            Visualización autorizada: Nombre familiar y congregación. Privacidad familiar preservada.
          </p>
          <div className="directory-summary">
            <div>
              Damas identificadas{' '}
              <strong>
                {
                  state.people.filter(
                    p => p.gender === 'Femenino' && calculateAge(p.birthday) !== null && calculateAge(p.birthday)! >= 26
                  ).length
                }
              </strong>
            </div>
            <div>
              Familias vinculadas <strong>{state.families.length}</strong>
            </div>
            <div>
              Líderes locales de Damas <strong>{leaders.length}</strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'especifico' && committeeKey === 'musica' && (
        <div>
          <h3>Módulo de Música: Músicos, Vocalistas y Coro Nacional</h3>
          <div className="directory-summary">
            <div>
              Músicos registrados{' '}
              <strong>
                {leaders.filter(
                  l =>
                    (l.roleSpecialty || '').toLowerCase().includes('músico') ||
                    (l.roleSpecialty || '').toLowerCase().includes('pianista')
                ).length + 1}
              </strong>
            </div>
            <div>
              Vocalistas registrados{' '}
              <strong>
                {leaders.filter(
                  l =>
                    (l.roleSpecialty || '').toLowerCase().includes('vocalista') ||
                    (l.roleSpecialty || '').toLowerCase().includes('coro')
                ).length + 1}
              </strong>
            </div>
            <div>
              Capacitaciones virtuales <strong>{activities.filter(a => a.kind === 'Capacitación').length}</strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'especifico' && committeeKey === 'comunicaciones' && (
        <div>
          <h3>Módulo de Comunicaciones: Piezas Gráficas y Métricas de Redes Sociales</h3>

          <h4 style={{ marginTop: 20 }}>Solicitudes de Piezas Gráficas</h4>
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Pieza / Título</th>
                  <th>Categoría</th>
                  <th>Congregación</th>
                  <th>Fecha límite</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {state.designRequests.map(dr => (
                  <tr key={dr.id}>
                    <td>
                      <strong>{dr.name}</strong>
                    </td>
                    <td>{dr.category}</td>
                    <td>{state.churches.find(c => c.id === dr.churchId)?.name || 'Nacional'}</td>
                    <td>{dr.deadline || '—'}</td>
                    <td>
                      <span className="status-badge iniciada">{dr.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ marginTop: 24 }}>Crecimiento de Redes Sociales por Congregación</h4>
          <p style={{ color: '#788078', fontSize: '.85rem' }}>
            Crecimiento e incrementos porcentuales calculados automáticamente por el sistema.
          </p>
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Congregación</th>
                  <th>Plataforma</th>
                  <th>Seguidores Iniciales</th>
                  <th>Seguidores Actuales</th>
                  <th>Crecimiento Calculado</th>
                  <th>Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {state.socialMetrics.map(sm => {
                  const ch = state.churches.find(c => c.id === sm.churchId)
                  const init = Number(sm.initialFollowers || 0)
                  const curr = Number(sm.currentFollowers || 0)
                  const growth = curr - init
                  const pct = init > 0 ? ((growth / init) * 100).toFixed(1) : '0'
                  return (
                    <tr key={sm.id}>
                      <td>
                        <strong>{ch?.name || 'Congregación'}</strong>
                      </td>
                      <td>{sm.platform}</td>
                      <td>{init}</td>
                      <td>{curr}</td>
                      <td>
                        <strong>+{growth}</strong>
                      </td>
                      <td>
                        <span className="positive">+{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Creación / Edición de Actividad Nacional */}
      {editingActivity && (
        <dialog open className="record-dialog" style={{ zIndex: 95 }}>
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSaveActivity(editingActivity)
            }}
          >
            <div className="record-heading">
              <div>
                <span className="eyebrow">Actividad Nacional</span>
                <h2>{editingActivity.id ? 'Editar actividad' : 'Nueva actividad nacional'}</h2>
              </div>
              <button type="button" onClick={() => setEditingActivity(null)} aria-label="Cerrar">
                ×
              </button>
            </div>

            <div className="record-fields">
              <label>
                <span>Nombre de la actividad *</span>
                <input
                  required
                  type="text"
                  value={editingActivity.name || ''}
                  onChange={e => setEditingActivity({ ...editingActivity, name: e.target.value })}
                />
              </label>

              <label>
                <span>Tipo de actividad *</span>
                <select
                  value={editingActivity.kind || 'Culto misionero'}
                  onChange={e => setEditingActivity({ ...editingActivity, kind: e.target.value })}
                >
                  <option>Culto misionero</option>
                  <option>Vigilia</option>
                  <option>Capacitación</option>
                  <option>Campaña</option>
                  <option>Reunión nacional</option>
                  <option>Actividad especial</option>
                </select>
              </label>

              <label>
                <span>Tema o lema</span>
                <input
                  type="text"
                  value={editingActivity.motto || ''}
                  onChange={e => setEditingActivity({ ...editingActivity, motto: e.target.value })}
                />
              </label>

              <label>
                <span>Modalidad de fecha *</span>
                <select
                  value={editingActivity.dateMode || 'Fecha definida por cada congregación'}
                  onChange={e => setEditingActivity({ ...editingActivity, dateMode: e.target.value })}
                >
                  <option>Fecha definida por cada congregación</option>
                  <option>Fecha nacional común</option>
                </select>
              </label>

              {editingActivity.dateMode === 'Fecha nacional común' && (
                <label>
                  <span>Fecha general *</span>
                  <input
                    type="date"
                    required
                    value={editingActivity.date || ''}
                    onChange={e => setEditingActivity({ ...editingActivity, date: e.target.value })}
                  />
                </label>
              )}

              <label>
                <span>Fecha límite para enviar devolución *</span>
                <input
                  type="date"
                  required
                  value={editingActivity.deadline || ''}
                  onChange={e => setEditingActivity({ ...editingActivity, deadline: e.target.value })}
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <span>Descripción breve (máximo 500 caracteres)</span>
                <textarea
                  maxLength={500}
                  value={editingActivity.description || ''}
                  onChange={e => setEditingActivity({ ...editingActivity, description: e.target.value })}
                />
                <div className={`char-counter ${(editingActivity.description?.length || 0) > 450 ? 'limit-near' : ''}`}>
                  {editingActivity.description?.length || 0} / 500 caracteres
                </div>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <span>Instrucciones para las congregaciones</span>
                <textarea
                  value={editingActivity.instructions || ''}
                  onChange={e => setEditingActivity({ ...editingActivity, instructions: e.target.value })}
                  placeholder="Detalles sobre ofrendas, fotos requeridas o pasos a seguir..."
                />
              </label>

              <label>
                <span>Estado *</span>
                <select
                  value={editingActivity.status || 'Publicada'}
                  onChange={e => setEditingActivity({ ...editingActivity, status: e.target.value })}
                >
                  <option>Borrador</option>
                  <option>Publicada</option>
                  <option>En desarrollo</option>
                  <option>Terminada</option>
                  <option>Archivada</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4>Alcance y congregaciones asignadas:</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '8px 0' }}>
                {mainChurches.map(c => {
                  const targetList = editingActivity.targetChurches || []
                  const checked =
                    targetList.includes(c.id) || editingActivity.scopeType === 'Todas las congregaciones'
                  return (
                    <label
                      key={c.id}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          let updated: string[] = []
                          if (e.target.checked) updated = [...new Set([...targetList, c.id])]
                          else updated = targetList.filter((id: string) => id !== c.id)
                          setEditingActivity({
                            ...editingActivity,
                            scopeType: 'Congregaciones seleccionadas',
                            targetChurches: updated
                          })
                        }}
                      />
                      <span>{c.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="secondary-action" onClick={() => setEditingActivity(null)}>
                Cancelar
              </button>
              <button className="primary-action">Guardar y Distribuir Asignaciones</button>
            </div>
          </form>
        </dialog>
      )}

      {/* Modal de Revisión de Entrega */}
      {reviewingAssignment && (
        <CommitteeReviewModal
          assignment={reviewingAssignment}
          activity={activities.find(a => a.id === reviewingAssignment.activityId) || { id: '', name: 'Actividad' }}
          church={state.churches.find(c => c.id === reviewingAssignment.churchId)}
          onUpdateStatus={handleUpdateAssignmentStatus}
          onClose={() => setReviewingAssignment(null)}
        />
      )}
    </>
  )
}

// --- Componente Principal CRM ---

export default function CRM({
  currentUser,
  currentWorkspace,
  onSelectUser,
  onSelectWorkspace,
  showWorkspacePicker,
  onCloseWorkspacePicker,
  onOpenWorkspacePicker,
  onLogout
}: {
  currentUser?: any
  currentWorkspace?: any
  onSelectUser?: (u: any) => void
  onSelectWorkspace?: (ws: any) => void
  showWorkspacePicker?: boolean
  onCloseWorkspacePicker?: () => void
  onOpenWorkspacePicker?: () => void
  onLogout?: () => void
}) {
  const isDemoMode = currentUser?.username === 'demostracion_nacional'
  const location = useLocation()
  const path = location.pathname
  const navigate = useNavigate()
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<{ collection: string; row: Row } | null>(null)
  const [matcherOpen, setMatcherOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [returnFormAssignment, setReturnFormAssignment] = useState<Row | null>(null)
  const [breakdownModal, setBreakdownModal] = useState<{ title: string; txs: Row[] } | null>(null)
  const [consolidatePreaching, setConsolidatePreaching] = useState(false)
  const [savedToast, setSavedToast] = useState(0)
  useEffect(() => {
    if (!savedToast) return
    const timer = window.setTimeout(() => setSavedToast(0), 2600)
    return () => window.clearTimeout(timer)
  }, [savedToast])
  // En congregaciones y lugares de predicación, el Inicio es el Modo rápido y el menú queda siempre a mano.
  const isLocalSpace = ['church', 'preaching_place'].includes(currentWorkspace?.type)
  const quickMode = isLocalSpace && path === '/'
  useTableLabels()

  // Lote 5: Formulario de inicio de sesión moderno con mostrar/ocultar contraseña y manejo de errores
  const handledAction = useRef('')

  async function load() {
    if (isDemoMode) {
      setState(createDemoState())
      setError('')
      return
    }
    // Con base central, los datos se piden recién después de entrar con usuario y contraseña.
    if (cloudEnabled() && !currentUser) {
      setState(emptyState())
      setError('')
      return
    }
    try {
      setState(await api('state'))
      setError('')
    } catch {
      setError(
        'No se pudo abrir el almacenamiento. Abre index.html en Chrome o Edge con un perfil normal y vuelve a intentar.'
      )
    }
  }

  useEffect(() => {
    load()
  }, [isDemoMode, cloudEnabled() ? currentUser?.username : ''])
  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get('q') || '')
  }, [path, location.search])
  useEffect(() => {
    const action = new URLSearchParams(location.search).get('accion')
    if (!action) {
      handledAction.current = ''
      return
    }
    const signature = `${location.pathname}?${action || ''}`
    if (!state || !currentUser || handledAction.current === signature) return

    handledAction.current = signature
    const workspaceType = currentWorkspace?.type || 'national_admin'
    const localScope = ['church', 'preaching_place'].includes(workspaceType)
      ? resolveWorkspaceId(state.churches, currentWorkspace)
      : ''

    if (action === 'ingreso' || action === 'egreso') {
      setEditor({
        collection: 'transactions',
        row: {
          id: '',
          churchId: localScope,
          committeeKey: workspaceType === 'national_committee' ? currentWorkspace?.committeeKey || '' : '',
          direction: action === 'egreso' ? 'Egreso' : 'Ingreso',
          category: action === 'egreso' ? 'Gasto' : 'Ofrenda',
          financialStatus: 'Registrado',
          date: today()
        }
      })
    } else if (action === 'persona') {
      setEditor({ collection: 'people', row: { id: '', churchId: localScope, status: 'Amigo' } })
    } else if (action === 'evento') {
      setEditor({
        collection: 'events',
        row: {
          id: '',
          churchId: localScope,
          committeeKey: workspaceType === 'national_committee' ? currentWorkspace?.committeeKey || '' : '',
          date: today(),
          time: '19:00',
          kind: workspaceType === 'national_admin' ? 'Convención' : workspaceType === 'national_committee' ? 'Reunión' : 'Culto',
          modality: 'Presencial',
          publicVisible: 'Sí',
          featured: 'No',
          showInChurchCalendar: 'Sí',
          scopeAudience: workspaceType === 'national_admin' ? 'Nacional' : workspaceType === 'national_committee' ? 'Comité Nacional' : 'Congregación local'
        }
      })
    }

    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, state, currentUser, currentWorkspace, navigate])
  useEffect(() => {
    document.documentElement.classList.toggle('quick-mode-active', quickMode)
    return () => document.documentElement.classList.remove('quick-mode-active')
  }, [quickMode])

  async function save(collection: string, record: Row) {
    if (!state) throw new Error('La base local todavía no está disponible.')
    const recordToSave = { ...record }
    // Regla 1.4: Asignar el churchId del espacio activo al crear el registro
    // Ignorar cualquier churchId distinto enviado desde un formulario local
    if (
      activeScope &&
      [
        'people',
        'families',
        'events',
        'transactions',
        'serviceSchedules',
        'monthlyReports',
        'groups',
        'cellReports',
        'designRequests',
        'socialMetrics'
      ].includes(collection)
    ) {
      const validScope =
        state.churches.find(c => c.id === activeScope)?.id ||
        state.churches.find(c => c.name === currentWorkspace?.name)?.id ||
        state.churches.find(c => normalizeWorkspaceText(c.name) === normalizeWorkspaceText(currentWorkspace?.name))
          ?.id ||
        activeScope
      if (wsType === 'preaching_place') {
        const place = state.churches.find(c => c.id === validScope)
        const parentId = place?.parentChurchId || currentWorkspace?.parentChurchId || validScope
        const parent = state.churches.find(c => c.id === parentId)
        recordToSave.churchId = parent?.id || validScope
        recordToSave.preachingPlaceId = place?.id || validScope
      } else {
        recordToSave.churchId = validScope
      }
    }
    if (wsType === 'national_committee' && currentWorkspace?.committeeKey && collection === 'transactions') {
      recordToSave.committeeKey = currentWorkspace.committeeKey
    }
    // El espacio nacional consulta los registros locales; solo modifica el estado de recepción de informes.
    if (wsType === 'national_admin') {
      const localCollections = new Set([
        'people', 'families', 'transactions', 'serviceSchedules', 'groups', 'cellReports',
        'designRequests', 'socialMetrics', 'committeeMembers', 'attendance'
      ])
      if (localCollections.has(collection)) {
        throw new Error('Este dato se administra desde el espacio de la congregación correspondiente.')
      }
      if (collection === 'churches' && recordToSave.id) {
        throw new Error('Administración Nacional puede registrar una congregación, pero no editar su ficha local.')
      }
      const previousEvent = collection === 'events' ? state.events.find(row => row.id === recordToSave.id) : undefined
      const isLocalEvent = (row?: Row) => Boolean(row && (
        row.churchId || row.preachingPlaceId || row.scopeAudience === 'Congregación local' || row.scope === 'local'
      ))
      if (collection === 'events' && (isLocalEvent(recordToSave) || isLocalEvent(previousEvent))) {
        throw new Error('Los eventos locales se modifican desde el espacio de su congregación.')
      }
      if (collection === 'monthlyReports') {
        const previous = state.monthlyReports.find(row => row.id === recordToSave.id)
        const allowedStatuses = new Set(['Recibido', 'Revisado', 'Confirmado', 'Observado'])
        const comparable = (row: Row) => JSON.stringify(Object.fromEntries(
          Object.entries(row).filter(([key]) => !['status', 'updatedAt'].includes(key)).sort(([a], [b]) => a.localeCompare(b))
        ))
        if (!previous || !allowedStatuses.has(recordToSave.status) || comparable(previous) !== comparable(recordToSave)) {
          throw new Error('Administración Nacional solo puede actualizar el estado de recepción. El contenido lo administra la congregación.')
        }
      }
    }

    if (isDemoMode) {
      const previous = (state[collection] || []).find(row =>
        recordToSave.id ? row.id === recordToSave.id : collection === 'attendance' && row.eventId === recordToSave.eventId
      )
      const saved = {
        ...previous,
        ...recordToSave,
        id: recordToSave.id || previous?.id || `demo-edit-${collection}-${crypto.randomUUID()}`,
        createdAt: previous?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setState(current =>
        current
          ? { ...current, [collection]: [...(current[collection] || []).filter(row => row.id !== saved.id), saved] }
          : current
      )
      setSavedToast(Date.now())
      return saved
    }

    const saved = await api(`records/${collection}`, recordToSave)
    setState(current =>
      current
        ? {
            ...current,
            [collection]: [...(current[collection] || []).filter(r => r.id !== saved.id), saved]
          }
        : current
    )
    setSavedToast(Date.now())
    return saved
  }

  const savedToastNode = savedToast ? (
    <div className="saved-toast" role="status" aria-live="polite">
      <CheckCircle2 size={20} /> Guardado
    </div>
  ) : null

  if (!state) {
    return (
      <main className="people-page">
        <p role="status">{error || 'Abriendo la base de datos…'}</p>
        {error && <button onClick={load}>Reintentar</button>}
        {error && cloudEnabled() && <button onClick={onLogout}>Volver a entrar</button>}
      </main>
    )
  }

  // --- 1. Pantalla de Acceso y Bienvenida cuando no hay usuario (Lote 5) ---
  if (!currentUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand-mark">
              <img src="./logo-portal-nacional.png" alt="Logo Portal Nacional" />
            </div>
            <span className="eyebrow" style={{ display: 'block', marginTop: 6 }}>
              IEANJESÚS Uruguay · Iglesia Evangélica Apostólica del Nombre de Jesús
            </span>
            <h1>Portal Nacional</h1>
            <p>Plataforma de Gestión Congregacional, Comités Nacionales y Supervisión Ministerial</p>
          </div>

          {cloudEnabled() ? (
            <CloudLogin onSelectUser={onSelectUser} />
          ) : (
            <>
              <div className="security-disclaimer official-setup-notice">
                <strong>Versión oficial · preparación local</strong>
                <span>Empieza con una base vacía, sin personas ni perfiles de prueba. Los datos quedan en este dispositivo.</span>
                <span>Para que varias personas trabajen juntas, se conecta la base central (ver docs/puesta-en-marcha.md). Hasta entonces, cada dispositivo guarda lo suyo.</span>
              </div>
              <button
                type="button"
                className="primary-action official-setup-action"
                onClick={() => onSelectUser?.({
                  username: 'administracion_local',
                  displayName: 'Administración local',
                  spaces: [{ id: 'national-local', type: 'national_admin', name: 'Administración Nacional', role: 'Preparación local' }]
                })}
              >
                Abrir preparación local <ArrowRight size={17} />
              </button>
            </>
          )}
          <div className="demo-entry-separator"><span>o explora con datos de ejemplo</span></div>
          <div className="demo-entry-card">
            <div>
              <strong>Demostración de tres meses</strong>
              <span>Congregaciones, comité, lugar de predicación, asistencia, informes y finanzas ficticias.</span>
              <small>Es independiente de la preparación local. Los cambios se descartan al salir.</small>
            </div>
            <button
              type="button"
              className="secondary-action demo-entry-action"
              onClick={() => onSelectUser?.({
                username: 'demostracion_nacional',
                displayName: 'Administración Nacional · Demo',
                spaces: [{ id: 'demo-national-space', type: 'national_admin', name: 'Administración Nacional', role: 'Demostración · datos ficticios' }]
              })}
            >
              Ver demostración <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- 2. Modal de Selección de Espacio ("¿A qué espacio quieres ingresar?") ---
  if (showWorkspacePicker && currentUser) {
    const isLocalPreparation = currentUser.username === 'administracion_local'
    const localChurchSpaces = isLocalPreparation || isDemoMode
      ? state.churches
          .filter((church: Row) => isDemoMode || church.isPreachingPlace !== 'Sí')
          .map((church: Row) => ({
            id: church.id,
            type: church.isPreachingPlace === 'Sí' ? 'preaching_place' : 'church',
            name: church.name,
            parentChurchId: church.parentChurchId,
            role: isDemoMode ? 'Datos ficticios · tres meses de actividad' : 'Vista local de preparación · no es un acceso por usuario'
          }))
      : []
    const demoCommitteeSpaces = isDemoMode
      ? [...new Set([
          ...state.nationalActivities.map(activity => activity.committeeKey),
          ...state.committeeMembers.map(member => member.committeeKey)
        ].filter(Boolean))].map((committeeKey: string) => {
          const committee = NATIONAL_COMMITTEES.find(item => item.key === committeeKey)
          return {
            id: `demo-committee-${committeeKey}`,
            type: 'national_committee',
            committeeKey,
            name: `Comité Nacional de ${committee?.name || committeeKey}`,
            role: 'Demostración · datos ficticios'
          }
        })
      : []
    const availableSpaces = [
      ...currentUser.spaces,
      ...[...localChurchSpaces, ...demoCommitteeSpaces].filter(
        space => !currentUser.spaces.some((existing: { id: string }) => existing.id === space.id)
      )
    ]
    return (
      <div className="login-screen">
        <div className="login-card" style={{ maxWidth: 580 }}>
          <div className="login-header">
            <span className="eyebrow">Espacios de Trabajo</span>
            <h2>¿A qué espacio quieres ingresar?</h2>
            <p>{isDemoMode ? 'Elige un área para recorrer los datos de ejemplo.' : 'Elige el área que necesitas consultar en esta preparación local.'}</p>
          </div>

          <div className="demo-accounts-grid">
            {availableSpaces.map((sp: any) => (
              <button
                key={sp.id}
                type="button"
                className="demo-user-btn workspace-choice"
                onClick={() => onSelectWorkspace?.(sp)}
              >
                <div>
                  <span
                    className={`ws-badge ${
                      sp.type === 'preaching_place'
                        ? 'preaching'
                        : sp.type === 'national_committee'
                          ? 'committee'
                          : sp.type === 'national_admin'
                            ? 'admin'
                            : 'church'
                    }`}
                  >
                    {sp.type === 'preaching_place'
                      ? 'Lugar de Predicación'
                      : sp.type === 'national_committee'
                        ? 'Comité Nacional'
                        : sp.type === 'national_admin'
                          ? 'Administración'
                          : 'Congregación'}
                  </span>
                  <strong>{sp.name}</strong>
                  {sp.role && <span>{sp.role}</span>}
                </div>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>

          {isLocalPreparation && (
            <div className="workspace-picker-note" role="note">
              <strong>Importante: esto todavía no inicia sesión como otra persona.</strong>
              <span>
                La vista de congregación solo aparece después de crearla en Iglesias. Pastor, Secretaría y Tesorería
                necesitarán cuentas individuales y permisos reales; no se simulan con este selector.
              </span>
              {!localChurchSpaces.length && <span>Aún no hay congregaciones registradas en esta preparación local.</span>}
            </div>
          )}
          {isDemoMode && (
            <div className="workspace-picker-note demo-picker-note" role="note">
              <strong>Estás viendo datos ficticios de demostración.</strong>
              <span>Incluyen tres meses de actividad en congregaciones, comité nacional y lugar de predicación. Ningún cambio afecta la preparación local.</span>
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button type="button" className="secondary-action" onClick={onLogout}>
              Cerrar sesión / Cambiar usuario
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Determinar el alcance (Scope) según el Espacio de Trabajo Activo ---
  const wsType = currentWorkspace?.type || 'national_admin'
  let activeScope = ''

  if (wsType === 'church') {
    activeScope = resolveWorkspaceId(state.churches, currentWorkspace)
  } else if (wsType === 'preaching_place') {
    activeScope = resolveWorkspaceId(state.churches, currentWorkspace)
  } else if (wsType === 'national_admin') {
    activeScope = '' // Administración nacional ve todo
  }

  const collection = routes[path]

  // Tareas asignadas a la congregación actual (ordenadas de más reciente a más antigua)
  const localAssignments = state.activityAssignments
    .filter(
      aa =>
        activeScope &&
        (aa.churchId === activeScope ||
          (consolidatePreaching && currentWorkspace?.parentChurchId && aa.churchId === currentWorkspace.parentChurchId))
    )
    .sort((a, b) => {
      const actA = state.nationalActivities.find(na => na.id === a.activityId)
      const actB = state.nationalActivities.find(na => na.id === b.activityId)
      return String(actB?.deadline || '').localeCompare(String(actA?.deadline || ''))
    })

  return (
    <main className={`people-page crm${quickMode ? ' quick-mode-page' : ''}${isDemoMode ? ' demo-mode' : ''}`}>
      <div className="view-mode-strip">
        <p className="demo-note">
          {isDemoMode
            ? <><strong>Demostración activa ·</strong> datos ficticios. Los cambios desaparecen al salir.</>
            : 'Preparación local · Los cambios se guardan en este dispositivo. El acceso institucional y la base central todavía no están conectados.'}
        </p>
      </div>

      {wsType === 'preaching_place' && !quickMode && (
        <p className="preaching-banner">
          Lugar de predicación de{' '}
          <strong>{state.churches.find(c => c.id === currentWorkspace.parentChurchId)?.name || 'la congregación madre'}</strong>
        </p>
      )}

      {!quickMode && <SectionTabs path={path} wsType={wsType} />}

      {/* Cada pantalla entra con una animación corta al cambiar de sección o pestaña. */}
      <div key={path} className="page-enter">
      {quickMode ? (
        <QuickMode
          key={activeScope}
          state={state}
          scope={activeScope}
          workspaceName={currentWorkspace?.name || 'Congregación'}
          assignments={localAssignments}
          save={save}
          onOpenFullReport={() => navigate('/informes?crear=monthly')}
        />
      ) : path === '/calendario' ? (
        <CalendarModule
          state={state}
          scope={activeScope}
          wsType={wsType}
          committeeKey={wsType === 'national_committee' ? currentWorkspace?.committeeKey : undefined}
          consolidateParentId={
            consolidatePreaching && currentWorkspace?.parentChurchId ? currentWorkspace.parentChurchId : undefined
          }
          onEditEvent={row => setEditor({ collection: 'events', row })}
          canEditEvent={row => wsType !== 'national_admin' || (!row.churchId && !row.preachingPlaceId && row.scopeAudience !== 'Congregación local' && row.scope !== 'local')}
        />
      ) : path === '/comunicacion' ? (
        // Los mensajes se mandan por WhatsApp; un enlace viejo a Comunicación vuelve al Inicio.
        <Navigate to="/" replace />
      ) : path === '/comites' ? (
        wsType === 'national_committee' ? (
          <CommitteeWorkspaceView
            committeeKey={currentWorkspace.committeeKey || 'jovenes'}
            mode="operativo"
            state={state}
            onSaveRecord={save}
            onOpenBreakdown={(title, txs) => setBreakdownModal({ title, txs })}
          />
        ) : wsType === 'national_admin' ? (
          <NationalAdminCommitteesView
            state={state}
            onSaveRecord={save}
          />
        ) : (
          <LocalChurchCommitteesView
            state={state}
            scope={activeScope}
            workspaceName={currentWorkspace?.name || 'Congregación'}
            onEditGroup={row => setEditor({ collection: 'groups', row })}
            onOpenReturnForm={assignment => requestQuickFlow(`pedido:${assignment.id}`, navigate)}
          />
        )
      ) : wsType === 'national_committee' && path === '/' ? (
        <CommitteeWorkspaceView
          committeeKey={currentWorkspace.committeeKey || 'jovenes'}
          mode="panel"
          state={state}
          onSaveRecord={save}
          onOpenBreakdown={(title, txs) => setBreakdownModal({ title, txs })}
        />
      ) : collection ? (
        <>
          <Directory
            collection={collection}
            state={state}
            scope={activeScope}
            query={query}
            edit={(c, r) => setEditor({ collection: c, row: r })}
            onOpenMatcher={() => setMatcherOpen(true)}
            onImport={collection === 'people' && wsType === 'church' && activeScope ? () => setImportOpen(true) : undefined}
            committeeKey={wsType === 'national_committee' ? currentWorkspace?.committeeKey : undefined}
            readOnly={wsType === 'national_admin' && (collection === 'churches' || [
              'people', 'families', 'transactions', 'events', 'serviceSchedules', 'groups', 'cellReports',
              'designRequests', 'socialMetrics', 'committeeMembers', 'monthlyReports'
            ].includes(collection))}
            createOnly={wsType === 'national_admin' && collection === 'churches'}
            consolidateParentId={
              consolidatePreaching && currentWorkspace?.parentChurchId ? currentWorkspace.parentChurchId : undefined
            }
          />
        </>
      ) : path === '/cultos' ? (
        wsType === 'national_admin' ? (
          <section className="directory-empty-prompt national-attendance-guard">
            <CalendarDays size={22} />
            <div>
              <strong>La asistencia se registra en cada congregación</strong>
              <span>La Administración Nacional consulta la agenda y los informes recibidos, no las listas locales de personas.</span>
              <Link className="link-inline" to="/calendario">Ir al calendario <ArrowRight size={15} /></Link>
            </div>
          </section>
        ) : <Attendance state={state} scope={activeScope} save={save} />
      ) : path === '/celulas' ? (
        <CellGroupsDashboard state={state} scope={activeScope} save={save} />
      ) : path === '/configuracion' ? (
        <Configuration
          state={state}
          onRestore={clean => setState(clean)}
          allowRestore={wsType !== 'national_admin' || cloudEnabled()}
          showUsers={cloudEnabled() && wsType === 'national_admin'}
        />
      ) : path === '/informes' ? (
        <Reports
          state={
            wsType === 'national_committee'
              ? {
                  ...state,
                  transactions: state.transactions.filter(t => t.committeeKey === currentWorkspace.committeeKey),
                  nationalActivities: state.nationalActivities.filter(
                    a => a.committeeKey === currentWorkspace.committeeKey
                  ),
                  activityAssignments: state.activityAssignments.filter(a =>
                    state.nationalActivities.some(
                      n => n.id === a.activityId && n.committeeKey === currentWorkspace.committeeKey
                    )
                  )
                }
              : state
          }
          scope={activeScope}
          committeeKey={wsType === 'national_committee' ? currentWorkspace?.committeeKey : undefined}
          onOpenBreakdown={(title, txs) => setBreakdownModal({ title, txs })}
          save={save}
          canReview={wsType === 'national_admin'}
        />
      ) : path === '/tareas' ? (
        <LocalRequests state={state} assignments={localAssignments} onAnswer={id => requestQuickFlow(`pedido:${id}`, navigate)} />
      ) : (
        <OperationalHome
          state={state}
          scope={activeScope}
          workspaceName={currentWorkspace?.name || 'Administración Nacional'}
          onFinance={() => setEditor({ collection: 'transactions', row: { id: '', churchId: activeScope } })}
          onPerson={() => setEditor({ collection: 'people', row: { id: '', churchId: activeScope, status: 'Amigo' } })}
          onTask={setReturnFormAssignment}
        />
      )}
      </div>

      {importOpen && activeScope && (
        <PeopleImport
          state={state}
          scope={activeScope}
          churchName={currentWorkspace?.name || 'la congregación'}
          save={save}
          onClose={() => setImportOpen(false)}
        />
      )}

      {/* Modal Editor de Fichas Especializados y Genéricos */}
      {editor && editor.collection === 'people' ? (
        <PersonModal
          key={`people:${editor.row.id || 'new'}`}
          row={editor.row}
          state={state}
          scope={activeScope}
          workspaceName={currentWorkspace?.name}
          close={() => setEditor(null)}
          save={save}
        />
      ) : editor && editor.collection === 'transactions' ? (
        <FinanceMovementModal
          key={`transactions:${editor.row.id || 'new'}`}
          row={editor.row}
          state={state}
          scope={activeScope}
          workspaceName={wsType === 'church' ? currentWorkspace?.name : undefined}
          committeeKey={wsType === 'national_committee' ? currentWorkspace?.committeeKey : undefined}
          close={() => setEditor(null)}
          save={save}
        />
      ) : editor && editor.collection === 'events' ? (
        <EventModal
          key={`events:${editor.row.id || 'new'}`}
          row={editor.row}
          state={state}
          scope={activeScope}
          wsType={wsType}
          committeeKey={wsType === 'national_committee' ? currentWorkspace?.committeeKey : undefined}
          close={() => setEditor(null)}
          save={save}
        />
      ) : editor ? (
        <Editor
          key={`${editor.collection}:${editor.row.id || 'new'}`}
          collection={editor.collection}
          row={editor.row}
          state={state}
          scope={activeScope}
          close={() => setEditor(null)}
          save={save}
        />
      ) : null}

      {/* Modal de Deduplicación y Búsqueda de Personas */}
      {matcherOpen && (
        <PersonMatcherModal
          people={state.people}
          churches={state.churches}
          onSelectPerson={p => {
            setMatcherOpen(false)
            setEditor({ collection: 'people', row: p })
          }}
          onCreateNew={() => {
            setMatcherOpen(false)
            setEditor({ collection: 'people', row: { id: '', churchId: activeScope, status: 'Persona vinculada' } })
          }}
          onClose={() => setMatcherOpen(false)}
        />
      )}

      {/* Modal de Devolución Congregacional */}
      {returnFormAssignment && (
        <CongregationReturnForm
          assignment={returnFormAssignment}
          activity={
            state.nationalActivities.find(a => a.id === returnFormAssignment.activityId) || {
              id: '',
              name: 'Actividad Nacional',
              deadline: today(),
              dateMode: 'Fecha definida por cada congregación'
            }
          }
          state={state}
          onSaveAssignment={async updated => {
            await save('activityAssignments', updated)
            setReturnFormAssignment(null)
          }}
          onClose={() => setReturnFormAssignment(null)}
        />
      )}

      {/* Modal de Desglose Financiero al Tocar Totales */}
      {breakdownModal && (
        <FinancialBreakdownModal
          title={breakdownModal.title}
          transactions={breakdownModal.txs}
          churches={state.churches}
          onClose={() => setBreakdownModal(null)}
        />
      )}
      {savedToastNode}
    </main>
  )
}

// --- Configuración y Respaldos ---

// Con base central, la Administración Nacional también puede subir acá el respaldo de lo cargado en un dispositivo.
function Configuration({ state, onRestore, allowRestore = true, showUsers = false }: { state: State; onRestore: (cleanState: State) => void; allowRestore?: boolean; showUsers?: boolean }) {
  const [restoreDraft, setRestoreDraft] = useState<State | null>(null)
  const [restoreError, setRestoreError] = useState('')
  const [restoreSuccess, setRestoreSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), records: state }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portal-nacional-respaldo-${today()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleFile = (file?: File) => {
    if (!file) return
    setRestoreError('')
    setRestoreSuccess('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result))
        const validated = validateState(json)
        setRestoreDraft(validated)
      } catch (e) {
        setRestoreError(`Archivo no válido: ${(e as Error).message}`)
      }
    }
    reader.onerror = () => setRestoreError('No se pudo leer el archivo.')
    reader.readAsText(file)
  }

  const executeRestore = async (withPreBackup: boolean) => {
    if (!allowRestore) return
    if (!restoreDraft) return
    setBusy(true)
    setRestoreError('')
    try {
      if (withPreBackup) downloadBackup()
      const restored = await api('restore', restoreDraft)
      onRestore(restored)
      setRestoreDraft(null)
      setRestoreSuccess('¡Copia de seguridad restaurada con éxito! Todos los registros fueron validados y cargados.')
    } catch (e) {
      setRestoreError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Configuración, respaldo y restauración</h2>
      <p>
        Administra las copias de seguridad de Portal Nacional. Los respaldos incluyen todas las iglesias, actividades nacionales, asignaciones, finanzas y personas.
      </p>

      {showUsers && <UsersAdmin state={state} />}

      <div className="restore-box">
        <h3>1. Exportar copia de seguridad</h3>
        <p>Descarga un archivo JSON con todos los datos y fotografías actuales para guardarlo en un lugar seguro.</p>
        <div className="configuration-actions">
          <button className="primary-action" onClick={downloadBackup}>
            <Download size={17} /> Exportar todos los registros (JSON)
          </button>
          <button className="secondary-action" onClick={() => downloadExcelWorkbook(state)}>
            <FileSpreadsheet size={17} /> Exportar libro para Excel
          </button>
        </div>
        <small className="configuration-hint">El libro incluye pestañas de resumen, estado de resultados, patrimonio, personas, familias, asistencias, finanzas, actividades e informes.</small>
      </div>

      {!allowRestore && <p className="section-help">La restauración de una copia completa se reserva al espacio local para proteger los registros administrados por cada congregación.</p>}
      {allowRestore && <div className="restore-box">
        <h3>2. Restaurar desde archivo de respaldo</h3>
        <p>Carga un archivo de respaldo JSON previamente exportado. El sistema comprobará y validará todos los datos antes de aplicarlos.</p>

        <label style={{ display: 'inline-block', cursor: 'pointer' }}>
          <input
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <span className="secondary-action" style={{ display: 'inline-flex', padding: '10px 16px' }}>
            Seleccionar archivo de respaldo (.json)
          </span>
        </label>

        {restoreError && <p role="alert" className="crm-error" style={{ marginTop: 14 }}>{restoreError}</p>}
        {restoreSuccess && <p role="status" className="crm-success" style={{ marginTop: 14 }}>{restoreSuccess}</p>}

        {restoreDraft && (
          <div style={{ marginTop: 18, borderTop: '1px solid #e1e6dd', paddingTop: 16 }}>
            <h4>Registros encontrados en el archivo:</h4>
            <div className="restore-summary">
              <div className="restore-summary-item"><strong>{restoreDraft.churches?.length || 0}</strong><span>Iglesias</span></div>
              <div className="restore-summary-item"><strong>{restoreDraft.people?.length || 0}</strong><span>Personas</span></div>
              <div className="restore-summary-item"><strong>{restoreDraft.events?.length || 0}</strong><span>Cultos</span></div>
              <div className="restore-summary-item"><strong>{restoreDraft.nationalActivities?.length || 0}</strong><span>Actividades nac.</span></div>
              <div className="restore-summary-item"><strong>{restoreDraft.activityAssignments?.length || 0}</strong><span>Asignaciones</span></div>
              <div className="restore-summary-item"><strong>{restoreDraft.transactions?.length || 0}</strong><span>Finanzas</span></div>
            </div>

            <p style={{ color: '#8a291c', fontWeight: 600, fontSize: '.9rem' }}>
              {cloudEnabled()
                ? 'Los registros del archivo se suben a la base central. Si un registro ya existe, se actualiza; no se borra nada.'
                : 'Advertencia: La restauración reemplazará los registros actuales por los contenidos en este archivo.'}
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-action"
                disabled={busy}
                onClick={() => executeRestore(true)}
              >
                {busy ? 'Restaurando…' : 'Descargar respaldo actual y Restaurar'}
              </button>
              <button
                type="button"
                className="secondary-action"
                disabled={busy}
                onClick={() => executeRestore(false)}
              >
                Restaurar sin respaldo previo
              </button>
              <button
                type="button"
                className="secondary-action"
                disabled={busy}
                onClick={() => setRestoreDraft(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>}
    </>
  )
}

