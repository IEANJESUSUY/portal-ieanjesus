import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './workspace.css'
import './official-polish.css'
import './quick-mode.css'
import './mobile-readable.css'
import './report-official.css'
import './national.css'
import './motion.css'

// Solo la versión web (la que trae manifest) se instala como aplicación y funciona sin señal.
if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => undefined) })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter><App /></HashRouter>
  </StrictMode>,
)
