import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const url = new URL('../index.html', import.meta.url).href
const out = fileURLToPath(new URL('../../output/playwright/', import.meta.url))
mkdirSync(out, { recursive: true })

await page.goto(url)
await page.evaluate(async () => { await window.seedDemoData() })
await page.reload()
await page.getByText('Modo archivo', { exact: false }).waitFor()
await page.getByRole('button', { name: 'Cerrar sesión' }).click()
await page.getByLabel('Nombre de usuario').fill('lider_jovenes')
await page.getByLabel('Contraseña').fill('demo1234')
await page.getByRole('button', { name: 'Ingresar a la plataforma' }).click()
await page.getByRole('button', { name: /Comité Nacional de Jóvenes/ }).click()
await page.getByRole('button', { name: '+ Crear Actividad Nacional' }).click()
const dialog = page.getByRole('dialog')
await dialog.getByLabel('Nombre de la actividad *').fill('Culto Misionero Nacional 2026')
await dialog.getByLabel('Tema o lema').fill('Jóvenes transformados a la imagen de Jesús')
await dialog.getByLabel('Fecha límite para enviar devolución *').fill('2026-11-30')
await dialog.getByLabel('Descripción breve (máximo 500 caracteres)').fill('Actividad nacional que reúne asistencia, ofrendas y evidencias de cada congregación.')
await dialog.getByRole('button', { name: 'Guardar y Distribuir Asignaciones' }).click()
await dialog.waitFor({ state: 'hidden' })
await page.screenshot({ path: `${out}/panel-comite-renovado.png`, fullPage: true })

await page.getByRole('button', { name: 'Cambiar espacio' }).first().click()
await page.getByRole('button', { name: /Congregación Maldonado/ }).click()
await page.goto(`${url}#/`)
await page.getByRole('heading', { name: 'Congregación Maldonado' }).waitFor()
await page.screenshot({ path: `${out}/panel-congregacion-renovado.png`, fullPage: true })

// La captura del usuario señalaba texto pegado en las fichas de comités locales.
await page.goto(`${url}#/comites`)
await page.getByRole('heading', { name: /Comités locales/i }).waitFor()
await page.screenshot({ path: `${out}/comites-locales-desktop.png`, fullPage: true })
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(250)
const committeeMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
if (committeeMobileOverflow) throw new Error('Comités locales se desborda horizontalmente en móvil.')
await page.screenshot({ path: `${out}/comites-locales-movil-390.png`, fullPage: true })

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
if (overflow) throw new Error('La vista tiene desplazamiento horizontal inesperado.')

// Revisión visual del formulario financiero solicitado para teléfonos.
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${url}#/finanzas?accion=egreso`)
const movementDialog = page.getByRole('dialog')
await movementDialog.waitFor()
const movementLayout = await page.evaluate(() => {
  const fields = document.querySelector('.record-dialog .record-fields')?.getBoundingClientRect()
  const actions = document.querySelector('.record-dialog .modal-actions')?.getBoundingClientRect()
  return {
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    fieldsBottom: fields?.bottom ?? -1,
    actionsTop: actions?.top ?? -1
  }
})
if (movementLayout.overflow || movementLayout.actionsTop < movementLayout.fieldsBottom) {
  throw new Error('El formulario financiero móvil tiene desbordamiento o acciones sobre los campos.')
}
await page.screenshot({ path: `${out}/movimiento-movil-390.png` })

await browser.close()
console.log('Capturas visuales desktop/móvil creadas sin superposición ni desbordamiento.')
