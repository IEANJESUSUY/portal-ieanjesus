import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  MessageSquare,
  Network,
  Plus,
  Sparkles,
  UsersRound
} from 'lucide-react'
import { LOCAL_COMMITTEES, NATIONAL_COMMITTEES } from '../../shared/catalog.mjs'
import { whatsappLink } from '../whatsapp'

type Row = { id: string; [key: string]: any }
type State = Record<string, Row[]>

const todayStr = () => new Date().toLocaleDateString('sv-SE')
const money = (n: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(n)
const label = (r?: Row) => (r ? [r.name, r.surname].filter(Boolean).join(' ') : '—')

export function NationalAdminCommitteesView({
  state,
  onSaveRecord
}: {
  state: State
  onSaveRecord: (col: string, rec: Row) => Promise<any>
}) {
  const location = useLocation()
  const requestedCommitteeKey = new URLSearchParams(location.search).get('comite') || ''
  const [selectedCommitteeKey, setSelectedCommitteeKey] = useState<string>(() =>
    NATIONAL_COMMITTEES.some((committee: any) => committee.key === requestedCommitteeKey)
      ? requestedCommitteeKey
      : 'Todos'
  )
  const [selectedChurchId, setSelectedChurchId] = useState<string>('Todas')
  const [creatingTask, setCreatingTask] = useState<Row | null>(null)
  const [reviewingAssignment, setReviewingAssignment] = useState<Row | null>(null)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('comite') || ''
    if (NATIONAL_COMMITTEES.some((committee: any) => committee.key === requested)) setSelectedCommitteeKey(requested)
  }, [location.search])

  const churches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const activities = state.nationalActivities || []
  const assignments = state.activityAssignments || []

  const filteredActivities = activities.filter(
    a => selectedCommitteeKey === 'Todos' || a.committeeKey === selectedCommitteeKey
  )
  const filteredAssignments = assignments.filter(aa => {
    const act = activities.find(a => a.id === aa.activityId)
    const cKey = aa.committeeKey || act?.committeeKey || ''
    if (selectedCommitteeKey !== 'Todos' && cKey !== selectedCommitteeKey) return false
    if (selectedChurchId !== 'Todas' && aa.churchId !== selectedChurchId) return false
    return true
  })

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault()
    if (!creatingTask) return
    setBusy(true)
    try {
      const targetChurches: string[] =
        creatingTask.targetChurches?.length > 0
          ? creatingTask.targetChurches
          : churches.map(c => c.id)

      const taskText = [creatingTask.name, creatingTask.objective, creatingTask.instructions].filter(Boolean).join(' ').toLocaleLowerCase()
      const asksAttendance = /asistencia|asistentes|pasar lista|culto|encuentro|evento|reunión|reunion/.test(taskText)
      const asksOffering = /ofrenda|ofrendas|aporte|ingreso|monto/.test(taskText)
      const savedAct = await onSaveRecord('nationalActivities', {
        id: creatingTask.id || '',
        name: creatingTask.name,
        committeeKey: creatingTask.committeeKey || 'jovenes',
        kind: creatingTask.kind || 'Actividad especial',
        modality: creatingTask.modality || 'Presencial',
        onlineUrl: creatingTask.onlineUrl || '',
        scope: 'Por congregación',
        startDate: creatingTask.startDate || todayStr(),
        endDate: creatingTask.endDate || creatingTask.deadline || todayStr(),
        deadline: creatingTask.deadline || todayStr(),
        objective: creatingTask.objective || creatingTask.description || '',
        instructions: creatingTask.instructions || '',
        requiresAttendance: asksAttendance ? 'Sí' : 'No',
        requiresOffering: asksOffering ? 'Sí' : 'No',
        requiresReport: 'Sí',
        requiresPhotos: 'No',
        status: 'Publicada',
        createdBy: 'admin_nacional'
      })

      for (const chId of targetChurches) {
        const exists = assignments.find(aa => aa.activityId === savedAct.id && aa.churchId === chId)
        if (!exists) {
          await onSaveRecord('activityAssignments', {
            id: '',
            activityId: savedAct.id,
            churchId: chId,
            committeeKey: savedAct.committeeKey || creatingTask.committeeKey || 'jovenes',
            status: 'Pendiente',
            attendanceCount: 0,
            visitorsCount: 0,
            offeringAmount: 0,
            reportSummary: '',
            achievementNotes: '',
            difficulties: '',
            photos: []
          })
        }
      }
      setCreatingTask(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleReviewAction(assignment: Row, nextStatus: string) {
    setBusy(true)
    try {
      await onSaveRecord('activityAssignments', {
        ...assignment,
        status: nextStatus,
        reviewNotes: feedback || assignment.reviewNotes || '',
        reviewedBy: 'Administración Nacional',
        reviewedAt: new Date().toISOString()
      })
      setReviewingAssignment(null)
      setFeedback('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="committees-national-module">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Coordinación Ministerial Nacional</span>
          <h2>Comités Nacionales y Tareas</h2>
          <p>
            Gestión de comités nacionales, asignación de tareas a congregaciones y seguimiento de devoluciones.
          </p>
        </div>
        <div className="committee-page-actions">
          <button
            type="button"
            className="primary-action"
            onClick={() =>
              setCreatingTask({
                id: '',
                name: '',
                committeeKey: selectedCommitteeKey === 'Todos' ? 'jovenes' : selectedCommitteeKey,
                kind: 'Culto misionero',
                modality: 'Presencial',
                deadline: todayStr(),
                instructions: '',
                objective: '',
                targetChurches: churches.map(c => c.id)
              })
            }
          >
            <Plus size={17} /> Nueva actividad nacional
          </button>
        </div>
      </div>

      {/* Nivel 1: Tarjetas de Comités Nacionales */}
      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Estructura Nacional</span>
            <h3>Comités Nacionales ({NATIONAL_COMMITTEES.length})</h3>
          </div>
          {selectedCommitteeKey !== 'Todos' && (
            <button type="button" className="text-button" onClick={() => setSelectedCommitteeKey('Todos')}>
              Ver todos los comités
            </button>
          )}
        </div>

        <div className="congregation-cards-grid">
          {NATIONAL_COMMITTEES.map((com: any) => {
            const comActs = activities.filter(a => a.committeeKey === com.key)
            const comLeaders = (state.committeeMembers || []).filter(m => m.committeeKey === com.key && m.status !== 'Inactivo')
            const isSelected = selectedCommitteeKey === com.key

            return (
              <article
                key={com.key}
                className={`congregation-summary-card national-committee-card${isSelected ? ' selected' : ''}`}
              >
                <div className="congregation-card-head">
                  <div>
                    <span className="eyebrow">{com.Area}</span>
                    <h4>{com.name}</h4>
                  </div>
                  <span className="count-pill">{comActs.length} act.</span>
                </div>
                <p className="national-committee-summary">
                  <UsersRound size={16} aria-hidden="true" />
                  <span>{comLeaders.length} {comLeaders.length === 1 ? 'líder vinculado' : 'líderes vinculados'}</span>
                </p>
                <div className="congregation-card-footer">
                  <button
                    type="button"
                    className="committee-card-open"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCommitteeKey(prev => (prev === com.key ? 'Todos' : com.key))}
                  >
                    {isSelected ? 'Mostrando seguimiento' : 'Ver actividades'} <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Nivel 2:Resumen de cumplimiento de tareas por Congregación */}
      <section className="workspace-section" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Segmentación por congregación</span>
            <h3>Estado de tareas nacionales por congregación</h3>
          </div>
          {selectedChurchId !== 'Todas' && (
            <button type="button" className="text-button" onClick={() => setSelectedChurchId('Todas')}>
              Ver todas las congregaciones
            </button>
          )}
        </div>
        <div className="congregation-cards-grid compact">
          {churches.map(ch => {
            const chAssigns = assignments.filter(aa => {
              const act = activities.find(a => a.id === aa.activityId)
              const cKey = aa.committeeKey || act?.committeeKey || ''
              return aa.churchId === ch.id && (selectedCommitteeKey === 'Todos' || cKey === selectedCommitteeKey)
            })
            const delivered = chAssigns.filter(a =>
              ['Enviada', 'Completado', 'Confirmado', 'Aprobada'].includes(a.status)
            ).length
            const overdue = chAssigns.filter(a => {
              const act = activities.find(x => x.id === a.activityId)
              return (
                act?.deadline &&
                act.deadline < todayStr() &&
                !['Enviada', 'Completado', 'Confirmado', 'Aprobada'].includes(a.status)
              )
            }).length
            const active = selectedChurchId === ch.id
            return (
              <button
                type="button"
                key={ch.id}
                className={`congregation-summary-card button-card${active ? ' selected' : ''}`}
                onClick={() => setSelectedChurchId(prev => (prev === ch.id ? 'Todas' : ch.id))}
              >
                <div className="congregation-card-head">
                  <strong>{ch.name}</strong>
                  <span className="count-pill">
                    {delivered}/{chAssigns.length} al día
                  </span>
                </div>
                <small style={{ color: '#5c7288' }}>
                  Pastor: {ch.pastor || 'Sin asignar'} · {overdue > 0 ? `${overdue} con atraso` : 'Sin atrasos'}
                </small>
              </button>
            )
          })}
        </div>
      </section>

      {/* Nivel 3: Matriz detallada de tareas, entregas y evidencias */}
      <section className="workspace-section" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Trazabilidad y Respuestas</span>
            <h3>Seguimiento de tareas asignadas ({filteredAssignments.length})</h3>
          </div>
        </div>
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Tarea / Actividad</th>
                <th>Comité Nacional</th>
                <th>Congregación destinataria</th>
                <th>Fecha límite</th>
                <th>Estado</th>
                <th>Asistencia / Ofrenda</th>
                <th>Respuesta / Evidencia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map(aa => {
                const act = activities.find(a => a.id === aa.activityId)
                const cKey = aa.committeeKey || act?.committeeKey || ''
                const com = NATIONAL_COMMITTEES.find((c: any) => c.key === cKey)
                const ch = state.churches.find(c => c.id === aa.churchId)
                const isLate =
                  act?.deadline &&
                  act.deadline < todayStr() &&
                  !['Enviada', 'Completado', 'Confirmado', 'Aprobada'].includes(aa.status)
                return (
                  <tr key={aa.id}>
                    <td>
                      <strong>{act?.name || aa.name || 'Tarea nacional'}</strong>
                      {act?.modality === 'Online' && <small style={{ display: 'block', color: '#0284c7' }}>Online</small>}
                    </td>
                    <td>{com?.name || cKey || 'Nacional'}</td>
                    <td>
                      <strong>{ch?.name || 'Congregación'}</strong>
                    </td>
                    <td>
                      {act?.deadline || '—'}
                      {isLate && (
                        <span className="status-badge observada" style={{ marginLeft: 6 }}>
                          Atrasada
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${String(aa.status || 'Pendiente').toLowerCase()}`}>
                        {aa.status || 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      {aa.attendanceCount || aa.visitorsCount
                        ? `${Number(aa.attendanceCount || 0) + Number(aa.visitorsCount || 0)} asist.`
                        : '—'}
                      {aa.offeringAmount || aa.financialData?.totalSent
                        ? ` · ${money(Number(aa.offeringAmount || aa.financialData?.totalSent || 0))}`
                        : ''}
                    </td>
                    <td>
                      {aa.reportSummary || aa.description || 'Sin respuesta aún'}
                      {aa.photos?.length > 0 && (
                        <small style={{ display: 'block', color: '#0b63ce' }}>
                          {aa.photos.length} foto(s) adjunta(s)
                        </small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingAssignment(aa)
                            setFeedback(aa.reviewNotes || aa.feedback || '')
                          }}
                        >
                          Revisar
                        </button>
                        {(() => {
                          const ch = state.churches.find(c => c.id === aa.churchId)
                          const href = whatsappLink(ch?.phone, `Hola, Dios le bendiga. Le escribimos por el pedido "${act?.name || 'del comité'}".`)
                          return href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="secondary-action compact-btn whatsapp-action">
                              <MessageSquare size={15} /> WhatsApp
                            </a>
                          ) : null
                        })()}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredAssignments.length === 0 && (
            <p className="empty-state">No hay tareas asignadas con estos filtros.</p>
          )}
        </div>
      </section>

      {/* Modal para asignar nueva tarea nacional */}
      {creatingTask && (
        <dialog open className="record-dialog" onCancel={() => setCreatingTask(null)}>
          <form onSubmit={handleCreateTask}>
            <div className="record-heading">
              <div>
                <span className="eyebrow">Administración Nacional</span>
                <h2>Asignar tarea o actividad nacional</h2>
              </div>
              <button type="button" onClick={() => setCreatingTask(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="record-fields">
              <label>
                <span>Título de la tarea o actividad *</span>
                <input
                  required
                  value={creatingTask.name || ''}
                  onChange={e => setCreatingTask({ ...creatingTask, name: e.target.value })}
                />
              </label>
              <label>
                <span>Comité Nacional responsable *</span>
                <select
                  value={creatingTask.committeeKey || 'jovenes'}
                  onChange={e => setCreatingTask({ ...creatingTask, committeeKey: e.target.value })}
                >
                  {NATIONAL_COMMITTEES.map((c: any) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tipo de actividad</span>
                <select
                  value={creatingTask.kind || 'Culto misionero'}
                  onChange={e => setCreatingTask({ ...creatingTask, kind: e.target.value })}
                >
                  <option>Culto misionero</option>
                  <option>Vigilia</option>
                  <option>Capacitación</option>
                  <option>Campaña</option>
                  <option>Conferencia</option>
                  <option>Actividad especial</option>
                </select>
              </label>
              <label>
                <span>Fecha límite de entrega *</span>
                <input
                  type="date"
                  required
                  value={creatingTask.deadline || ''}
                  onChange={e => setCreatingTask({ ...creatingTask, deadline: e.target.value })}
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span>Mensaje para las congregaciones</span>
                <textarea
                  rows={4}
                  value={creatingTask.instructions || ''}
                  placeholder="Dios les bendiga, hermanos. Por favor envíennos el informe del culto premisionero y del culto misionero, con asistencia y ofrenda."
                  onChange={e => setCreatingTask({ ...creatingTask, instructions: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-action" onClick={() => setCreatingTask(null)}>
                Cancelar
              </button>
              <button type="submit" className="primary-action" disabled={busy}>
                {busy ? 'Asignando…' : 'Asignar a congregaciones'}
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Modal de revisión de entrega desde Administración Nacional */}
      {reviewingAssignment && (
        <dialog open className="record-dialog" onCancel={() => setReviewingAssignment(null)}>
          <div className="record-heading">
            <div>
              <span className="eyebrow">Revisión de Tarea Nacional</span>
              <h2>{state.churches.find(c => c.id === reviewingAssignment.churchId)?.name || 'Congregación'}</h2>
            </div>
            <button type="button" onClick={() => setReviewingAssignment(null)} aria-label="Cerrar">
              ×
            </button>
          </div>
          <div className="record-fields">
            <div className="field-readonly-tag">
              <span>Estado actual</span>
              <strong>{reviewingAssignment.status}</strong>
            </div>
            <div className="field-readonly-tag">
              <span>Asistencia informada</span>
              <strong>
                {Number(reviewingAssignment.attendanceCount || 0)} hermanos +{' '}
                {Number(reviewingAssignment.visitorsCount || 0)} visitas
              </strong>
            </div>
            <div className="field-readonly-tag">
              <span>Fecha en que se hizo</span>
              <strong>{reviewingAssignment.localDate ? reviewingAssignment.localDate.split('-').reverse().join('/') : 'Sin fecha'}</strong>
            </div>
            <div className="field-readonly-tag">
              <span>Ofrenda informada</span>
              <strong>{money(Number(reviewingAssignment.financialData?.reportedOfferingTotal || 0))}</strong>
            </div>
            {reviewingAssignment.description && (
              <div className="field-readonly-tag" style={{ gridColumn: '1 / -1' }}>
                <span>Lo que contó la congregación</span>
                <strong style={{ fontWeight: 400, whiteSpace: 'pre-wrap' }}>{reviewingAssignment.description}</strong>
              </div>
            )}
            {reviewingAssignment.photos?.length > 0 && (
              <div className="request-review-photos" style={{ gridColumn: '1 / -1' }}>
                {reviewingAssignment.photos.map((photo: string, i: number) => (
                  <img key={i} src={photo} alt={`Foto ${i + 1} enviada por la congregación`} />
                ))}
              </div>
            )}
            <label style={{ gridColumn: '1 / -1' }}>
              <span>Devolución / Observación para la congregación</span>
              <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={() => setReviewingAssignment(null)}>
              Cerrar
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={busy}
              onClick={() => handleReviewAction(reviewingAssignment, 'Observada')}
            >
              Observar entrega
            </button>
            <button
              type="button"
              className="primary-action"
              disabled={busy}
              onClick={() => handleReviewAction(reviewingAssignment, 'Confirmado')}
            >
              Confirmar y aprobar
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}

export function LocalChurchCommitteesView({
  state,
  scope,
  workspaceName,
  onEditGroup,
  onOpenReturnForm
}: {
  state: State
  scope: string
  workspaceName: string
  onEditGroup: (row: Row) => void
  onOpenReturnForm: (assignment: Row) => void
}) {
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('')

  // Lote 3: Separar claramente comités locales de células. Las células NUNCA aparecen aquí.
  const localCommittees = (state.groups || []).filter(
    g => g.kind !== 'Célula' && (!scope || g.churchId === scope)
  )
  const selectedGroup = localCommittees.find(g => g.id === selectedCommitteeId)

  return (
    <div className="local-committees-module">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Ministerios de {workspaceName}</span>
          <h2>Comités Locales</h2>
          <p>
            Estructura ministerial local vinculada a los Comités Nacionales. Las células se gestionan por separado en{' '}
            <Link to="/celulas">Células y grupos de amistad</Link>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/celulas" className="secondary-action" style={{ textDecoration: 'none' }}>
            <Network size={16} /> Ir a Células
          </Link>
          <button
            type="button"
            className="primary-action"
            aria-label="Nuevo registro"
            onClick={() =>
              onEditGroup({
                id: '',
                name: '',
                kind: 'Comité local',
                churchId: scope,
                committeeKey: 'jovenes'
              })
            }
          >
            <Plus size={17} /> Nuevo comité local
          </button>
        </div>
      </div>

      {/* Distinción clara de niveles */}
      <div className="hierarchy-explainer-strip">
        <div>
          <strong>Comité Local</strong>
          <span>Equipo de hermanos que sirve dentro de {workspaceName}.</span>
        </div>
        <div>
          <strong>Comité Nacional equivalente</strong>
          <span>Recibe las entregas, informes y ofrendas misioneras de este comité local.</span>
        </div>
        <div>
          <strong>Células</strong>
          <span>Grupos pequeños en hogares (separados de los comités locales).</span>
        </div>
      </div>

      {/* Tarjetas segmentadas por comité local */}
      <div className="congregation-cards-grid" style={{ marginTop: 16 }}>
        {localCommittees.map(com => {
          const natCom = NATIONAL_COMMITTEES.find((nc: any) => nc.key === com.committeeKey)
          const leader = state.people.find(p => p.id === com.leaderId)
          const associatedMembers = Array.from(new Set([
            ...(com.members || []).map((id: string) => state.people.find(p => p.id === id)),
            ...(state.committeeMembers || [])
              .filter(cm => cm.churchId === scope && cm.committeeKey === com.committeeKey && cm.status !== 'Inactivo')
              .map(cm => state.people.find(p => p.id === cm.personId))
          ].filter(Boolean).map(person => label(person as Row))))
          const isSelected = selectedCommitteeId === com.id

          return (
            <article
              key={com.id}
              className={`congregation-summary-card${isSelected ? ' selected' : ''}`}
              onClick={() => setSelectedCommitteeId(prev => (prev === com.id ? '' : com.id))}
            >
              <div className="congregation-card-head">
                <div>
                  <span className="eyebrow">
                    Vinculado a: {natCom ? natCom.name : 'Ministerio Local'}
                  </span>
                  <h4>{com.name}</h4>
                </div>
                <span className="count-pill">{com.kind}</span>
              </div>
              <div className="local-committee-people">
                <p><span>Responsable</span><strong>{leader ? label(leader) : 'Por asignar'}</strong></p>
                <p><span>Integrantes · {associatedMembers.length}</span><strong>{associatedMembers.length ? associatedMembers.join(' · ') : 'Sin integrantes vinculados'}</strong></p>
              </div>
              <div className="congregation-card-footer">
                <span>{isSelected ? 'Ocultar detalle' : 'Abrir actividades, integrantes y entregas →'}</span>
                <button
                  type="button"
                  className="secondary-action compact-btn"
                  onClick={e => {
                    e.stopPropagation()
                    onEditGroup(com)
                  }}
                >
                  Editar ficha
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {/* Panel de detalle al abrir un comité local */}
      {selectedGroup && (() => {
        const cKey = selectedGroup.committeeKey || ''
        const natCom = NATIONAL_COMMITTEES.find((nc: any) => nc.key === cKey)
        const leader = state.people.find(p => p.id === selectedGroup.leaderId)
        const linkedMembers = (state.committeeMembers || []).filter(
          cm => cm.churchId === scope && cKey && cm.committeeKey === cKey
        )
        const comEvents = (state.events || []).filter(
          e => e.churchId === scope && cKey && e.committeeKey === cKey
        )
        const comAssignments = (state.activityAssignments || []).filter(aa => {
          const act = state.nationalActivities.find(a => a.id === aa.activityId)
          return aa.churchId === scope && (aa.committeeKey === cKey || act?.committeeKey === cKey)
        })
        const comTxs = (state.transactions || []).filter(
          t => t.churchId === scope && !/diezmo/i.test([t.category, t.name, t.description, t.subCategory].filter(Boolean).join(' ')) &&
            ((cKey && t.committeeKey === cKey) || t.groupId === selectedGroup.id)
        )

        return (
          <section className="workspace-section committee-detail-drawer" style={{ marginTop: 20 }}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  Detalle del Comité Local · Equivalente Nacional: {natCom?.name || 'General'}
                </span>
                <h3>{selectedGroup.name}</h3>
                <p>{selectedGroup.notes || 'Gestión integral de integrantes, actividades, asistencia, finanzas y entregas.'}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="secondary-action" onClick={() => onEditGroup(selectedGroup)}>
                  Editar comité
                </button>
              </div>
            </div>

            <div className="home-columns" style={{ marginTop: 14 }}>
              <div className="workspace-section">
                <h4>
                  <UsersRound size={17} /> Responsable e integrantes
                </h4>
                <p style={{ fontSize: '.86rem' }}>
                  <strong>Líder local:</strong> {leader ? label(leader) : 'Sin asignar'}
                </p>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: '.86rem' }}>
                  {linkedMembers.map(m => {
                    const p = state.people.find(person => person.id === m.personId)
                    return (
                      <li key={m.id}>
                        <strong>{label(p)}</strong> — {m.roleSpecialty || 'Integrante'}
                      </li>
                    )
                  })}
                  {linkedMembers.length === 0 && <li>Usa «Editar comité» para agregar más integrantes locales.</li>}
                </ul>
              </div>

              <div className="workspace-section">
                <h4>
                  <ClipboardCheck size={17} /> Tareas y devoluciones al Comité Nacional ({comAssignments.length})
                </h4>
                {comAssignments.map(aa => {
                  const act = state.nationalActivities.find(a => a.id === aa.activityId)
                  return (
                    <div key={aa.id} className="work-row" style={{ marginTop: 8 }}>
                      <div>
                        <strong>{act?.name || aa.name}</strong>
                        <small>
                          Estado: {aa.status} · Vence: {act?.deadline || 'Sin fecha'}
                        </small>
                      </div>
                      <button type="button" className="secondary-action compact-btn" onClick={() => onOpenReturnForm(aa)}>
                        {aa.status === 'Pendiente' ? 'Completar devolución' : 'Ver / actualizar'}
                      </button>
                    </div>
                  )
                })}
                {comAssignments.length === 0 && (
                  <p className="quiet-empty">No hay tareas nacionales pendientes para este comité.</p>
                )}
              </div>

              <div className="workspace-section">
                <h4>
                  <CalendarDays size={17} /> Encuentros y asistencia del comité ({comEvents.length})
                </h4>
                {comEvents.map(ev => {
                  const att = state.attendance.find(a => a.eventId === ev.id)
                  return (
                    <div key={ev.id} className="work-row" style={{ marginTop: 8 }}>
                      <div>
                        <strong>{ev.name}</strong>
                        <small>
                          {ev.date} · {ev.time || ''} ·{' '}
                          {att ? `${att.people.length + Number(att.visitors || 0)} asistentes` : 'Lista pendiente'}
                        </small>
                      </div>
                      <Link to="/cultos" className="secondary-action compact-btn" style={{ textDecoration: 'none' }}>
                        Asistencia
                      </Link>
                    </div>
                  )
                })}
                {comEvents.length === 0 && (
                  <p className="quiet-empty">Programa un encuentro de este comité en el Calendario.</p>
                )}
              </div>

              <div className="workspace-section">
                <h4>
                  <CircleDollarSign size={17} /> Finanzas del comité ({comTxs.length})
                </h4>
                {comTxs.map(t => (
                  <div key={t.id} className="movement-row" style={{ marginTop: 8 }}>
                    <div>
                      <strong>{t.name}</strong>
                      <small>
                        {t.date} · {t.direction}
                      </small>
                    </div>
                    <strong>{money(Number(t.amount || 0))}</strong>
                  </div>
                ))}
                {comTxs.length === 0 && (
                  <p className="quiet-empty">Sin movimientos asociados directamente a este comité local.</p>
                )}
              </div>
            </div>
          </section>
        )
      })()}
    </div>
  )
}
