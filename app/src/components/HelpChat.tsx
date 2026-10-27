import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { QUICK_FLOW_EVENT } from './QuickMode'

type HelpMessage = {
  id: number
  role: 'assistant' | 'user'
  text: string
  destination?: string
  action?: string
  flow?: string
}

const contactNumber = '59899882240'

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

const isQuickMode = () => document.documentElement.classList.contains('quick-mode-active')

// Preguntas listas para tocar en el Modo r\u00e1pido.
const QUICK_QUESTIONS = [
  '\u00bfC\u00f3mo paso la lista?',
  '\u00bfC\u00f3mo anoto un diezmo u ofrenda?',
  '\u00bfC\u00f3mo anoto un gasto?',
  '\u00bfC\u00f3mo agrego a una persona nueva?',
  '\u00bfC\u00f3mo env\u00edo el informe del mes?',
  'Ver el tutorial otra vez'
]

// Respuestas con palabras simples, pensadas para la pantalla del Modo r\u00e1pido.
function quickAnswerFor(question: string) {
  const q = normalize(question)
  if (/tutorial|como se usa|explica|no entiendo|perdi/.test(q)) {
    return { text: 'Te muestro de nuevo c\u00f3mo se usa, paso a paso.', flow: 'tutorial', action: 'Ver el tutorial' }
  }
  if (/asisten|lista|presentes|falto|falta|ausente|vino/.test(q)) {
    return { text: 'Toc\u00e1 \u00abPasar lista\u00bb, eleg\u00ed el culto y toc\u00e1 el nombre de cada persona que vino. Las visitas se suman con el bot\u00f3n +. Al final toc\u00e1 \u00abListo\u00bb.', flow: 'attendance', action: 'Pasar lista ahora' }
  }
  if (/gasto|egreso|compra|pagar|pago|luz|agua|alquiler|salio/.test(q)) {
    return { text: 'Toc\u00e1 \u00abAnotar dinero\u00bb y despu\u00e9s \u00abSali\u00f3 plata\u00bb. Escrib\u00ed cu\u00e1nto, eleg\u00ed en qu\u00e9 se gast\u00f3 (Luz, Agua\u2026) y toc\u00e1 \u00abGuardar\u00bb. Si ten\u00e9s el recibo, le pod\u00e9s sacar una foto.', flow: 'money', action: 'Anotar un gasto ahora' }
  }
  if (/diezmo|ofrenda|ingreso|dinero|plata|donacion|entro/.test(q)) {
    return { text: 'Toc\u00e1 \u00abAnotar dinero\u00bb y despu\u00e9s \u00abEntr\u00f3 plata\u00bb. Escrib\u00ed cu\u00e1nto y eleg\u00ed de qu\u00e9 es (Diezmos, Ofrenda\u2026). Revis\u00e1s y toc\u00e1s \u00abGuardar\u00bb. Los diezmos se anotan todos juntos, sin nombres.', flow: 'money', action: 'Anotar dinero ahora' }
  }
  if (/persona|miembro|hermano|visita|amigo|nuevo|nueva|agrego/.test(q)) {
    return { text: 'Toc\u00e1 \u00abAnotar persona nueva\u00bb, eleg\u00ed si nos visita o es de la iglesia, escrib\u00ed el nombre y toc\u00e1 \u00abGuardar\u00bb. Si ya estaba anotada, el sistema te avisa.', flow: 'person', action: 'Anotar una persona ahora' }
  }
  if (/informe|reporte|resumen|mes/.test(q)) {
    return { text: 'Toc\u00e1 \u00abInforme del mes\u00bb. Se abre el editor del informe: los n\u00fameros ya vienen completos con lo que anotaste. Agreg\u00e1 las actividades del mes, revis\u00e1 y toc\u00e1 \u00abEnviar informe\u00bb.', flow: 'report', action: 'Abrir el informe' }
  }
  if (/evento|actividad|calendario|ayuno|vigilia|reunion|culto especial/.test(q)) {
    return { text: 'Toc\u00e1 \u00abCalendario\u00bb y despu\u00e9s \u00abAnotar una actividad\u00bb. Eleg\u00ed qu\u00e9 es, el d\u00eda y la hora, y toc\u00e1 \u00abGuardar actividad\u00bb.', flow: 'calendar', action: 'Abrir el calendario' }
  }
  return {
    text: 'Contame con palabras simples qu\u00e9 quer\u00e9s hacer, por ejemplo \u00abpasar lista\u00bb o \u00abanotar una ofrenda\u00bb. Tambi\u00e9n pod\u00e9s tocar una de las preguntas de abajo, o escribirnos por WhatsApp.',
    flow: undefined,
    action: undefined
  }
}

