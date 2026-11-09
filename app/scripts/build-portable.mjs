// Archivo único para abrir con doble clic (sin internet ni servidor). Guarda en este navegador.
import { writeFileSync } from 'node:fs'
import { buildSingleHtml, root } from './build-single.mjs'

writeFileSync(`${root}index.html`, await buildSingleHtml())
console.log('Listo: app/index.html se puede abrir con doble clic sin servidor.')
