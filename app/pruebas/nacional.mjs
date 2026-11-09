// Administración Nacional y comités: panel con indicadores, menú de 5 secciones y resumen impreso.
import { desktop, openDemo, phone, run, shots } from './utiles.mjs'

await run('Panel de la Administración Nacional', async ({ browser, check, watch }) => {
  const context = await browser.newContext(phone)
  await context.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1 } })
  const page = await context.newPage()
  watch(page)
  await openDemo(page)
  await page.locator('.nd-kpis').waitFor()
  check(await page.locator('.nd-kpi').count() === 9, 'el panel muestra 9 indicadores')
  check(await page.locator('.nd-table tbody tr').count() >= 2, 'el semáforo lista cada congregación')
  check(!/-\d+ días/.test(await page.locator('.nd-table').innerText()), 'el uso del Portal nunca muestra días negativos')
  check((await page.locator('.mobile-bottom-nav').innerText()).replace(/\s+/g, ' ').trim() === 'Inicio Iglesias Comités Dinero Informes', 'menú nacional de 5 secciones')
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'nada se sale de la pantalla')
  await page.screenshot({ path: `${shots}/nacional.png`, fullPage: true })

  await page.locator('.mobile-bottom-nav').getByRole('link', { name: 'Informes' }).click()
  await page.getByText('Bandeja histórica de informes recibidos').waitFor()
  await page.getByRole('button', { name: 'Imprimir resumen' }).click()
  await page.waitForFunction(() => window.__printed > 0)
  check(await page.locator('#report-print-root .ofi-summary tbody tr').count() >= 2, 'Imprimir resumen arma la hoja oficial con cada iglesia')
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))

  // Informes del año en un solo PDF (para Drive)
  const button = page.getByRole('button', { name: /Descargar en PDF/ })
  const count = Number((await button.innerText()).match(/\((\d+)\)/)?.[1] || 0)
  await button.click()
  if (count) {
    await page.waitForFunction(() => window.__printed > 1)
    const sheets = await page.locator('#report-print-root .ofi-page').count()
    check(sheets >= count * 2, `descargar el año arma ${count} informes en ${sheets} hojas oficiales`)
  } else {
    check(await page.getByText(/No hay informes enviados de/).count() === 1, 'si no hay informes del año, lo avisa')
  }
})

await run('Comité nacional', async ({ browser, check, watch }) => {
  const page = await (await browser.newContext(desktop)).newPage()
  watch(page)
  await openDemo(page, /Jóvenes/)
  check((await page.locator('.sidebar .nav-list').innerText()).replace(/\s+/g, ' ').includes('Actividades y agenda'), 'el comité tiene su menú de 5 secciones')
  check(await page.getByText('Comunicación', { exact: true }).count() === 0, 'ya no aparece Comunicación (se usa WhatsApp)')
  await page.locator('.sidebar').getByRole('link', { name: 'Actividades y agenda' }).click()
  check(await page.locator('.committee-nav-tab', { hasText: 'Panel del comité' }).count() === 0, 'las pestañas del comité no repiten el Inicio')
})
