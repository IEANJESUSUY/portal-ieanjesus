// Compila y corre todas las pruebas automáticas. Uso (desde la carpeta app):  node scripts/probar.mjs
// Necesita Google Chrome instalado. Las capturas y el PDF de prueba quedan en tmp/pruebas.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const app = fileURLToPath(new URL('../', import.meta.url))
const node = process.execPath
const step = (args, env = {}) => execFileSync(node, args, { cwd: app, stdio: 'inherit', env: { ...process.env, ...env } })

step(['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json'])
step(['--test', 'server/store.test.mjs'])
step(['scripts/build-portable.mjs'])
step(['scripts/build-web.mjs'], {
  PORTAL_OUT: fileURLToPath(new URL('../../tmp/pruebas/web', import.meta.url)),
  VITE_SUPABASE_URL: 'https://pn-prueba.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'clave-publica-de-prueba'
})

let failed = 0
for (const test of ['inicio-vacio', 'congregacion', 'personas', 'avisos', 'informe', 'nacional', 'base-central', 'app-instalable']) {
  try {
    step([`pruebas/${test}.mjs`])
  } catch {
    failed++
  }
}
// Cada prueba marca exitCode 1 si falla algo; execFileSync lanza el error y se cuenta arriba.
console.log(failed ? `\n✗ ${failed} prueba(s) con problemas.` : '\n✓ Todas las pruebas pasaron.')
process.exitCode = failed ? 1 : 0
