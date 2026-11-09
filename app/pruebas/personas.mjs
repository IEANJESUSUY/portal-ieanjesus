// Personas: filtros de bautizados, orden por edad y cumpleaños, e importar el formulario de Google.
import { openDemo, phone, run, shots } from './utiles.mjs'

const CSV = [
  '"Marca temporal","Nombre","Apellidos","Celular","Fecha de nacimiento","Sexo","¿Estás bautizado/a?","¿En qué año te bautizaste?","Si te acordás, ¿cuál fue la fecha exacta de tu bautismo?","¿A qué célula vas?","Barrio","Autorización"',
  '"28/10/2026 20:15:02","Juan","Pérez","099 123 456","15/03/1985","Hombre","Sí","2010","","La Milagrosa","La Milagrosa","Acepto que la iglesia guarde mis datos para contactarme y acompañarme"',
  '"28/10/2026 20:16:40","María","Gómez","098765111","02/11/1992","Mujer","Sí","","21/06/2015","Centro","Centro","Acepto que la iglesia guarde mis datos para contactarme y acompañarme"',
  '"28/10/2026 20:18:11","Lucas","Silva","091222333","10/01/2008","Hombre","No","","","Ninguna todavía","Maldonado Nuevo","Acepto que la iglesia guarde mis datos para contactarme y acompañarme"',
  '"28/10/2026 20:19:00","Ana","Muestra","","","Mujer","Sí","2012","","Cerro Pelado","Cerro Pelado","Acepto que la iglesia guarde mis datos para contactarme y acompañarme"',
  '"28/10/2026 20:20:30","Pedro","Rodríguez","094555666","05/05/1970","Hombre","Sí","1995","","Barrio Norte","Barrio Norte",""',
  '"28/10/2026 20:22:45","Juan","Pérez","099123456","15/03/1985","Hombre","Sí","2010","","La Milagrosa","La Milagrosa","Acepto que la iglesia guarde mis datos para contactarme y acompañarme"'
].join('\n')

await run('Personas: filtros, orden e importación', async ({ browser, check, watch }) => {
  const page = await (await browser.newContext(phone)).newPage()
  watch(page)
  await openDemo(page, /Congregación Maldonado/)
  await page.locator('.mobile-bottom-nav').getByRole('link', { name: 'Personas' }).click()
  await page.locator('.people-tools').waitFor()
  // Las etiquetas de cada celda se ponen un instante después de dibujar la tabla.
  const names = async () => {
    await page.waitForTimeout(250)
    return page.locator('.crm-table tbody td[data-label="Nombre y apellido"]').allInnerTexts()
  }

  const az = await names()
  check(az.join() === [...az].sort((a, b) => a.localeCompare(b, 'es')).join(), 'por defecto, de la A a la Z')
  await page.locator('.people-sort select').selectOption('birthday')
  check(/Cumple (en \d+ días|hoy|mañana)/.test(await page.locator('.birthday-hint').first().innerText()), 'próximos cumpleaños muestra cuánto falta')
  await page.getByRole('button', { name: 'Bautizados', exact: true }).click()
  const baptized = await page.locator('.crm-table tbody td[data-label="Bautismo"]').allInnerTexts()
  check(baptized.length > 0 && baptized.every(b => b !== '—' && b !== 'No'), 'el filtro Bautizados solo muestra bautizados')

  // Importar del formulario de Google
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await page.getByRole('button', { name: /Importar del formulario/ }).click()
  await page.locator('.people-import-file input').setInputFiles({ name: 'respuestas.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) })
  await page.locator('.people-import-list').waitFor()
  const summary = (await page.locator('.people-import-summary').innerText()).replace(/\s+/g, ' ')
  check(summary.includes('3 se agregan') && summary.includes('2 ya estaban') && summary.includes('1 no autorizaron'), `vista previa: ${summary}`)
  await page.screenshot({ path: `${shots}/importar.png`, fullPage: true })
  await page.getByRole('button', { name: /Agregar 3 personas/ }).click()
  await page.locator('.people-import-done').waitFor()
  await page.getByRole('button', { name: 'Ver la lista de personas' }).click()
  await page.getByRole('button', { name: 'Bautizados', exact: true }).click()
  const rows = await page.locator('.crm-table tbody tr').evaluateAll(trs => trs.map(tr => tr.innerText.replace(/\s+/g, ' ')))
  check(rows.some(r => r.includes('Juan Pérez') && r.includes('2010 (aprox.)')), 'Juan entra como bautizado en 2010 (aprox.)')
  check(rows.some(r => r.includes('María Gómez') && r.includes('21/06/2015')), 'María entra con su fecha exacta de bautismo')
  await page.getByRole('button', { name: 'Visitas', exact: true }).click()
  check((await names()).some(n => n.includes('Lucas Silva')), 'Lucas (no bautizado) entra como visita')

  await page.getByRole('button', { name: /Importar del formulario/ }).click()
  await page.locator('.people-import-file input').setInputFiles({ name: 'respuestas.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) })
  await page.locator('.people-import-list').waitFor()
  check((await page.locator('.people-import-summary').innerText()).includes('0 se agregan'), 'importar dos veces el mismo archivo no repite personas')
})
