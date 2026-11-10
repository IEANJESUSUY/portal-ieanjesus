import { useMemo, useState } from 'react'
import { CheckCircle2, Download, MessageCircle, SkipForward, X } from 'lucide-react'
import { label, type Row } from '../utils'
import { whatsappLink, whatsappNumber } from '../whatsapp'

const TEMPLATES = [
  { name: 'Saludo', text: 'Hola {nombre}, Dios te bendiga. ' },
  { name: 'Invitación al culto', text: 'Hola {nombre}, te esperamos este domingo en el culto. ¡Dios te bendiga!' },
  { name: 'Te extrañamos', text: 'Hola {nombre}, te extrañamos en los cultos. ¿Cómo estás? Estamos orando por vos.' },
  { name: 'Cumpleaños', text: '¡Feliz cumpleaños, {nombre}! Que Dios te bendiga mucho en este nuevo año.' }
]

const personalize = (text: string, person: Row) => text.replaceAll('{nombre}', person.name || '')

// Archivo de contactos (.vcf) para guardarlos en el celular y armar una lista de difusión en WhatsApp.
function downloadContacts(people: Row[], churchName: string) {
  const cards = people.map(p => [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${p.surname || ''};${p.name || ''};;;`,
    `FN:${label(p)}`,
    `TEL;TYPE=CELL:+${whatsappNumber(p.phone)}`,
    `NOTE:${churchName}`,
    'END:VCARD'
  ].join('\r\n'))
  const blob = new Blob([cards.join('\r\n')], { type: 'text/vcard' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hermanos-${churchName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.vcf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Mensaje a varios por WhatsApp: se escribe una vez, se personaliza con el nombre y se envía uno por uno
// (WhatsApp no permite que una app mande a muchos de golpe sin su servicio pago).
export function BulkWhatsApp({ people, churchName, filterName, onClose }: { people: Row[]; churchName: string; filterName: string; onClose: () => void }) {
  const withPhone = useMemo(() => people.filter(p => whatsappNumber(p.phone)), [people])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState(TEMPLATES[0].text)
  const [sending, setSending] = useState(false)
  const [index, setIndex] = useState(0)
  const [sent, setSent] = useState(0)
  const chosen = withPhone.filter(p => !excluded.has(p.id))
  const current = chosen[index]
  const finished = sending && index >= chosen.length

  return (
    <div className="people-import-backdrop" role="dialog" aria-modal="true" aria-label="Mensaje por WhatsApp">
      <section className="people-import bulk-wa">
        <header>
          <div>
            <span className="eyebrow">{churchName} · {filterName}</span>
            <h2>Mensaje por WhatsApp</h2>
          </div>
          <button type="button" className="people-import-close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
        </header>

        {!sending ? (
          <>
            <p className="bulk-wa-count">
              <b>{chosen.length}</b> {chosen.length === 1 ? 'persona' : 'personas'} con celular
              {people.length > withPhone.length && ` · ${people.length - withPhone.length} sin celular cargado`}
            </p>
            <div className="bulk-wa-templates" role="group" aria-label="Mensajes de ejemplo">
              {TEMPLATES.map(t => (
                <button key={t.name} type="button" className={message === t.text ? 'active' : ''} onClick={() => setMessage(t.text)}>{t.name}</button>
              ))}
            </div>
            <label className="bulk-wa-message">
              <span>Mensaje ({'{nombre}'} se cambia por el nombre de cada uno)</span>
              <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} />
            </label>
            {chosen[0] && <p className="bulk-wa-preview"><b>Así le llega a {chosen[0].name}:</b> {personalize(message, chosen[0])}</p>}
            <details className="bulk-wa-list">
              <summary>Ver a quiénes ({chosen.length})</summary>
              {withPhone.map(p => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={!excluded.has(p.id)}
                    onChange={e => setExcluded(set => {
                      const next = new Set(set)
                      if (e.target.checked) next.delete(p.id)
                      else next.add(p.id)
                      return next
                    })}
                  />
                  <span>{label(p)}</span>
                </label>
              ))}
            </details>
            <div className="people-import-actions">
              <button type="button" className="secondary-action" disabled={!chosen.length} onClick={() => downloadContacts(chosen, churchName)}>
                <Download size={17} /> Guardar contactos en el celular
              </button>
              <button type="button" className="primary-action" disabled={!chosen.length || !message.trim()} onClick={() => { setSending(true); setIndex(0); setSent(0) }}>
                <MessageCircle size={17} /> Empezar a enviar
              </button>
            </div>
            <small className="bulk-wa-help">
              «Guardar contactos» descarga a todos en un archivo: abrilo en el celular, se guardan, y en WhatsApp podés armar una
              lista de difusión para mandar a todos de una vez.
            </small>
          </>
        ) : finished ? (
          <div className="people-import-done">
            <CheckCircle2 size={44} />
            <strong>¡Listo! Abriste el mensaje para {sent} {sent === 1 ? 'persona' : 'personas'}.</strong>
            <p>Si alguno no se envió, tocá «Volver» y empezá de nuevo desde esa persona.</p>
            <button type="button" className="primary-action" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <div className="bulk-wa-step">
            <div className="bulk-wa-progress" aria-label={`${index + 1} de ${chosen.length}`}>
              <i style={{ width: `${(index / chosen.length) * 100}%` }} />
            </div>
            <span className="eyebrow">{index + 1} de {chosen.length}</span>
            <h3>{label(current)}</h3>
            <p className="bulk-wa-preview">{personalize(message, current)}</p>
            <a
              className="primary-action bulk-wa-open"
              href={whatsappLink(current.phone, personalize(message, current))}
              target="_blank"
              rel="noreferrer"
              onClick={() => { setSent(n => n + 1); setIndex(i => i + 1) }}
            >
              <MessageCircle size={18} /> Abrir WhatsApp de {current.name}
            </a>
            <p className="bulk-wa-help">Se abre WhatsApp con el mensaje escrito: tocá enviar y volvé acá para el siguiente.</p>
            <div className="people-import-actions">
              <button type="button" className="secondary-action" onClick={() => setSending(false)}>Volver</button>
              <button type="button" className="secondary-action" onClick={() => setIndex(i => i + 1)}><SkipForward size={16} /> Saltar a {chosen[index + 1]?.name || 'terminar'}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
