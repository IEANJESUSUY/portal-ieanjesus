import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

const DISMISS_KEY = 'pn_install_dismissed'

// Invita a instalar el Portal en el celular, como una aplicación con su ícono.
// En Android aparece el botón "Instalar"; en iPhone se explica cómo agregarlo desde Compartir.
export function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  const [ios, setIos] = useState(false)
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    const installed = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone
    if (installed || !document.querySelector('link[rel="manifest"]')) return
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent))
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    setHidden(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* sin almacenamiento, vuelve a aparecer la próxima vez */ }
  }

  if (hidden || (!prompt && !ios)) return null
  return (
    <aside className="install-prompt" role="region" aria-label="Instalar el Portal">
      <img src="./icon-192.png" alt="" />
      <div>
        <strong>Instalá el Portal en tu celular</strong>
        {prompt ? (
          <span>Queda con su ícono, como una aplicación.</span>
        ) : (
          <span>Tocá <Share size={14} aria-label="Compartir" /> y después «Agregar a inicio».</span>
        )}
      </div>
      {prompt && (
        <button
          type="button"
          className="primary-action"
          onClick={async () => {
            prompt.prompt()
            await prompt.userChoice.catch(() => undefined)
            setPrompt(null)
            dismiss()
          }}
        >
          <Download size={16} /> Instalar
        </button>
      )}
      <button type="button" className="install-prompt-close" aria-label="Ahora no" onClick={dismiss}>
        <X size={18} />
      </button>
    </aside>
  )
}
