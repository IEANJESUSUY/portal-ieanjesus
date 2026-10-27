import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const result = await build({
  root, configFile: false, plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: { write: false, cssCodeSplit: false, lib: { entry: `${root}src/main.tsx`, name: 'PortalNacional', formats: ['iife'] }, rolldownOptions: { output: { inlineDynamicImports: true } } },
})
const output = (Array.isArray(result) ? result[0] : result).output
const js = output.filter(x => x.type === 'chunk').map(x => x.code).join('\n')
const logoData = readFileSync(`${root}public/logo-portal-nacional.png`).toString('base64')
const standaloneJs = js.replaceAll('./logo-portal-nacional.png', `data:image/png;base64,${logoData}`)
const css = output.filter(x => x.type === 'asset' && x.fileName.endsWith('.css')).map(x => x.source).join('\n')
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portal Nacional</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div><script>${standaloneJs.replace(/<\/script/gi, '<\\/script')}</script></body></html>`
writeFileSync(`${root}index.html`, html)
console.log('Listo: app/index.html se puede abrir con doble clic sin servidor.')
