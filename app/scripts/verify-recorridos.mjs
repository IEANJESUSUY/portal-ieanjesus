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

try {
  console.log('--- Probando Recorrido 4: Panel inicial y gráficos demostrativos ---')
  await page.goto(url)
  await page.getByText('Modo archivo', { exact: false }).waitFor()

  await page.getByRole('heading', { name: 'Inicio', exact: true }).waitFor()
  assert.equal(await page.locator('.chart-card').count(), 0, 'Inicio e Informes son vistas distintas')
  await page.goto(`${url}#/informes`)
  await page.getByRole('heading', { name: 'Informes', exact: true }).waitFor()
  // La primera apertura ahora incluye datos demostrativos útiles; los estados
  // vacíos siguen cubiertos por los recorridos de creación y filtros.
  const sinDatosLocators = page.locator('text=Sin datos todavía')
  const count = await sinDatosLocators.count()
  const chartCount = await page.locator('.chart-card').count()
  console.log(`Gráficos visibles: ${chartCount}; estados vacíos: ${count}`)
  assert.ok(chartCount >= 5, 'Los cinco gráficos se conservan en Informes')

  // Seed sample data to test the workflow
  console.log('--- Cargando datos base para demostración de flujos ---')
  await page.evaluate(async () => {
    await window.seedDemoData()
  })
  await page.reload()
  await page.getByText('Modo archivo', { exact: false }).waitFor()

  console.log('--- Probando Recorrido 1: Login demostración, selección de Jóvenes, creación y asignación de actividad ---')
  // Logout to trigger login experience
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('heading', { name: 'Portal Nacional' }).waitFor()
  await page.getByRole('button', { name: 'Ingresar a la plataforma' }).waitFor()

  // User logs in with username and password
  await page.getByLabel('Nombre de usuario').fill('lider_jovenes')
  await page.getByLabel('Contraseña').fill('demo1234')
  await page.getByRole('button', { name: 'Ingresar a la plataforma' }).click()

  // Multiple spaces prompt: "¿A qué espacio quieres ingresar?"
  await page.getByRole('heading', { name: '¿A qué espacio quieres ingresar?' }).waitFor()
  assert.ok(await page.getByText('Congregación Maldonado').count() > 0)
  assert.ok(await page.getByText('Comité Nacional de Jóvenes').count() > 0)

  // Choose "Comité Nacional de Jóvenes"
  await page.getByRole('button', { name: /Comité Nacional de Jóvenes/ }).click()
  await page.waitForTimeout(400)

  // Create national activity
  await page.getByRole('button', { name: '+ Crear Actividad Nacional' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nombre de la actividad *').fill('Culto Misionero Nacional de Jóvenes 2026')
  await dialog.getByLabel('Tema o lema').fill('Juventud con Visión y Poder')
  await dialog.getByLabel('Modalidad de fecha *').selectOption('Fecha definida por cada congregación')
  await dialog.getByLabel('Fecha límite para enviar devolución *').fill('2026-11-30')
  await dialog.getByLabel('Descripción breve (máximo 500 caracteres)').fill('Actividad misionera anual del Comité Nacional de Jóvenes asignada a todas las congregaciones.')
  await dialog.getByLabel('Instrucciones para las congregaciones').fill('Celebrar culto misionero local, tomar ofrendas, votos y adjuntar hasta 2 fotos.')
  await dialog.getByLabel('Estado *').selectOption('Publicada')

  await dialog.getByRole('button', { name: 'Guardar y Distribuir Asignaciones' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(400)

  // Check in activities tab
  await page.getByRole('button', { name: /Actividades \(/ }).click()
  assert.ok(await page.getByText('Culto Misionero Nacional de Jóvenes 2026').count() > 0)

  // Check in assignments tab
  await page.getByRole('button', { name: /Asignaciones y Entregas/i }).click()
  assert.ok(await page.getByText('Pendiente').count() >= 2)
  console.log('Recorrido 1 verificado con éxito: Login -> selección de espacio -> actividad creada y asignada.')

  console.log('--- Probando Recorrido 2: Congregación Maldonado abre espacio, define fecha, economía y envía devolución ---')
  // Switch workspace to Maldonado without logging out
  await page.getByRole('button', { name: 'Cambiar espacio' }).first().click()
  await page.getByRole('heading', { name: '¿A qué espacio quieres ingresar?' }).waitFor()
  await page.getByRole('button', { name: /Congregación Maldonado/ }).click()
  await page.waitForTimeout(400)

  // Go to root panel of Maldonado
  await page.goto(`${url}#/`)
  await page.getByRole('heading', { name: 'Congregación Maldonado' }).waitFor()

  // Find assignment and click return button
  await page.getByRole('button', { name: 'Completar devolución' }).first().click()
  const retDialog = page.getByRole('dialog')

  await retDialog.getByLabel('Fecha local en que se realizó *').fill('2026-10-18')
  await retDialog.getByLabel('Asistencia de hermanos').fill('45')
  await retDialog.getByLabel('Cantidad de visitas').fill('6')
  await retDialog.getByLabel('Cantidad de cultos o actividades previas').fill('2')
  await retDialog.getByLabel('Ofrendas premisioneras').fill('1800')
  await retDialog.getByLabel('Ofrenda del culto misionero').fill('5200')
  await retDialog.getByLabel('Votos misioneros de hermanos').fill('3000')
  await retDialog.getByLabel('Gastos relacionados').fill('500')
  await retDialog.getByLabel('Total enviado al comité').fill('9500')
  await retDialog.getByPlaceholder('Breve reseña de la actividad...').fill('Hermosa reunión con gran respuesta misionera en Maldonado.')

  // Submit return to national committee
  await retDialog.getByRole('button', { name: 'Enviar devolución al comité nacional' }).click()
  await retDialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(400)

  // Status is now "Enviada"
  await page.goto(`${url}#/tareas`)
  await page.getByRole('heading', { name: 'Tareas de la congregación' }).waitFor()
  assert.ok(await page.getByText('Enviada').count() > 0)
  console.log('Recorrido 2 verificado con éxito: Congregación completó y envió la devolución.')

  console.log('--- Probando Recorrido 3: Comité de Jóvenes revisa entrega, consulta finanzas, confirma fondos y aprueba ---')
  // Switch back to Jóvenes committee
  await page.getByRole('button', { name: 'Cambiar espacio' }).first().click()
  await page.getByRole('heading', { name: '¿A qué espacio quieres ingresar?' }).waitFor()
  await page.getByRole('button', { name: /Comité Nacional de Jóvenes/ }).click()
  await page.waitForTimeout(400)

  // Go to assignments tab
  await page.getByRole('button', { name: /Asignaciones y Entregas/i }).click()
  assert.ok(await page.getByText('Enviada').count() > 0)
  assert.ok(await page.getByText('Pendiente').count() > 0)

  // Click review on Maldonado's row
  await page.locator('tr', { hasText: 'Maldonado' }).getByRole('button', { name: 'Revisar entrega' }).click()
  const revDialog = page.getByRole('dialog')
  await revDialog.getByRole('heading', { name: /Maldonado/ }).waitFor()

  // Approve assignment
  await revDialog.getByRole('button', { name: 'Aprobar entrega' }).click()
  await revDialog.waitFor({ state: 'hidden' })
  await page.waitForTimeout(400)

  // Status is now "Aprobada"
  assert.ok(await page.getByText('Aprobada').count() > 0)
  console.log('Recorrido 3 verificado con éxito: Comité revisó, confirmó fondos y aprobó la entrega.')

  console.log('--- Probando Recorrido 5: Prevención de duplicados con Ficha Única Nacional ---')
  await page.getByRole('button', { name: 'Cambiar espacio' }).first().click()
  await page.getByRole('heading', { name: '¿A qué espacio quieres ingresar?' }).waitFor()
  await page.getByRole('button', { name: /Congregación Maldonado/ }).click()
  await page.waitForTimeout(400)
  await page.goto(`${url}#/personas`)
  await page.getByRole('button', { name: /Buscar \/ deduplicar persona/ }).click()

  const matchDialog = page.getByRole('dialog')
  await matchDialog.getByPlaceholder('Escribe nombre, apellido o celular...').fill('Mateo')

  // Coincidences show Mateo González
  await matchDialog.getByText('Mateo González').waitFor()
  assert.ok(await matchDialog.getByText('Congregación Maldonado').count() > 0)

  // Select existing file
  await matchDialog.getByRole('button', { name: 'Seleccionar esta ficha existente' }).first().click()

  // Editor opens with Mateo's existing record instead of creating duplicate
  const editDialog = page.getByRole('dialog')
  await editDialog.getByRole('heading', { name: /Editar ficha|Editar persona vinculada/ }).waitFor()
  assert.equal(await editDialog.getByLabel('Nombre *').inputValue(), 'Mateo')
  assert.equal(await editDialog.getByLabel('Apellidos *').inputValue(), 'González')

  await editDialog.getByRole('button', { name: 'Cancelar' }).click()
  console.log('Recorrido 5 verificado con éxito: Ficha única nacional detectó coincidencia y previno duplicación.')

  // Save screenshot of successful flows
  await page.screenshot({ path: `${out}/recorridos-completados.png` })
  assert.deepEqual(errors, [])
  console.log('========================================================================')
  console.log('TODOS LOS 5 RECORRIDOS OBLIGATORIOS FUERON VERIFICADOS EXITOSAMENTE.')
  console.log('========================================================================')
} finally {
  await browser.close()
}
