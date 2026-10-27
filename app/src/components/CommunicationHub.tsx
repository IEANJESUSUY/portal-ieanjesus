import { FormEvent, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Building2, MessageSquare, Network, Send, Sparkles, UsersRound } from 'lucide-react'
import { NATIONAL_COMMITTEES } from '../../shared/catalog.mjs'

type Row = { id: string; [key: string]: any }
type State = Record<string, Row[]>

export function CommunicationHub({
  state,
  wsType,
  scope,
  committeeKey,
  userDisplayName,
  workspaceName,
  save
}: {
  state: State
  wsType: string
  scope: string
  committeeKey?: string
  userDisplayName: string
  workspaceName: string
  save: (c: string, r: Row) => Promise<any>
}) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initialChannel =
    params.get('canal') ||
    (wsType === 'national_committee' && committeeKey
      ? `comite:${committeeKey}`
      : scope
      ? `iglesia:${scope}`
      : 'nacional:general')

  const [selectedChannel, setSelectedChannel] = useState(initialChannel)
  const [subject, setSubject] = useState(params.get('asunto') || '')
  const [body, setBody] = useState('')
  const [targetChurchId, setTargetChurchId] = useState(scope || params.get('churchId') || '')
  const [targetCommitteeKey, setTargetCommitteeKey] = useState(committeeKey || params.get('committeeKey') || '')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const ch = p.get('canal')
    const as = p.get('asunto')
    if (ch) setSelectedChannel(ch)
    if (as) setSubject(as)
  }, [location.search])

  const churches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const channels = [
    {
      id: 'nacional:general',
      label: 'Canal General Nacional',
      subtitle: 'Avisos oficiales y coordinación entre Administración, Comités y Congregaciones',
      group: 'Nacional'
    },
    ...NATIONAL_COMMITTEES.map((com: any) => ({
      id: `comite:${com.key}`,
      label: `Comité: ${com.name}`,
      subtitle: `Canal del comité nacional (${com.Area || 'Ministerial'})`,
      group: 'Comités Nacionales',
      committeeKey: com.key
    })),
    ...churches.map(ch => ({
      id: `iglesia:${ch.id}`,
      label: ch.name,
      subtitle: `Pastor/Responsable: ${ch.pastor || 'Liderazgo local'}`,
      group: 'Congregaciones',
      churchId: ch.id
    }))
  ]

  // Filtrar canales relevantes según el rol activo sin aislar la comunicación con Administración Nacional
  const visibleChannels = channels.filter(ch => {
    if (wsType === 'national_admin') return true
    if (wsType === 'national_committee') {
      return ch.id === 'nacional:general' || ch.id === `comite:${committeeKey}` || ch.group === 'Congregaciones'
    }
    return ch.id === 'nacional:general' || ch.id === `iglesia:${scope}` || ch.group === 'Comités Nacionales'
  })

  const activeChannelObj = visibleChannels.find(c => c.id === selectedChannel) || visibleChannels[0]
  const allMessages = [...(state.messages || [])].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  )

  const channelMessages = allMessages.filter(msg => {
    if (selectedChannel === 'nacional:general') return msg.channel === 'nacional:general' || (!msg.committeeKey && !msg.churchId)
    if (selectedChannel.startsWith('comite:')) {
      const cKey = selectedChannel.replace('comite:', '')
      return msg.channel === selectedChannel || msg.committeeKey === cKey
    }
    if (selectedChannel.startsWith('iglesia:')) {
      const chId = selectedChannel.replace('iglesia:', '')
      return msg.channel === selectedChannel || msg.churchId === chId
    }
    return msg.channel === selectedChannel
  })

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    setFeedback('')
    try {
      const derivedChurchId = selectedChannel.startsWith('iglesia:')
        ? selectedChannel.replace('iglesia:', '')
        : scope || targetChurchId || ''
      const derivedCommitteeKey = selectedChannel.startsWith('comite:')
        ? selectedChannel.replace('comite:', '')
        : committeeKey || targetCommitteeKey || ''

      await save('messages', {
        id: '',
        channel: selectedChannel,
        senderRole:
          wsType === 'national_admin'
            ? 'national_admin'
            : wsType === 'national_committee'
            ? 'national_committee'
            : 'church_leadership',
        senderName: `${userDisplayName} (${workspaceName})`,
        churchId: derivedChurchId,
        committeeKey: derivedCommitteeKey,
        subject: subject.trim() || activeChannelObj?.label || 'Mensaje directo',
        body: body.trim(),
        contextType: params.get('contextType') || 'general',
        contextId: params.get('contextId') || '',
        readBy: userDisplayName
      })
      setBody('')
      setFeedback('Mensaje enviado.')
    } catch (err) {
      setFeedback((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="communication-hub">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Comunicación Institucional Conectada</span>
          <h2>Comunicación y Mensajería</h2>
          <p>Canal directo entre Administración Nacional, Comités Nacionales y Congregaciones.</p>
        </div>
      </div>

      <div className="communication-layout">
        {/* Lista de canales por ámbito */}
        <aside className="communication-channels-panel" aria-label="Canales de comunicación">
          <div className="channel-group">
            <span className="eyebrow">Canales por ámbito</span>
            <div className="channel-list">
              {visibleChannels.map(ch => {
                const count = allMessages.filter(m =>
                  ch.id === 'nacional:general'
                    ? m.channel === 'nacional:general'
                    : ch.id.startsWith('comite:')
                    ? m.channel === ch.id || m.committeeKey === ch.id.replace('comite:', '')
                    : m.channel === ch.id || m.churchId === ch.id.replace('iglesia:', '')
                ).length
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`channel-item${selectedChannel === ch.id ? ' active' : ''}`}
                    onClick={() => setSelectedChannel(ch.id)}
                  >
                    <span className="channel-icon">
                      {ch.group === 'Nacional' ? (
                        <Sparkles size={16} />
                      ) : ch.group === 'Comités Nacionales' ? (
                        <Network size={16} />
                      ) : (
                        <Building2 size={16} />
                      )}
                    </span>
                    <div className="channel-copy">
                      <strong>{ch.label}</strong>
                      <small>{ch.group}</small>
                    </div>
                    {count > 0 && <span className="count-pill">{count}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Conversación activa y formulario de respuesta */}
        <section className="communication-chat-panel" aria-label="Conversación activa">
          <header className="chat-header">
            <div>
              <span className="eyebrow">{activeChannelObj?.group || 'Canal activo'}</span>
              <h3>{activeChannelObj?.label}</h3>
              <p>{activeChannelObj?.subtitle}</p>
            </div>
          </header>

          <div className="chat-messages-stream">
            {channelMessages.length > 0 ? (
              channelMessages.map(msg => {
                const isOwn = (msg.senderName || '').includes(userDisplayName)
                const churchName = msg.churchId ? state.churches.find(c => c.id === msg.churchId)?.name : ''
                const comName = msg.committeeKey
                  ? NATIONAL_COMMITTEES.find((c: any) => c.key === msg.committeeKey)?.name
                  : ''
                return (
                  <article key={msg.id} className={`chat-bubble-card${isOwn ? ' own' : ''}`}>
                    <div className="chat-bubble-head">
                      <strong>{msg.senderName || 'Usuario'}</strong>
                      <div className="chat-bubble-tags">
                        {comName && <span className="committee-pill">{comName}</span>}
                        {churchName && <span className="cat-tag">{churchName}</span>}
                        <small>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleDateString('es-UY', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Reciente'}
                        </small>
                      </div>
                    </div>
                    {msg.subject && <div className="chat-bubble-subject">{msg.subject}</div>}
                    <p className="chat-bubble-body">{msg.body}</p>
                  </article>
                )
              })
            ) : (
              <div className="friendly-empty">
                <MessageSquare size={28} />
                <strong>Inicia la conversación en este canal</strong>
                <p>Escribe un mensaje abajo para comunicarte con este comité o congregación.</p>
              </div>
            )}
          </div>

          <form className="chat-compose-form" onSubmit={handleSend}>
            <div className="chat-compose-meta">
              <label>
                <span>Asunto o referencia (opcional)</span>
                <input
                  type="text"
                  placeholder="Ej. Consulta sobre entrega de actividad, informe mensual..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </label>
              {!scope && !selectedChannel.startsWith('iglesia:') && (
                <label>
                  <span>Vincular a congregación (opcional)</span>
                  <select value={targetChurchId} onChange={e => setTargetChurchId(e.target.value)}>
                    <option value="">General / Todas</option>
                    {churches.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="chat-compose-row">
              <textarea
                rows={2}
                required
                aria-label="Escribir mensaje"
                placeholder="Escribe tu mensaje o respuesta para este canal..."
                value={body}
                onChange={e => setBody(e.target.value)}
              />
              <button type="submit" className="primary-action" disabled={busy || !body.trim()}>
                <Send size={17} /> {busy ? 'Enviando…' : 'Enviar mensaje'}
              </button>
            </div>
            {feedback && (
              <p role="status" className="crm-success" style={{ marginTop: 8 }}>
                {feedback}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}
