// Versión para publicar en internet (GitHub Pages u otro hosting) e instalar como aplicación.
// Toma la base central de las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
// (archivo .env o secretos de GitHub). Sin ellas, la versión web guarda en cada dispositivo.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { buildSingleHtml, root } from './build-single.mjs'

// PORTAL_OUT permite compilar en otra carpeta (lo usan las pruebas automáticas).
const out = process.env.PORTAL_OUT || `${root}dist-web`
const head = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<meta name="theme-color" content="#243b70">',
  '<meta name="description" content="Portal Nacional de IEANJESÚS Uruguay: personas, cultos, dinero, informes y comités.">',
  '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
  '<link rel="apple-touch-icon" href="icon-192.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Portal IEANJESÚS">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">'
].join('')

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(`${root}public`, out, { recursive: true })
writeFileSync(`${out}/index.html`, await buildSingleHtml({ inlineLogo: false, head }))
// GitHub Pages no debe procesar los archivos con Jekyll.
writeFileSync(`${out}/.nojekyll`, '')
const cloud = process.env.VITE_SUPABASE_URL ? 'conectada a la base central' : 'sin base central (guarda en cada dispositivo)'
console.log(`Listo: ${process.env.PORTAL_OUT ? out : 'app/dist-web/'} para publicar · ${cloud}.`)
