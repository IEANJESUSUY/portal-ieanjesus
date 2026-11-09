// Versión web conectada a la base central, contra un Supabase simulado: entrar, permisos, guardar y salir.
// La compila probar.mjs con VITE_SUPABASE_URL=https://pn-prueba.supabase.co en tmp/pruebas/web.
import { pathToFileURL } from 'node:url'
import { phone, run, shots, testPhoto } from './utiles.mjs'

const BASE = 'https://pn-prueba.supabase.co'
const url = pathToFileURL(`${shots}web/index.html`).href

const USERS = { 'pastor@prueba.uy': 'u1', 'admin@prueba.uy': 'u2', 'nuevo@prueba.uy': 'u3' }

await run('Base central (Supabase simulado)', async ({ browser, check, watch }) => {
  const memberships = [
    { id: 'm1', user_id: 'u1', email: 'pastor@prueba.uy', space_type: 'church', church_id: 'ch-mal', role: 'Pastor', display_name: 'Pastor Prueba' },
    { id: 'm2', user_id: 'u2', email: 'admin@prueba.uy', space_type: 'national_admin', church_id: null, role: 'Administración Nacional', display_name: 'Admin' }
  ]
  const signups = []
  const uploads = []
  const signed = []
  const store = new Map([
    ['ch-mal', { id: 'ch-mal', collection: 'churches', church_id: 'ch-mal', body: { id: 'ch-mal', name: 'Congregación Maldonado', city: 'Maldonado', isPreachingPlace: 'No' } }],
    ['ch-otra', { id: 'ch-otra', collection: 'churches', church_id: 'ch-otra', body: { id: 'ch-otra', name: 'Congregación Salto', city: 'Salto', isPreachingPlace: 'No' } }],
    ['p-otra', { id: 'p-otra', collection: 'people', church_id: 'ch-otra', body: { id: 'p-otra', name: 'Persona', surname: 'De Salto', churchId: 'ch-otra', status: 'Amigo' } }]
  ])
  const writes = []
  const context = await browser.newContext(phone)
  await context.route(`${BASE}/**`, async route => {
    const req = route.request()
    const u = new URL(req.url())
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (u.pathname === '/auth/v1/token') {
      const body = req.postDataJSON()
      if (u.searchParams.get('grant_type') === 'password' && !(USERS[body.email] && body.password === 'clave123')) {
        return json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
      }
      return json(200, { access_token: `tok-${USERS[body.email] || 'u1'}`, refresh_token: 'ref', expires_in: 3600, user: { id: USERS[body.email] || 'u1', email: body.email || 'pastor@prueba.uy' } })
    }
    if (u.pathname === '/auth/v1/signup') {
      const body = req.postDataJSON()
      signups.push(body.email)
      return json(200, { id: 'u3', email: body.email })
    }
    if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 })
    const user = req.headers().authorization?.match(/^Bearer tok-(u\d)$/)?.[1]
    if (!user) return json(401, { message: 'JWT inválido' })
    // Almacenamiento de fotos: subir y pedir enlaces temporales.
    if (u.pathname === '/storage/v1/object/sign/fotos') {
      const { paths } = req.postDataJSON()
      signed.push(...paths)
      return json(200, paths.map(p => ({ path: p, signedURL: `/object/sign/fotos/${p}?token=prueba`, error: null })))
    }
    if (u.pathname.startsWith('/storage/v1/object/fotos/')) {
      const path = u.pathname.replace('/storage/v1/object/fotos/', '')
      if (!path.startsWith('ch-mal/')) return json(403, { message: 'new row violates row-level security policy' })
      uploads.push({ path, type: req.headers()['content-type'], kb: Math.round((req.postDataBuffer()?.length || 0) / 1024) })
      return json(200, { Key: `fotos/${path}` })
    }
    if (u.pathname === '/rest/v1/memberships' && req.method() === 'GET') {
      return json(200, memberships.filter(m => m.user_id === u.searchParams.get('user_id')?.replace('eq.', '')))
    }
    if (u.pathname === '/rest/v1/rpc/list_memberships') return json(200, user === 'u2' ? memberships : [])
    if (u.pathname === '/rest/v1/rpc/assign_membership') {
      const p = req.postDataJSON()
      if (user !== 'u2') return json(400, { message: 'Solo la Administración Nacional puede dar permisos.' })
      if (!USERS[p.p_email]) return json(400, { message: 'Ese correo todavía no creó su usuario en el Portal.' })
      memberships.push({ id: `m${memberships.length + 1}`, user_id: USERS[p.p_email], email: p.p_email, space_type: p.p_space_type, church_id: p.p_church_id || null, committee_key: p.p_committee_key || null, role: p.p_role, display_name: p.p_display_name })
      return route.fulfill({ status: 204 })
    }
    if (u.pathname === '/rest/v1/records' && req.method() === 'GET') {
      const only = u.searchParams.get('collection')?.replace('eq.', '')
      // Reglas de acceso simuladas: el pastor ve su congregación y la lista de iglesias.
      const rows = [...store.values()].filter(r => (!only || r.collection === only) && (user === 'u2' || r.collection === 'churches' || r.church_id === 'ch-mal'))
      const offset = Number(u.searchParams.get('offset') || 0)
      return json(200, rows.slice(offset, offset + Number(u.searchParams.get('limit') || 1000)))
    }
    if (u.pathname === '/rest/v1/records' && req.method() === 'POST') {
      for (const row of req.postDataJSON()) {
        if (row.church_id !== 'ch-mal') return json(403, { message: 'new row violates row-level security policy' })
        store.set(row.id, row)
        writes.push(`${row.collection}:${row.church_id}`)
      }
      return route.fulfill({ status: 201 })
    }
    return json(404, { message: 'no encontrado' })
  })
  const page = await context.newPage()
  watch(page)
  await page.goto(url)
  await page.locator('.cloud-login').waitFor()
  check(await page.getByRole('button', { name: /Abrir preparación local/ }).count() === 0, 'con base central se entra con correo y contraseña')
  await page.getByLabel('Correo').fill('pastor@prueba.uy')
  await page.getByLabel('Contraseña', { exact: true }).fill('mala')
  await page.getByRole('button', { name: /Entrar/ }).click()
  check((await page.locator('.cloud-login-error').innerText()).includes('no coinciden'), 'contraseña equivocada: aviso claro')
  await page.getByLabel('Contraseña', { exact: true }).fill('clave123')
  await page.getByRole('button', { name: /Entrar/ }).click()
  await page.getByRole('button', { name: 'Saltar' }).click({ timeout: 15000 })
  await page.getByText('Dios te bendiga').waitFor()
  check(true, 'el pastor entra directo a su congregación')

  await page.getByRole('button', { name: /Anotar persona nueva/ }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Ana')
  await page.getByLabel(/Apellido/).fill('Nube')
  await page.getByRole('button', { name: 'Mujer' }).click()
  await page.getByRole('button', { name: /^Adulto/ }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.getByText('¡Persona anotada!').waitFor()
  check(writes.includes('people:ch-mal'), 'la persona se guarda en la base, en su congregación')
  await page.getByRole('button', { name: 'Volver al inicio' }).click()
  await page.locator('.mobile-bottom-nav').getByRole('link', { name: 'Personas' }).click()
  const names = (await page.locator('.crm-table tbody td[data-label="Nombre y apellido"]').allInnerTexts()).join(' | ')
  check(names.includes('Ana Nube') && !names.includes('De Salto'), 've sus personas y no las de otra iglesia')

  // Gasto con foto del recibo: la foto va al almacenamiento y en la base queda solo la referencia.
  await page.locator('.mobile-bottom-nav').getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('button', { name: /Anotar dinero/ }).click()
  await page.getByRole('button', { name: /Salió plata/ }).click()
  await page.getByLabel('Importe en pesos').fill('1800')
  await page.getByRole('button', { name: /Siguiente/ }).click()
  await page.getByRole('button', { name: /^Luz/ }).click()
  await page.locator('label', { hasText: /foto del recibo/ }).locator('input[type="file"]').setInputFiles(await testPhoto(browser, { width: 3000, height: 4000 }))
  await page.getByText('Foto del recibo agregada ✓').waitFor()
  await page.getByRole('button', { name: /^Guardar$/ }).click()
  await page.getByText('¡Anotado!').waitFor()
  const upload = uploads[0]
  const movement = [...store.values()].find(r => r.collection === 'transactions')
  check(Boolean(upload) && upload.type === 'image/webp' && upload.kb < 200, `la foto del recibo se sube comprimida al almacenamiento (${upload?.kb} KB, WebP)`)
  check(movement?.body.receiptPhoto === `storage:${upload?.path}`, 'en la base queda solo la referencia a la foto, no la imagen')

  await page.reload()
  await page.getByText(/Dios te bendiga|Personas/).first().waitFor({ timeout: 15000 })
  check(true, 'al recargar sigue adentro')
  check(signed.includes(upload?.path), 'al cargar, pide un enlace temporal para ver la foto')
  await page.locator('button[aria-label*="Cerrar sesión"], button[title*="Cerrar sesión"], button[aria-label*="Salir"]').first().click()
  await page.locator('.cloud-login').waitFor()
  check(await page.evaluate(() => !localStorage.getItem('pn_cloud_session')), 'al salir se borra la sesión del dispositivo')

  // Una persona nueva crea su usuario
  await page.getByRole('button', { name: /Es mi primera vez/ }).click()
  await page.getByLabel('Correo').fill('nuevo@prueba.uy')
  await page.getByLabel('Contraseña', { exact: true }).fill('clave123')
  await page.getByRole('button', { name: /Crear mi usuario/ }).click()
  await page.locator('.cloud-login-notice').waitFor()
  check(signups.includes('nuevo@prueba.uy'), 'crear mi usuario registra el correo y avisa que falta la habilitación')

  // La Administración Nacional le da acceso a Maldonado desde Configuración
  await page.getByLabel('Correo').fill('admin@prueba.uy')
  await page.getByLabel('Contraseña', { exact: true }).fill('clave123')
  await page.getByRole('button', { name: /^Entrar/ }).click()
  await page.getByRole('button', { name: /Administración Nacional/ }).first().click({ timeout: 15000 })
  await page.evaluate(() => { location.hash = '#/configuracion' })
  await page.locator('.users-admin').waitFor()
  await page.locator('.users-admin-form').getByLabel('Correo de la persona').fill('nuevo@prueba.uy')
  await page.locator('.users-admin-form').getByLabel(/Nombre/).fill('Hna. Nueva')
  await page.locator('.users-admin-form select').first().selectOption('church:ch-mal')
  await page.locator('.users-admin-form select').nth(1).selectOption('Secretaría')
  await page.getByRole('button', { name: /Dar acceso/ }).click()
  await page.locator('.users-admin .crm-success').waitFor()
  check((await page.locator('.users-admin-list').innerText()).includes('Hna. Nueva'), 'la Administración Nacional asigna el espacio y aparece en la lista')
  await page.screenshot({ path: `${shots}/usuarios.png`, fullPage: true })
})