function answerFor(question: string) {
  const q = normalize(question)
  if (/asisten|pasar lista|lista de|presentes|falto|falta|ausente|culto/.test(q)) {
    return {
      text: 'Para pasar asistencia, abre Cultos y asistencia, elige el encuentro y marca a quienes están presentes. Quien no vino queda sin marcar. Revisa el total y guarda la lista.',
      destination: '/cultos', action: 'Ir a Cultos y asistencia'
    }
  }
  if (/diezmo|ofrenda|ingreso|recibir dinero|donacion/.test(q)) {
    return {
      text: 'En Finanzas elige Nuevo movimiento y luego Ingreso. Completa el concepto, el monto y la fecha; antes de guardar, confirma que el movimiento corresponde a la congregación correcta.',
      destination: '/finanzas?accion=ingreso', action: 'Registrar un ingreso'
    }
  }
  if (/gasto|egreso|compra|pagar|pago/.test(q)) {
    return {
      text: 'En Finanzas elige Nuevo movimiento y luego Egreso. Agrega el concepto, la descripción y el importe. Comprueba los datos antes de guardar.',
      destination: '/finanzas?accion=egreso', action: 'Registrar un gasto'
    }
  }
  if (/evento|actividad|calendario|ayuno|devocional|evangelismo|campamento|convencion/.test(q)) {
    return {
      text: 'En Calendario puedes revisar la agenda y crear un evento. Completa nombre, fecha, modalidad y lugar; los eventos online también pueden incluir el enlace de reunión.',
      destination: '/calendario', action: 'Abrir Calendario'
    }
  }
  if (/comite|joven|juvenil|damas|caballero|misiones|musica|dominical/.test(q)) {
    return {
      text: 'En Comités encontrarás las actividades y el seguimiento según el espacio seleccionado. Si buscas el comité juvenil, escribe “jóvenes” en el buscador de arriba para ver accesos relacionados.',
      destination: '/comites', action: 'Abrir Comités'
    }
  }
  if (/persona|miembro|hermano|familia|visitante|amigo|nino|adulto/.test(q)) {
    return {
      text: 'Las fichas se administran desde Personas y familias. Usa el buscador para revisar si la persona ya existe; si no aparece, selecciona Agregar persona y completa su ficha.',
      destination: '/personas', action: 'Abrir Personas y familias'
    }
  }
  if (/celula|grupo de amistad/.test(q)) {
    return {
      text: 'Las células y grupos de amistad se consultan en Células. En Administración Nacional primero elige una congregación para ver su información local.',
      destination: '/celulas', action: 'Abrir Células'
    }
  }
  if (/informe|reporte|resumen/.test(q)) {
    return {
      text: 'En Informes puedes preparar el período, revisar el resumen y consultar el detalle por congregación. Selecciona primero la congregación cuando el sistema te lo solicite.',
      destination: '/informes', action: 'Abrir Informes'
    }
  }
  if (/chat|mensaje|comunicacion|contactar/.test(q)) {
    return {
      text: 'La sección Comunicación contiene los canales del espacio activo. Para hablar directamente con una persona, usa el botón “Hablar por WhatsApp” que aparece abajo.',
      destination: '/comunicacion', action: 'Abrir Comunicación'
    }
  }
  if (/cuenta|usuario|contrasena|clave|acceso|entrar|perfil/.test(q)) {
    return {
      text: 'Esta copia está en preparación local: todavía no tiene cuentas individuales conectadas para Pastor, Secretaría y Tesorería. El selector de espacios cambia la vista local, pero no autentica a otra persona. Si necesitas ayuda con el acceso, puedes escribir por WhatsApp.',
      destination: '/configuracion', action: 'Ver Configuración'
    }
  }
  if (/tarea|entrega|pendiente/.test(q)) {
    return {
      text: 'Abre Tareas para revisar asignaciones, fechas límite y devoluciones pendientes. En un espacio de comité también puedes entrar a Actividades y matriz para ver su seguimiento.',
      destination: '/tareas', action: 'Abrir Tareas'
    }
  }
  return {
    text: 'Puedo orientarte con asistencia, personas, finanzas, calendario, comités, células, tareas e informes. Escribe qué quieres hacer, por ejemplo: “pasar lista” o “registrar una ofrenda”. Si prefieres, te comunico por WhatsApp con una persona.',
    destination: undefined,
    action: undefined
  }
}

