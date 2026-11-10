import { useEffect, useState, useSyncExternalStore } from 'react'
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react'
import { cloudEnabled, flushOutbox, outboxState, subscribeOutbox } from '../cloud'

// Aviso de "sin señal": cuántos cambios quedaron en el celular esperando para enviarse.
export function OfflineBanner() {
  const { pending, sending, offline, failed } = useSyncExternalStore(subscribeOutbox, outboxState)
  const [sentAll, setSentAll] = useState(false)
  const [lastPending, setLastPending] = useState(0)

  // Cuando se terminan de enviar, se muestra un momento "Todo enviado".
  useEffect(() => {
    if (lastPending > 0 && pending === 0 && !sending) {
      setSentAll(true)
      const timer = window.setTimeout(() => setSentAll(false), 3500)
      return () => window.clearTimeout(timer)
    }
    setLastPending(pending)
  }, [pending, sending])

  if (!cloudEnabled()) return null
  if (sentAll) return <div className="offline-banner ok" role="status"><CheckCircle2 size={18} /> Volvió la señal: todo enviado.</div>
  if (!pending && !offline && !failed) return null
  return (
    <div className={`offline-banner${failed ? ' error' : ''}`} role="status">
      {failed ? <span>{failed}</span> : (
        <>
          <CloudOff size={18} />
          <span>
            {offline ? 'Sin señal. ' : ''}
            {pending
              ? `${pending} ${pending === 1 ? 'cambio guardado' : 'cambios guardados'} en este celular: se ${pending === 1 ? 'envía solo' : 'envían solos'} cuando vuelva la señal.`
              : 'Podés seguir anotando: se guarda en el celular.'}
          </span>
          {pending > 0 && (
            <button type="button" onClick={() => void flushOutbox()} disabled={sending}>
              <RefreshCw size={15} /> {sending ? 'Enviando…' : 'Enviar ahora'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
