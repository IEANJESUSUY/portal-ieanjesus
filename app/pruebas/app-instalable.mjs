// Versión web servida por http: manifiesto válido, ícono, y que abra sin señal (service worker).
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { phone, run, shots } from './utiles.mjs'

const dir = join(shots, 'web')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  try {
    const body = await readFile(join(dir, path === '/' ? 'index.html' : path))
    res.writeHead(200, { 'Content-Type': types[extname(path || '.html')] || 'text/html; charset=utf-8' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(0)
const url = `http://localhost:${server.address().port}/`

await run('App instalable (versión web)', async ({ browser, check, watch }) => {
  const context = await browser.newContext(phone)
  const page = await context.newPage()
  watch(page)
  await page.goto(url)
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json())
  check(manifest.display === 'standalone' && manifest.icons.some(i => i.sizes === '512x512'), 'el manifiesto tiene pantalla completa e ícono grande')
  check(await page.evaluate(async () => (await fetch('icon-192.png')).ok), 'el ícono de la app está publicado')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 })
  check(true, 'el service worker queda activo')
  await context.setOffline(true)
  await page.reload()
  await page.locator('.login-card').waitFor({ timeout: 10000 })
  check(true, 'sin señal, la app instalada igual abre')
  await page.screenshot({ path: `${shots}/sin-senal.png` })
})
server.close()
