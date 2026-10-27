import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
const url = new URL('../index.html', import.meta.url).href
const out = fileURLToPath(new URL('../../output/playwright/', import.meta.url))
mkdirSync(out, { recursive: true })
async function route(hash) { await page.goto(`${url}#/${hash}`); await page.getByText('Modo archivo', { exact: false }).waitFor() }
async function create(hash, values, selects = {}) {
  await route(hash)
  if (hash === 'personas') {
    await page.getByRole('button', { name: /Agregar amigo/ }).click()
  } else if (hash === 'finanzas') {
    await page.getByRole('button', { name: /Nuevo movimiento/ }).click()
  } else {
    await page.getByRole('button', { name: /Nuevo registro/ }).click()
  }
  const dialog = page.getByRole('dialog')
  if (hash === 'finanzas' && selects['Culto o evento relacionado']) {
    const moreBtn = dialog.getByRole('button', { name: /Agregar más detalles/ })
    if (await moreBtn.isVisible()) await moreBtn.click()
  }
  const cleanSelects = { ...selects }
  if (cleanSelects['Movimiento *']) {
    const movBtn = dialog.getByRole('button', { name: new RegExp(cleanSelects['Movimiento *']) })
    if (await movBtn.isVisible()) await movBtn.click()
    delete cleanSelects['Movimiento *']
  }
  delete cleanSelects['Tipo de registro *']
  for (const [key, value] of Object.entries(values)) await dialog.getByLabel(key, { exact: true }).fill(value)
  for (const [key, value] of Object.entries(cleanSelects)) await dialog.getByLabel(key, { exact: true }).selectOption({ label: value })
  await dialog.getByRole('button', { name: /Guardar registro|Guardar amigo|Guardar persona vinculada|Guardar ingreso|Guardar egreso/ }).click()
  await dialog.waitFor({ state: 'hidden' })
}
try {
  await route('')
  await page.getByRole('heading', { name: 'Inicio', exact: true }).waitFor()
  assert.equal(await page.locator('.chart-card').count(), 0, 'Inicio debe ser operativo, no repetir Informes')
  await page.screenshot({ path: `${out}/portal-empty-charts.png` })
  await create('iglesias', { 'Nombre *': 'Iglesia QA' })
  await create('familias', { 'Nombre *': 'Familia QA', 'Barrio o zona *': 'Centro', 'Dirección (opcional)': 'Dirección ficticia' }, { 'Congregación *': 'Iglesia QA' })
  await create('personas', { 'Nombre *': 'Ana', 'Apellidos *': 'Prueba QA', 'Fecha de nacimiento': '2000-10-09' }, { 'Congregación *': 'Iglesia QA', 'Tipo de registro *': 'Amigo' })
  await page.reload()
  await page.getByRole('cell', { name: /Prueba QA/ }).waitFor()
  await page.getByRole('row').filter({ hasText: 'Prueba QA' }).getByRole('button', { name: 'Abrir / editar', exact: true }).click()
  assert.equal(await page.getByLabel('Fecha de nacimiento', { exact: true }).inputValue(), '2000-10-09')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await create('calendario', { 'Nombre *': 'Culto QA', 'Fecha *': '2026-10-09' }, { 'Congregación *': 'Iglesia QA', 'Tipo *': 'Culto' })
  await route('cultos')
  await page.getByLabel('Culto o evento', { exact: true }).selectOption({ label: '2026-10-09 · Culto QA' })
  await page.locator('.attendance-focus-person').click()
  assert.equal(await page.getByRole('checkbox').isChecked(), true)
  await page.getByLabel('Visitas sin ficha', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Guardar asistencia', exact: true }).click()
  await page.getByText('Asistencia guardada.', { exact: true }).waitFor()
  await page.reload()
  await page.getByLabel('Culto o evento', { exact: true }).selectOption({ label: '2026-10-09 · Culto QA' })
  assert.equal(await page.getByRole('checkbox').isChecked(), true)
  assert.equal(await page.getByLabel('Visitas sin ficha', { exact: true }).inputValue(), '2')
  await create('finanzas', { 'Nombre *': 'Ofrenda QA', 'Fecha *': '2026-10-09', 'Importe en pesos uruguayos *': '125.50' }, { 'Congregación *': 'Iglesia QA', 'Movimiento *': 'Ingreso', 'Concepto *': 'Ofrenda', 'Culto o evento relacionado': 'Culto QA' })
  await create('comites', { 'Nombre *': 'Comité QA' }, { 'Tipo *': 'Comité local', 'Congregación (vacío para comité nacional)': 'Iglesia QA', 'Responsable': 'Ana Prueba QA' })
  await route('informes')
  await page.getByLabel('Desde', { exact: true }).fill('2026-01-01')
  await page.getByLabel('Hasta', { exact: true }).fill('2026-12-31')
  assert.match(await page.locator('.directory-summary').innerText(), /125,50|79\.925,50/)
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}/portal-desktop.png` })
  await route('configuracion')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar todos los registros (JSON)' }).click()
  const download = await downloaded
  assert.match(download.suggestedFilename(), /portal-nacional.*json/)
  await page.setViewportSize({ width: 390, height: 844 })
  await route('personas')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}/portal-mobile.png` })
  await route('celulas')
  await page.getByRole('heading', { name: 'Células y grupos de amistad' }).waitFor()
  assert.match(await page.locator('.cells-kpis').innerText(), /102/)
  assert.match(await page.locator('.cells-kpis').innerText(), /3\.625,00/)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await page.getByRole('button', { name: 'Cargar informe', exact: true }).click()
  const cellDialog = page.getByRole('dialog', { name: 'Cargar informe semanal' })
  await cellDialog.locator('select').selectOption({ label: 'Centro' })
  await cellDialog.locator('input[type=number]').nth(0).fill('11')
  await cellDialog.locator('input[type=number]').nth(1).fill('7')
  await cellDialog.locator('input[type=number]').nth(2).fill('3')
  await cellDialog.locator('input[type=number]').nth(3).fill('450')
  await cellDialog.getByRole('button', { name: 'Guardar informe', exact: true }).click()
  await cellDialog.waitFor({ state: 'hidden' })
  assert.match(await page.locator('.cells-kpis').innerText(), /103/)
  await page.getByRole('button', { name: 'Importar respuestas', exact: true }).click()
  await page.locator('.cell-file-drop input[type=file]').setInputFiles({ name: 'respuestas.csv', mimeType: 'text/csv', buffer: Buffer.from('Célula,Adultos,Visitas,Niños,Ofrenda,Líder\nCentro,12,7,3,500,Responsable QA') })
  await page.getByRole('dialog', { name: 'Importar respuestas' }).waitFor({ state: 'hidden' })
  assert.match(await page.locator('.cells-kpis').innerText(), /104/)
  await page.getByRole('button', { name: /Cambiar a modo rápido/ }).click()
  assert.equal(await page.locator('.mobile-bottom-nav').evaluate(element => getComputedStyle(element).display), 'none')
  await page.getByRole('button', { name: /Tomar asistencia/ }).click()
  await page.getByRole('heading', { name: 'Cultos y asistencia' }).waitFor()
  assert.notEqual(await page.locator('.mobile-bottom-nav').evaluate(element => getComputedStyle(element).display), 'none')
  assert.deepEqual(errors, [])
  console.log('PASS: file://, registros, finanzas, informes, células, modo rápido y navegación móvil; sin errores JavaScript.')
} finally { await browser.close() }
