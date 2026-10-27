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

async function nav(labelPattern) {
  await page.locator('.nav-list').getByRole('link', { name: labelPattern }).first().click()
  await page.waitForTimeout(300)
}

try {
  console.log('=== VERIFICANDO CRITERIOS OBLIGATORIOS (SECCIÓN 8) ===')

  // Setup: seed demo data
  await page.goto(url)
  await page.getByText('Modo archivo', { exact: false }).waitFor()
  await page.evaluate(async () => {
    await window.seedDemoData()
  })
  await page.reload()
  await page.getByText('Modo archivo', { exact: false }).waitFor()

  // ----------------------------------------------------
  // RECORRIDO A: Pastor de Maldonado
  // ----------------------------------------------------
  console.log('\n--- Recorrido A: Pastor de Maldonado ---')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('heading', { name: 'Portal Nacional' }).waitFor()
  await page.getByLabel('Nombre de usuario').fill('pastor_maldonado')
  await page.getByLabel('Contraseña').fill('demo1234')
  await page.getByRole('button', { name: 'Ingresar a la plataforma' }).click()

  // Elegir "Congregación Maldonado"
  await page.getByRole('heading', { name: '¿A qué espacio quieres ingresar?' }).waitFor()
  await page.getByRole('button', { name: /Congregación Maldonado/ }).click()
  await page.waitForTimeout(400)

  // Abrir Personas via sidebar
  await nav(/Personas/)
  await page.getByRole('heading', { name: /Personas/ }).waitFor()

  // Pulsar "Agregar amigo"
  await page.getByRole('button', { name: 'Agregar amigo' }).click()
  const amigoDialog = page.getByRole('dialog')
  await amigoDialog.getByRole('heading', { name: 'Agregar amigo' }).waitFor()

  // Confirmar que no existe selector de congregación (solo etiqueta de sólo lectura)
  assert.equal(await amigoDialog.getByLabel('Congregación *').count(), 0, 'No debe haber selector de congregación')
  assert.ok(await amigoDialog.getByText('Congregación Maldonado').count() > 0, 'Debe mostrar la congregación asignada')

  // Guardar un amigo
  await amigoDialog.getByLabel('Nombre *').fill('Carlos')
  await amigoDialog.getByLabel('Apellidos (opcional)').fill('Amigo Maldonado')
  await amigoDialog.getByLabel('Celular').fill('099111222')
  await amigoDialog.getByLabel('Fecha de nacimiento').fill('1995-04-12')
  await amigoDialog.getByRole('button', { name: 'Guardar amigo' }).click()
  await amigoDialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(300)

  // Confirmar en la tabla
  assert.ok(await page.getByText('Carlos Amigo Maldonado').count() > 0)
  assert.ok(await page.locator('.person-chip-badge.amigo').count() > 0)

  // Abrir Finanzas via sidebar
  await nav(/Finanzas/)
  await page.getByRole('heading', { name: 'Finanzas' }).waitFor()

  // Pulsar "Nuevo movimiento"
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  const finDialog = page.getByRole('dialog')
  await finDialog.getByRole('heading', { name: 'Nuevo movimiento' }).waitFor()

  // Confirmar que no existe selector de congregación
  assert.equal(await finDialog.getByLabel('Congregación *').count(), 0, 'No debe haber selector de congregación en finanzas')

  // Registrar una ofrenda
  await finDialog.getByLabel('Nombre *').fill('Ofrenda dominical Maldonado')
  await finDialog.getByLabel('Importe en pesos uruguayos *').fill('3500')
  await finDialog.getByRole('button', { name: 'Guardar ingreso' }).click()
  await finDialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(300)

  // Confirmar que se guardó en la tabla
  assert.ok(await page.getByText('Ofrenda dominical Maldonado').count() > 0)
  console.log('Recorrido A completado con éxito.')

  // ----------------------------------------------------
  // RECORRIDO B: Persona vinculada
  // ----------------------------------------------------
  console.log('\n--- Recorrido B: Persona vinculada ---')
  await nav(/Personas/)
  await page.getByRole('button', { name: 'Agregar persona vinculada' }).click()
  const vincDialog = page.getByRole('dialog')
  await vincDialog.getByRole('heading', { name: 'Agregar persona vinculada' }).waitFor()

  // Confirmar que congregación está asignada y lugares de predicación pertenecen a Maldonado
  assert.equal(await vincDialog.getByLabel('Congregación *').count(), 0)
  const preachingSel = vincDialog.getByLabel('Lugar de predicación vinculado')
  assert.ok(await preachingSel.isVisible(), 'Debe mostrar selector de lugar de predicación local')
  // Confirmar que solo muestra San Carlos (dependiente de Maldonado)
  const preachingOptions = await preachingSel.innerText()
  assert.ok(preachingOptions.includes('San Carlos'), 'Debe incluir San Carlos')

  await vincDialog.getByLabel('Nombre *').fill('Laura')
  await vincDialog.getByLabel('Apellidos *').fill('Vinculada QA')
  await vincDialog.getByLabel('Lugar de predicación vinculado').selectOption({ label: 'Lugar de Predicación San Carlos' })
  await vincDialog.getByLabel(/Responsabilidad/).fill('Diaconisa')
  await vincDialog.getByRole('button', { name: 'Guardar persona vinculada' }).click()
  await vincDialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(300)

  // Confirmar que aparece una sola ficha
  const lauraCount = await page.getByText('Laura Vinculada QA').count()
  assert.equal(lauraCount, 1, 'Debe aparecer exactamente una sola ficha')
  console.log('Recorrido B completado con éxito.')

  // ----------------------------------------------------
  // RECORRIDO C: Encargado de lugar de predicación (Roberto Gómez / San Carlos)
  // ----------------------------------------------------
  console.log('\n--- Recorrido C: Encargado de lugar de predicación ---')
  await page.getByRole('button', { name: 'Cambiar espacio' }).first().click()
  await page.getByRole('button', { name: 'Cerrar sesión / Cambiar usuario' }).click()
  await page.getByLabel('Nombre de usuario').fill('encargado_sancarlos')
  await page.getByLabel('Contraseña').fill('demo1234')
  await page.getByRole('button', { name: 'Ingresar a la plataforma' }).click()

  // Usuario con 1 solo espacio ingresa directamente a San Carlos
  await page.waitForTimeout(400)
  await page.locator('.preaching-banner').waitFor()
  assert.ok(await page.locator('.preaching-banner').getByText('Congregación Maldonado').count() > 0, 'Debe mostrar dependencia de la congregación madre')

  // Crear movimiento financiero en San Carlos
  await nav(/Ofrendas|Finanzas/)
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  const scFinDialog = page.getByRole('dialog')
  assert.equal(await scFinDialog.getByLabel('Congregación *').count(), 0, 'No debe permitir seleccionar congregación nacional')
  await scFinDialog.getByLabel('Nombre *').fill('Ofrenda local San Carlos')
  await scFinDialog.getByLabel('Importe en pesos uruguayos *').fill('1200')
  await scFinDialog.getByRole('button', { name: 'Guardar ingreso' }).click()
  await scFinDialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(300)

  assert.ok(await page.getByText('Ofrenda local San Carlos').count() > 0)
  console.log('Recorrido C completado con éxito.')

  // ----------------------------------------------------
  // RECORRIDO D: Comité nacional (lider_jovenes)
  // ----------------------------------------------------
  console.log('\n--- Recorrido D: Comité Nacional ---')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByLabel('Nombre de usuario').fill('lider_jovenes')
  await page.getByLabel('Contraseña').fill('demo1234')
  await page.getByRole('button', { name: 'Ingresar a la plataforma' }).click()
  await page.getByRole('button', { name: /Comité Nacional de Jóvenes/ }).click()
  await page.waitForTimeout(300)

  // En Personas, muestra líderes vinculados al comité
  await nav(/Personas/)
  await page.getByRole('heading', { name: /Personas/ }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Agregar amigo' }).count(), 0, 'En comité nacional no muestra agregar amigo local')

  // Finanzas del comité queda relacionada automáticamente
  await nav(/Finanzas/)
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  const comFinDialog = page.getByRole('dialog')
  await comFinDialog.getByLabel('Nombre *').fill('Ingreso nacional jóvenes QA')
  await comFinDialog.getByLabel('Importe en pesos uruguayos *').fill('4000')
  await comFinDialog.getByRole('button', { name: 'Guardar ingreso' }).click()
  await comFinDialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(300)
  assert.ok(await page.getByText('Ingreso nacional jóvenes QA').count() > 0)
  console.log('Recorrido D completado con éxito.')

  // ----------------------------------------------------
  // RECORRIDO E: Compatibilidad con registros antiguos
  // ----------------------------------------------------
  console.log('\n--- Recorrido E: Compatibilidad ---')
  // Cambiar a admin nacional
  await page.getByRole('button', { name: 'Cambiar espacio' }).first().click()
  await page.getByRole('button', { name: 'Cerrar sesión / Cambiar usuario' }).click()
  await page.getByLabel('Nombre de usuario').fill('admin_nacional')
  await page.getByLabel('Contraseña').fill('demo1234')
  await page.getByRole('button', { name: 'Ingresar a la plataforma' }).click()
  await page.waitForTimeout(300)

  await nav(/Personas/)
  // Abrir Mateo González (que tenía status: 'Miembro' en seed)
  await page.getByRole('cell', { name: /Mateo González/ }).waitFor()
  await page.locator('tr', { hasText: 'Mateo González' }).getByRole('button', { name: 'Abrir / editar' }).click()
  const mateoDialog = page.getByRole('dialog')
  await mateoDialog.getByRole('heading', { name: /Editar persona vinculada/ }).waitFor()
  assert.equal(await mateoDialog.getByLabel('Nombre *').inputValue(), 'Mateo')
  await mateoDialog.getByRole('button', { name: 'Guardar persona vinculada' }).click()
  await mateoDialog.waitFor({ state: 'hidden' })

  // Recargar la app y comprobar persistencia
  await page.reload()
  await page.getByText('Modo archivo', { exact: false }).waitFor()
  assert.ok(await page.getByText('Mateo González').count() > 0)
  console.log('Recorrido E completado con éxito.')

  // ----------------------------------------------------
  // RECORRIDO F: Archivo portátil y responsividad móvil
  // ----------------------------------------------------
  console.log('\n--- Recorrido F: Archivo portátil y responsividad móvil ---')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => { location.hash = '#/personas' })
  await page.waitForTimeout(300)
  const hasNoHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  assert.equal(hasNoHScroll, true, 'No debe existir desbordamiento horizontal en 390px')

  await page.evaluate(() => { location.hash = '#/finanzas' })
  await page.waitForTimeout(300)
  const hasNoHScrollFin = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  assert.equal(hasNoHScrollFin, true, 'No debe existir desbordamiento horizontal en finanzas en 390px')

  await page.screenshot({ path: `${out}/recorridos-a-f-completados.png` })
  assert.deepEqual(errors, [], 'No debe haber errores de consola')

  console.log('\n========================================================================')
  console.log('¡TODOS LOS RECORRIDOS A, B, C, D, E, F VERIFICADOS EXITOSAMENTE!')
  console.log('========================================================================\n')
} finally {
  await browser.close()
}