export function HelpChat({ workspaceName = 'Portal Nacional' }: { workspaceName?: string }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [quick, setQuick] = useState(isQuickMode)
  const [showQuestions, setShowQuestions] = useState(true)
  const messagesRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<HelpMessage[]>([
    { id: 1, role: 'assistant', text: `¡Dios te bendiga! Soy la guía rápida del Portal. Tocá una de las preguntas de abajo o escribí qué necesitás hacer.` }
  ])
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, open, showQuestions])
  const openPanel = () => {
    setQuick(isQuickMode())
    setOpen(value => !value)
  }
  const runAction = (message: HelpMessage) => {
    setOpen(false)
    if (message.flow && isQuickMode()) window.dispatchEvent(new CustomEvent(QUICK_FLOW_EVENT, { detail: message.flow }))
    else if (message.destination) navigate(message.destination)
  }
  const navigate = useNavigate()
  const whatsappUrl = useMemo(() => {
    const question = lastQuestion || 'Hola, necesito ayuda con el Portal Nacional.'
    const message = `Hola, necesito ayuda con el Portal Nacional.\nEspacio: ${workspaceName}\nConsulta: ${question}`
    return `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`
  }, [lastQuestion, workspaceName])

  const ask = (question: string) => {
    const cleaned = question.trim()
    if (!cleaned) return
    const reply = isQuickMode() ? quickAnswerFor(cleaned) : answerFor(cleaned)
    setLastQuestion(cleaned)
    setMessages(current => [
      ...current,
      { id: Date.now(), role: 'user', text: cleaned },
      { id: Date.now() + 1, role: 'assistant', ...reply }
    ])
    setDraft('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    ask(draft)
  }

  return (
    <div className={`help-chat${open ? ' is-open' : ''}`}>
      {open && (
        <section className="help-chat-panel" aria-label="Asistente de ayuda">
          <header className="help-chat-header">
            <span className="help-chat-avatar"><Bot size={20} /></span>
            <div><strong>Ayuda del Portal</strong><small><Sparkles size={12} /> Guía rápida</small></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar ayuda"><X size={19} /></button>
          </header>
          <div className="help-chat-context">Estás en {workspaceName}</div>
          <div className="help-chat-messages" aria-live="polite" ref={messagesRef}>
            {messages.map(message => (
              <article key={message.id} className={`help-chat-message ${message.role}`}>
                <p>{message.text}</p>
                {(message.destination || message.flow) && message.action && (
                  <button type="button" onClick={() => runAction(message)}>
                    {message.action}<ArrowRight size={14} />
                  </button>
                )}
              </article>
            ))}
          </div>
          {quick ? (
            showQuestions ? (
              <div className="help-chat-questions" aria-label="Preguntas frecuentes">
                {QUICK_QUESTIONS.map(question => (
                  <button key={question} type="button" onClick={() => { ask(question); setShowQuestions(false) }}>{question}<ArrowRight size={14} /></button>
                ))}
              </div>
            ) : (
              <div className="help-chat-questions">
                <button type="button" className="help-chat-more" onClick={() => setShowQuestions(true)}>Ver otras preguntas</button>
              </div>
            )
          ) : (
            <div className="help-chat-shortcuts" aria-label="Consultas frecuentes">
              {['Pasar lista', 'Registrar un ingreso', 'Crear un evento'].map(question => (
                <button key={question} type="button" onClick={() => ask(question)}>{question}</button>
              ))}
            </div>
          )}
          <form className="help-chat-compose" onSubmit={handleSubmit}>
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Escribe tu consulta…"
              aria-label="Escribe tu consulta"
            />
            <button type="submit" disabled={!draft.trim()} aria-label="Enviar consulta"><Send size={17} /></button>
          </form>
          <footer className="help-chat-footer">
            <a href={whatsappUrl} target="_blank" rel="noreferrer noopener">
              <MessageCircle size={15} /> Hablar por WhatsApp
            </a>
            <small>Se abrirá WhatsApp con la consulta lista para que la envíes.</small>
          </footer>
        </section>
      )}
      <button
        type="button"
        className="help-chat-launcher"
        aria-label={open ? 'Cerrar ayuda rápida' : 'Abrir ayuda rápida'}
        aria-expanded={open}
        onClick={openPanel}
      >
        {open ? <X size={22} /> : <><MessageCircle size={21} /><span>¿Necesitas ayuda?</span></>}
      </button>
    </div>
  )
}
