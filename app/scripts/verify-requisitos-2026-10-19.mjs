import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(12000)

const errors = []
page.on('pageerror', e => errors.push(e.message))

const url = new URL('../index.html', import.meta.url).href
const out = fileURLToPath(new URL('../../output/playwright/', import.meta.url))
mkdirSync(out, { recursive: true })

async function nav(labelPattern) {
  await page.locator('.nav-list').getByRole('link', { name: labelPattern }).first().click()
  await page.waitForTimeout(250)
}

try {
  console.log('=== VERIFICANDO LOTES 1 A 6 (REQUISITOS-REDISENO-2026-10-19) ===')

  // Lote 5: Presentación inicial con botón Omitir
  await page.goto(url)
  const skipBtn = page.getByRole('button', { name: 'Omitir' })
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click()
  }
  await page.getByText('Modo archivo', { exact: false }).waitFor()
  await page.evaluate(async () => {
    await window.seedDemoData()
  })
  await page.reload()
  await page.getByText('Modo archivo', { exact: false }).waitFor()

  // =========================================================================
  // LOTE 1: ADMINISTRACIÓN NACIONAL
  // =========================================================================
  console.log('--- Lote 1: Administración Nacional ---')
  // Lote 6: el buscador de acciones debe llevar directamente al formulario.
  await page.getByRole('searchbox', { name: 'Buscar qué hacer' }).fill('ingreso')
  await page.getByRole('option', { name: /Registrar un ingreso/ }).click()
  const quickIncomeDialog = page.getByRole('dialog')
  await quickIncomeDialog.getByRole('heading', { name: 'Nuevo movimiento' }).waitFor()
  await quickIncomeDialog.getByRole('button', { name: 'Cancelar' }).click()
  await quickIncomeDialog.waitFor({ state: 'hidden' })
  const nationalActionSearch = page.getByRole('searchbox', { name: 'Buscar qué hacer' })
  await nationalActionSearch.fill('asistencia')
  assert.equal(await page.getByRole('option', { name: /Pasar asistencia/ }).count(), 0, 'Administración Nacional no recibe el atajo de asistencia local')

  // Una lista larga de personas ofrece continuidad explícita, sin cargar todo de golpe.
  await page.goto(`${url}#/personas`)
  await page.getByRole('heading', { name: 'Personas', exact: true }).waitFor()
  const initialPeopleRows = await page.locator('.crm-table tbody tr').count()
  if (initialPeopleRows > 12) {
    const morePeople = page.getByRole('button', { name: /Ver más registros/ })
    await morePeople.waitFor()
    await morePeople.click()
    assert.ok((await page.locator('.crm-table tbody tr').count()) > initialPeopleRows, 'Ver más agrega registros al directorio')
  }

  await page.goto(url)
  await page.getByRole('heading', { name: 'Inicio', exact: true }).waitFor()
  // Segmentación por congregación en Inicio
  assert.ok((await page.locator('.congregation-summary-card').count()) >= 3, 'Tarjetas por congregación en Inicio Nacional')
  assert.ok((await page.locator('.calendar-preview-widget').count()) >= 1, 'Vista previa de calendario en Inicio Nacional')

  // Cultos en Administración Nacional: NO muestra .service-schedule-panel local, sí muestra Eventos Nacionales Extraordinarios
  await nav(/Cultos/)
  assert.equal(await page.locator('.service-schedule-panel').count(), 0, 'Admin Nacional no muestra configuración de horarios locales')
  await page.getByText('Eventos Nacionales Extraordinarios', { exact: true }).first().waitFor()

  // Calendario Nacional
  await nav(/Calendario/)
  await page.getByRole('heading', { name: /Calendario/i }).first().waitFor()
  assert.ok((await page.locator('.calendar-month-grid').count()) === 1, 'Calendario visual mensual activo')
  assert.equal(await page.locator('.calendar-admin-list').count(), 0, 'La agenda mensual no duplica el listado administrativo')
  await page.getByRole('tab', { name: /Lista de eventos/ }).click()
  assert.equal(await page.locator('.calendar-main-layout').count(), 0, 'La vista lista no repite el calendario y la agenda')
  assert.equal(await page.locator('.calendar-admin-list').count(), 1, 'La vista lista concentra la gestión administrativa')
  await page.getByRole('tab', { name: /Mes y agenda/ }).click()

  // Finanzas Nacionales segmentadas por congregación
  await nav(/Finanzas/)
  await page.getByText('Estado financiero segmentado por congregación').first().waitFor()
  assert.ok((await page.locator('.congregation-summary-card').count()) >= 3, 'Finanzas segmentadas por congregación')

  // Células agrupadas por congregación
  await nav(/Células/)
  await page.getByText('Células e informes semanales por congregación').first().waitFor()

  // Comités Nacionales y Tareas (sin mezclar células)
  await nav(/Comités/)
  await page.getByRole('heading', { name: /Comités Nacionales/i }).first().waitFor()

  // Informes Nacionales: Recepción y revisión por congregación
  await nav(/Informes/)
  await page.getByText(/Informes recibidos por congregación|Estado de entrega por congregación/i).first().waitFor()

  // Comunicación Nacional (/comunicacion)
  await nav(/Comunicación/)
  await page.getByRole('heading', { name: /Comunicación/i }).first().waitFor()
  await page.getByPlaceholder(/Escribe tu mensaje/i).fill('Mensaje de prueba desde Administración Nacional.')
  await page.getByRole('button', { name: /Enviar/i }).click()
  await page.getByText('Mensaje de prueba desde Administración Nacional.').first().waitFor()
  console.log('✓ Lote 1 verificado.')

  // =========================================================================
  // LOTE 2: COMITÉ NACIONAL DE JÓVENES
  // =========================================================================
  console.log('--- Lote 2: Comité Nacional de Jóvenes ---')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  // Lote 5: probar mostrar/ocultar contraseña en login
  await page.getByLabel('Nombre de usuario').fill('lider_jovenes')
  await page.getByLabel('Contraseña').fill('demo1234')
  await page.getByRole('button', { name: 'Alternar visibilidad de clave' }).click()
  assert.equal(await page.getByLabel('Contraseña').getAttribute('type'), 'text', 'Toggle muestra contraseña')
  await page.getByRole('button', { name: 'Ingresar a la plataforma' }).click()
  await page.getByRole('button', { name: /Comité Nacional de Jóvenes/ }).click()
  await page.waitForTimeout(300)

  // Panel del comité (/) vs Actividades y matriz (/comites)
  await page.getByText('Estado de respuestas y asistencia por iglesia').first().waitFor()
  await nav(/Actividades y matriz/)
  await page.getByText('Actividades publicadas por el comité').first().waitFor()
  // Asistencia en eventos del comité (Presencial y Online por congregación)
  await page.getByRole('button', { name: /Asistencia en eventos/i }).click()
  await page.getByText(/Asistencia en encuentros del .* por congregación/i).first().waitFor()

  // Informes propios del comité segmentados por congregación
  await nav(/Informes/)
  await page.getByText(/Actividades, asistencia y respuestas del/i).first().waitFor()
  console.log('✓ Lote 2 verificado.')

  // =========================================================================
  // LOTE 3: CONGREGACIÓN MALDONADO (COMITÉS LOCALES Y MATRIZ DE ASISTENCIA)
  // =========================================================================
  console.log('--- Lote 3: Congregación Maldonado ---')
  await page.getByRole('button', { name: 'Cambiar espacio' }).first().click()
  await page.getByRole('button', { name: /Congregación Maldonado/ }).click()
  await page.waitForTimeout(300)

  // Cultos habituales de Maldonado: solo Jueves y Domingo + Planilla histórica automática
  await nav(/Cultos/)
  const scheduleChips = await page.locator('.schedule-chip').count()
  assert.equal(scheduleChips, 2, 'Maldonado tiene exactamente 2 cultos habituales (Jueves y Domingo)')
  await page.getByRole('heading', { name: 'Matriz de asistencia por persona y encuentro' }).waitFor()
  assert.ok((await page.locator('.attendance-matrix-table tbody tr').count()) > 0, 'Planilla histórica tiene filas por persona')

  // Comités locales separados de células
  await nav(/Comités locales/)
  await page.getByRole('heading', { name: /Comités locales/i }).waitFor()
  const pageText = await page.locator('.people-page').innerText()
  assert.equal(pageText.includes('San Antonio II'), false, 'Las células no se mezclan dentro de Comités locales')
  console.log('✓ Lote 3 verificado.')

  // =========================================================================
  // LOTE 4: RESPONSIVIDAD MÓVIL (360px y 390px) Y MODALES
  // =========================================================================
  console.log('--- Lote 4: Modales en móvil (360px y 390px) y Calendario ---')
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(`${url}#/calendario`)
    await page.waitForTimeout(250)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `Calendario sin desbordamiento horizontal en ${width}px`
    )
    // Abrir modal Nuevo evento en móvil
    await page.getByRole('button', { name: /Nuevo registro|Nuevo evento/i }).first().click()
    const evDialog = page.getByRole('dialog')
    await evDialog.waitFor()
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `Modal de Nuevo evento sin desbordamiento horizontal en ${width}px`
    )
    await evDialog.getByRole('button', { name: 'Cancelar' }).click()

    // El formulario financiero también mantiene sus campos y acciones en flujo, sin taparse.
    await page.getByRole('searchbox', { name: 'Buscar qué hacer' }).fill('gasto')
    await page.getByRole('option', { name: /Registrar un gasto/ }).click()
    const financeDialog = page.getByRole('dialog')
    await financeDialog.getByRole('heading', { name: 'Nuevo movimiento' }).waitFor()
    const financeLayout = await page.evaluate(() => {
      const fields = document.querySelector('.record-dialog .record-fields')?.getBoundingClientRect()
      const actions = document.querySelector('.record-dialog .modal-actions')?.getBoundingClientRect()
      return {
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        fieldsBottom: fields?.bottom ?? -1,
        actionsTop: actions?.top ?? -1
      }
    })
    assert.equal(financeLayout.noHorizontalOverflow, true, `Formulario financiero sin desborde horizontal en ${width}px`)
    assert.ok(financeLayout.actionsTop >= financeLayout.fieldsBottom, `Guardar/cancelar debajo de los campos en ${width}px`)
    await financeDialog.getByRole('button', { name: 'Cancelar' }).click()
  }
  console.log('✓ Lotes 4, 5 y 6 verificados.')

  assert.deepEqual(errors, [], 'Sin errores de consola en Lotes 1 a 5')
  console.log('=== TODOS LOS LOTES 1 A 6 VERIFICADOS EXITOSAMENTE ===')
} finally {
  await browser.close()
}
