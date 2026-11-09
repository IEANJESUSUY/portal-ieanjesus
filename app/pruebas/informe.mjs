// Informe mensual: se edita sobre la planilla oficial, se agrega una actividad con foto y se imprime.
import { desktop, openDemo, phone, run, shots, testPhoto } from './utiles.mjs'

await run('Informe mensual sobre la planilla oficial', async ({ browser, check, watch }) => {
  const context = await browser.newContext(desktop)
  await context.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1 } })
  const page = await context.newPage()
  watch(page)
  await openDemo(page, /Congregación Salto/)
  await page.evaluate(() => { location.hash = '#/informes?crear=monthly' })
  await page.locator('.studio-canvas .ofi-page.ofi-editing').waitFor()
  check(await page.locator('.studio-canvas .ofi-input').count() >= 15, 'la portada se edita directo sobre la hoja oficial')
  await page.locator('input[aria-label="Ej. Ordenación"]').fill('Ordenación')
  await page.locator('input[aria-label^="Cultos de hogar"]').fill('5')

  await page.getByRole('button', { name: /Agregar actividad manual/ }).click()
  await page.locator('input[aria-label="Título de la actividad"]').fill('Campaña en la plaza')
  await page.locator('textarea[aria-label="Qué se hizo en la actividad"]').fill('Salimos con los jóvenes a la plaza principal, cantamos y oramos por las personas.')
  await page.locator('.ofi-photo-add input').setInputFiles(await testPhoto(browser))
  await page.locator('.ofi-photos img').first().waitFor({ timeout: 15000 })
  check(true, 'la actividad lleva título, texto y foto')

  await page.locator('.studio-pages button', { hasText: 'Anexo' }).click()
  await page.locator('input[aria-label="Nombre de la secretaría local"]').fill('Hna. Laura Pérez')
  check(await page.locator('.studio-canvas .ofi-annex .ofi-signatures').count() === 1, 'las firmas van en la última hoja (anexo)')
  check(await page.locator('#report-print-root .ofi-signatures').count() === 1, 'y aparecen una sola vez en todo el informe')

  await page.getByRole('button', { name: /Imprimir \/ guardar PDF/ }).click()
  await page.emulateMedia({ media: 'print' })
  const pages = await page.locator('#report-print-root .paper-page').count()
  check(pages === 3, `al imprimir salen 3 hojas: planilla, actividad y anexo (${pages})`)
  check(await page.locator('#report-print-root .ofi-page').count() === pages, 'todas las hojas tienen el diseño oficial')
  await page.pdf({ path: `${shots}/informe.pdf`, preferCSSPageSize: true, printBackground: true })
})

await run('Informe en el celular', async ({ browser, check, watch }) => {
  const page = await (await browser.newContext(phone)).newPage()
  watch(page)
  await openDemo(page, /Congregación Maldonado/)
  await page.getByRole('button', { name: /Informe del mes/ }).click()
  await page.getByText('Editor de documentos').waitFor()
  check(await page.locator('.ofi-sheet-scroll .ofi-page').count() === 1, 'la hoja se puede deslizar en el celular')
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'la pantalla no se desborda')
  await page.screenshot({ path: `${shots}/informe-celular.png` })
})
