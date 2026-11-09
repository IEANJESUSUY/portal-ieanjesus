// Compila el Portal en un único HTML (todo el JavaScript y el CSS adentro).
// Lo usan build-portable (archivo para abrir con doble clic) y build-web (versión para internet).
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../', import.meta.url))

export async function buildSingleHtml({ inlineLogo = true, head = '' } = {}) {
  const result = await build({
    root, configFile: false, plugins: [react()], logLevel: 'warn',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: { write: false, cssCodeSplit: false, lib: { entry: `${root}src/main.tsx`, name: 'PortalNacional', formats: ['iife'] }, rolldownOptions: { output: { inlineDynamicImports: true } } },
  })
  const output = (Array.isArray(result) ? result[0] : result).output
  let js = output.filter(x => x.type === 'chunk').map(x => x.code).join('\n')
  if (inlineLogo) {
    const logoData = readFileSync(`${root}public/logo-portal-nacional.png`).toString('base64')
    js = js.replaceAll('./logo-portal-nacional.png', `data:image/png;base64,${logoData}`)
  }
  const css = output.filter(x => x.type === 'asset' && x.fileName.endsWith('.css')).map(x => x.source).join('\n')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Portal Nacional</title>${head}<style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`
}
