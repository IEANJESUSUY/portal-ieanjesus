// Asistencia por persona (barrita, % del mes, hace cuántos días) y avisos: campanita y notificaciones.
import { openDemo, phone, run, shots } from './utiles.mjs'

// Notificaciones simuladas: se anotan en vez de mostrarse en el sistema.
const fakeNotifications = () => {
  window.__notes = []
  class FakeNotification {
    static permission = 'granted'
    static requestPermission = async () => 'granted'
    constructor(title, options) { window.__notes.push({ title, body: options?.body }) }
  }
  window.Notification = FakeNotification
}

await run('Asistencia de cada persona', async ({ browser, check, watch }) => {
  const page = await (await browser.newContext(phone)).newPage()
  watch(page)
  await openDemo(page, /Congregación Maldonado/)
  await page.locator('.mobile-bottom-nav').getByRole('link', { name: 'Personas' }).click()
  await page.locator('.people-tools').waitFor()
  await page.waitForTimeout(300)
  const badges = await page.locator('.crm-table .attendance-badge').evaluateAll(els => els.map(e => ({ level: e.className.split(' ')[1], text: e.innerText.replace(/\s+/g, ' ') })))
  check(badges.length > 0 && badges.every(b => ['green', 'yellow', 'red', 'none'].includes(b.level)), `cada persona tiene su barrita (${[...new Set(badges.map(b => b.level))].join(', ')})`)
  check(badges.some(b => /Vino (hoy|ayer|hace \d+ días)/.test(b.text) && /\d+% en \w+ \(\d+ de \d+\)/.test(b.text)), `muestra hace cuántos días vino y el % del mes: «${badges.find(b => /%/.test(b.text))?.text}»`)

  await page.getByRole('button', { name: 'Faltan seguido', exact: true }).click()
  await page.waitForTimeout(300)
  const missing = await page.locator('.crm-table .attendance-badge').evaluateAll(els => els.map(e => e.className))
  check(missing.every(c => /yellow|red/.test(c)), `el filtro «Faltan seguido» muestra solo amarillos y rojos (${missing.length})`)
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await page.locator('.people-sort select').selectOption('absent')
  await page.waitForTimeout(300)
  const firstLevel = await page.locator('.crm-table .attendance-badge').first().getAttribute('class')
  check(!/green/.test(firstLevel) || !missing.length, 'ordenar por asistencia pone primero a los que más faltan')
  await page.screenshot({ path: `${shots}/asistencia.png`, fullPage: true })

  await page.locator('.crm-table tbody tr').first().getByRole('button', { name: /Abrir/ }).click()
  await page.locator('dialog[open] .attendance-badge.full').waitFor()
  check(true, 'la ficha de la persona muestra su asistencia')
})

await run('Avisos y notificaciones', async ({ browser, check, watch }) => {
  const context = await browser.newContext(phone)
  await context.addInitScript(fakeNotifications)
  const page = await context.newPage()
  watch(page)
  await openDemo(page, /Congregación Maldonado/)
  const count = Number((await page.locator('.bell-count').innerText().catch(() => '0')) || 0)
  check(count > 0, `la campanita muestra ${count} avisos sin leer`)
  await page.locator('.bell-button').click()
  const items = (await page.locator('.bell-item strong').allInnerTexts())
  check(items.length > 0, `avisos: ${items.slice(0, 4).join(' · ')}`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${shots}/avisos.png` })

  // Activar los avisos en el celular: lo urgente pendiente llega como notificación
  await page.getByLabel('Avisarme también en el celular').check()
  await page.getByText('¡Activado!').waitFor()
  await page.getByRole('button', { name: 'Probar una notificación' }).click()
  await page.waitForFunction(() => window.__notes.some(n => n.title === 'Prueba del Portal'))
  check(true, 'el botón «Probar una notificación» manda una notificación')
  await page.getByRole('button', { name: 'Cerrar avisos' }).click()
  await page.locator('.mobile-bottom-nav').getByRole('link', { name: 'Dinero' }).click()
  await page.waitForTimeout(300)
  await page.evaluate(() => { location.hash = '#/' })
  await page.getByText('Dios te bendiga').waitFor()
  // Un cambio en los datos vuelve a calcular los avisos y avisa los nuevos
  await page.getByRole('button', { name: /Anotar persona nueva/ }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Prueba')
  await page.getByLabel(/Apellido/).fill('Avisos')
  await page.getByRole('button', { name: 'Mujer' }).click()
  await page.getByRole('button', { name: /^Adulto/ }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.getByText('¡Persona anotada!').waitFor()
  const notes = await page.evaluate(() => window.__notes.filter(n => n.title !== 'Prueba del Portal'))
  check(notes.length > 0, `llegan las notificaciones de lo pendiente: «${notes[0]?.title}»`)

  // Tocar un aviso lleva a su pantalla y lo marca leído; «Marcar todo» apaga el número
  await page.getByRole('button', { name: 'Volver al inicio' }).click()
  await page.locator('.bell-button').click()
  await page.locator('.bell-item').first().click()
  await page.waitForTimeout(300)
  await page.locator('.bell-button').click()
  await page.getByRole('button', { name: /Marcar todo como leído/ }).click()
  check(await page.locator('.bell-count').count() === 0, 'marcar todo como leído apaga el número')
})

await run('Avisos de la Administración Nacional y de un comité', async ({ browser, check, watch }) => {
  const page = await (await browser.newContext(phone)).newPage()
  watch(page)
  await openDemo(page)
  await page.locator('.bell-button').click()
  const national = await page.locator('.bell-item strong').allInnerTexts()
  check(national.length > 0, `Nacional: ${national.slice(0, 3).join(' · ')}`)
  await page.getByRole('button', { name: 'Cerrar avisos' }).click()
  await page.locator('button[title^="Cambiar de espacio"]').first().click()
  await page.getByRole('button', { name: /Jóvenes/ }).click()
  await page.locator('.bell-button').click()
  const committee = await page.locator('.bell-item strong').allInnerTexts()
  check(committee.some(t => /respondió|Quedan|venció/i.test(t)), `Comité: ${committee.slice(0, 3).join(' · ') || '(sin avisos)'}`)
})
