// Congregación en el celular: menú de 5 secciones, pedidos de comités, anotar persona, dinero y lista.
import { openDemo, phone, run, shots } from './utiles.mjs'

await run('Congregación en el celular', async ({ browser, check, watch }) => {
  const page = await (await browser.newContext(phone)).newPage()
  watch(page)
  const nav = name => page.locator('.mobile-bottom-nav').getByRole('link', { name })
  await openDemo(page, /Congregación Maldonado/)
  check((await page.locator('.mobile-bottom-nav').innerText()).replace(/\s+/g, ' ').trim() === 'Inicio Personas Cultos Dinero Informes', 'el menú de abajo tiene las 5 secciones')

  // Persona nueva: sin sexo y edad no deja guardar
  await page.getByRole('button', { name: /Anotar persona nueva/ }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Pedro')
  await page.getByLabel(/Apellido/).fill('Prueba Nueva')
  check(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), 'no deja guardar una persona sin sexo y edad')
  await page.getByRole('button', { name: 'Hombre' }).click()
  await page.getByRole('button', { name: /^Joven/ }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.getByText('¡Persona anotada!').waitFor()
  await page.getByRole('button', { name: 'Volver al inicio' }).click()

  // Lista de hoy con Pedro
  await page.getByRole('button', { name: /Pasar lista/ }).first().click()
  await page.getByRole('button', { name: /Otro culto o reunión/ }).click()
  await page.getByRole('button', { name: /Siguiente/ }).click()
  await page.locator('.qm-person', { hasText: 'Pedro Prueba Nueva' }).click()
  await page.getByRole('button', { name: /Listo · 1 presentes/ }).click()
  await page.getByText('¡Lista guardada!').waitFor()
  check(true, 'pasa lista con la persona recién anotada')
  await page.getByRole('button', { name: 'Volver al inicio' }).click()

  // Gasto de luz con rubro
  await page.getByRole('button', { name: /Anotar dinero/ }).click()
  await page.getByRole('button', { name: /Salió plata/ }).click()
  await page.getByLabel('Importe en pesos').fill('2300')
  await page.getByRole('button', { name: /Siguiente/ }).click()
  check(await page.getByRole('button', { name: /^Internet/ }).count() === 1, 'los gastos fijos incluyen Internet')
  await page.getByRole('button', { name: /^Luz/ }).click()
  await page.getByRole('button', { name: /^Guardar$/ }).click()
  await page.getByText('¡Anotado!').waitFor()
  await page.getByRole('button', { name: 'Volver al inicio' }).click()
  await nav('Dinero').click()
  await page.locator('.fixed-expenses').waitFor()
  check(/Luz\s+✓/.test(await page.locator('.fixed-expenses').innerText()), 'en Dinero, la luz del mes figura como anotada')

  // Pedidos de comités desde la ayuda
  await page.getByRole('button', { name: /Abrir ayuda rápida/ }).click()
  if (await page.getByRole('button', { name: 'Ver otras preguntas' }).count()) await page.getByRole('button', { name: 'Ver otras preguntas' }).click()
  await page.getByRole('button', { name: /¿Qué me pidió un comité\?/ }).click()
  await page.getByRole('button', { name: /Ver los pedidos/ }).click()
  await page.getByText('Pedidos de los comités').first().waitFor()
  check(true, 'la ayuda lleva a los pedidos de los comités')

  // Pestañas de las secciones
  await nav('Personas').click()
  check((await page.locator('.section-tabs').innerText()).replace(/\s+/g, ' ').includes('Células'), 'Personas tiene la pestaña Células')
  await nav('Cultos').click()
  await page.locator('.section-tab', { hasText: 'Calendario' }).waitFor({ timeout: 5000 }).catch(() => undefined)
  check(await page.locator('.section-tab', { hasText: 'Calendario' }).count() === 1, 'Cultos tiene la pestaña Calendario')
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'nada se sale de la pantalla')
  await page.screenshot({ path: `${shots}/congregacion.png` })
})
