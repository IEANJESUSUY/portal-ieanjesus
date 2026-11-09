// Herramientas comunes de las pruebas automáticas (Playwright con Chrome instalado).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const appDir = fileURLToPath(new URL('../', import.meta.url))
export const shots = fileURLToPath(new URL('../../tmp/pruebas/', import.meta.url))
mkdirSync(shots, { recursive: true })
export const portableUrl = process.env.PORTAL_URL || pathToFileURL(`${appDir}index.html`).href

export const launch = () => chromium.launch({ channel: 'chrome', headless: true })
export const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
export const desktop = { viewport: { width: 1366, height: 900 } }

// Abre la demostración y, si se pide, entra a un espacio (por ejemplo /Congregación Maldonado/).
export async function openDemo(page, space) {
  await page.goto(portableUrl)
  await page.getByRole('button', { name: /Ver demostración/ }).click()
  if (!space) return
  await page.locator('button[title^="Cambiar de espacio"]').first().click()
  await page.getByRole('button', { name: space }).click()
  if (/Congregación/.test(String(space))) {
    await page.getByRole('button', { name: 'Saltar' }).click()
    await page.getByText('Dios te bendiga').waitFor()
  }
}

// Foto JPEG de prueba generada en el momento (no hace falta guardar imágenes en el proyecto).
// Con width/height grandes simula la foto de un celular (4000 × 3000, varios MB, con textura).
export async function testPhoto(browser, { color = '#3d6bb3', width = 800, height = 600 } = {}) {
  const page = await browser.newPage()
  const data = await page.evaluate(({ fill, w, h }) => {
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, w, h)
    // Textura parecida a una foto real (si fuera de un solo color se comprimiría demasiado fácil).
    for (let i = 0; i < (w * h) / 400; i++) {
      ctx.fillStyle = `hsl(${(i * 37) % 360} 45% ${30 + (i % 50)}%)`
      ctx.fillRect((i * 7919) % w, (i * 104729) % h, 6 + (i % 18), 6 + (i % 14))
    }
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.round(w / 12)}px sans-serif`
    ctx.fillText('Foto de prueba', w / 5, h / 2)
    return canvas.toDataURL('image/jpeg', 0.92)
  }, { fill: color, w: width, h: height })
  await page.close()
  return { name: `foto-${width}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(data.split(',')[1], 'base64') }
}

// Corre una prueba: imprime cada paso y falla si algo no se cumple o hay errores en la página.
export async function run(name, body) {
  const browser = await launch()
  const steps = []
  const errors = []
  const check = (ok, text) => {
    steps.push(`${ok ? '✓' : '✗'} ${text}`)
    if (!ok) throw new Error(`No se cumple: ${text}`)
  }
  const watch = page => page.on('pageerror', e => errors.push(e.message))
  let failure = ''
  try {
    await body({ browser, check, watch, steps })
    if (errors.length) throw new Error(`Errores en la página: ${errors.join(' | ')}`)
  } catch (e) {
    failure = e.message.split('\n')[0]
  } finally {
    await browser.close()
  }
  console.log(`\n${failure ? '✗' : '✓'} ${name}`)
  for (const step of steps) console.log(`   ${step}`)
  if (failure) {
    console.log(`   → ${failure}`)
    process.exitCode = 1
  }
}
