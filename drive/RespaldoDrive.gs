/**
 * Respaldo del Portal Nacional IEANJESÚS en Google Drive.
 *
 * Se instala una sola vez en script.google.com con la cuenta de Google de la iglesia
 * (ver docs/puesta-en-marcha.md, "Respaldo automático en Google Drive").
 * Todos los días, de madrugada, actualiza en la carpeta del Portal:
 *   1. Dinero      → planilla "Dinero AAAA": resumen por mes, movimientos y servicios (luz, agua…)
 *   2. Informes    → planilla "Informes AAAA" con cada informe mensual y sus números
 *                    + subcarpeta "PDF del año" para guardar los PDF que se descargan del Portal
 *   3. Iglesias    → planilla "Iglesias y comités" con totales de personas por iglesia
 *   4. Respaldos   → copia completa de los datos: una por mes (se guardan todas) y la más reciente
 *
 * La llave de respaldo SOLO permite leer. No puede cambiar ni borrar nada en el Portal.
 * Esta versión del archivo, sin llaves, es la que está en GitHub; la versión con las llaves
 * puestas se pega directo en script.google.com y no se comparte.
 */
const CONFIG = {
  CARPETA_ID: '1wfx6jnv9l99AQsHaBHJyZKYIUC3DHUPn',
  SUPABASE_URL: 'https://esowopogkaiabgefiesj.supabase.co',
  CLAVE_PUBLICA: 'PEGAR_CLAVE_PUBLICA',
  LLAVE_RESPALDO: 'PEGAR_LLAVE_DE_RESPALDO',
  ZONA: 'America/Montevideo'
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const SERVICIOS = ['Luz', 'Agua', 'Internet', 'Teléfono', 'Gas', 'Alquiler']
const COMITES = {
  jovenes: 'Comité de Jóvenes', damas: 'Comité de Damas', caballeros: 'Comité de Caballeros', ninos: 'Comité de Niños',
  musica: 'Comité de Música', misiones: 'Comité de Misiones', evangelismo: 'Comité de Evangelismo', educacion: 'Comité de Educación'
}

// ▶ Ejecutar UNA vez: crea las carpetas, programa la actualización diaria y hace la primera.
function instalar() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'actualizar')
    .forEach(t => ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('actualizar').timeBased().everyDays(1).atHour(3).inTimezone(CONFIG.ZONA).create()
  actualizar()
  Logger.log('Listo. Se va a actualizar solo todos los días a las 3 de la mañana.')
}

// ▶ Se puede ejecutar a mano cuando se quiera ver todo al día.
function actualizar() {
  const registros = leerTodo()
  const datos = organizar(registros)
  const raiz = DriveApp.getFolderById(CONFIG.CARPETA_ID)
  const carpetas = {
    dinero: subcarpeta(raiz, '1. Dinero'),
    informes: subcarpeta(raiz, '2. Informes'),
    iglesias: subcarpeta(raiz, '3. Iglesias'),
    respaldos: subcarpeta(raiz, '4. Respaldos')
  }
  subcarpeta(carpetas.informes, 'PDF del año')

  const anioActual = Number(hoy().slice(0, 4))
  const anios = new Set([anioActual])
  datos.movimientos.forEach(m => anios.add(Number(m.fecha.slice(0, 4))))
  datos.informes.forEach(i => anios.add(Number(String(i.mes).slice(0, 4))))
  // Los años viejos ya no cambian: se rehacen solo el actual y el anterior (salvo que falte la planilla).
  ;[...anios].filter(a => a > 2000).sort().forEach(anio => {
    const reciente = anio >= anioActual - 1
    escribirDinero(carpetas.dinero, anio, datos, reciente)
    escribirInformes(carpetas.informes, anio, datos, reciente)
  })
  escribirIglesias(carpetas.iglesias, datos)
  guardarRespaldo(carpetas.respaldos, registros)
  Logger.log(`Actualizado: ${registros.length} registros.`)
}

// ---------------------------------------------------------------------------------------------
// Lectura desde el Portal (solo lectura, de a 1000 registros)

function leerTodo() {
  if (CONFIG.LLAVE_RESPALDO.indexOf('PEGAR') === 0) throw new Error('Falta pegar la llave de respaldo en CONFIG.')
  const todos = []
  for (let desde = 0; ; desde += 1000) {
    const respuesta = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/drive_export`, {
      method: 'post',
      contentType: 'application/json',
      headers: { apikey: CONFIG.CLAVE_PUBLICA, Authorization: `Bearer ${CONFIG.CLAVE_PUBLICA}` },
      payload: JSON.stringify({ p_token: CONFIG.LLAVE_RESPALDO, p_offset: desde, p_limit: 1000 }),
      muteHttpExceptions: true
    })
    if (respuesta.getResponseCode() !== 200) throw new Error(`El Portal respondió ${respuesta.getResponseCode()}: ${respuesta.getContentText().slice(0, 300)}`)
    const pagina = JSON.parse(respuesta.getContentText())
    todos.push(...pagina)
    if (pagina.length < 1000) return todos
  }
}

function organizar(registros) {
  const de = coleccion => registros.filter(r => r.collection === coleccion).map(r => Object.assign({}, r.body, { id: r.id }))
  const iglesias = de('churches')
  const nombreIglesia = {}
  iglesias.forEach(i => { nombreIglesia[i.id] = i.name || 'Congregación sin nombre' })
  const espacio = fila => {
    if (fila.committeeKey) return COMITES[fila.committeeKey] || `Comité ${fila.committeeKey}`
    return nombreIglesia[fila.preachingPlaceId] || nombreIglesia[fila.churchId] || 'Administración Nacional'
  }
  const movimientos = de('transactions')
    .filter(t => t.date && !['Cuenta por cobrar', 'Cuenta por pagar'].includes(t.accountType))
    .map(t => ({
      fecha: String(t.date).slice(0, 10),
      espacio: espacio(t),
      tipo: t.direction === 'Egreso' ? 'Egreso' : 'Ingreso',
      rubro: rubro(t),
      detalle: [t.name, t.description].filter(Boolean).join(' · '),
      monto: Math.round(Number(t.amount || 0) * 100) / 100
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.espacio.localeCompare(b.espacio))
  const informes = de('monthlyReports')
    .filter(r => r.month)
    .map(r => Object.assign({}, r, { espacio: espacio(r), mes: String(r.month) }))
  return { iglesias, espacio, movimientos, informes, personas: de('people'), grupos: de('groups') }
}

function rubro(t) {
  if (t.direction !== 'Egreso') {
    const texto = [t.category, t.name, t.subCategory].join(' ')
    if (/diezmo/i.test(texto)) return 'Diezmos'
    if (/ofrenda/i.test(texto)) return 'Ofrenda'
    if (/donaci/i.test(texto)) return 'Donación'
    return t.subCategory || t.category || 'Otra entrada'
  }
  if (t.subCategory) return t.subCategory
  const texto = sinTildes([t.name, t.description].join(' '))
  const reglas = [
    ['Luz', /\b(luz|ute|electric)/], ['Agua', /\b(agua|ose)\b/], ['Internet', /internet|wifi|fibra/],
    ['Teléfono', /telefono|celular|recarga/], ['Gas', /\bgas\b|supergas|garrafa/], ['Alquiler', /alquiler/],
    ['Limpieza y materiales', /limpieza|material/], ['Mantenimiento', /mantenimiento|arreglo|reparacion|pintura/],
    ['Ayuda social', /ayuda|canasta|social/], ['Actividades y eventos', /evento|actividad|campamento|retiro/],
    ['Transporte', /transporte|nafta|combustible|pasaje/]
  ]
  const encontrado = reglas.find(([, regla]) => regla.test(texto))
  return encontrado ? encontrado[0] : 'Otro gasto'
}

// ---------------------------------------------------------------------------------------------
// Planillas

function escribirDinero(carpeta, anio, datos, rehacer) {
  const libro = planilla(carpeta, `Dinero ${anio}`, rehacer)
  if (!libro) return
  const delAnio = datos.movimientos.filter(m => m.fecha.startsWith(String(anio)))

  // Resumen: una fila por espacio y mes.
  const resumen = {}
  delAnio.forEach(m => {
    const clave = `${m.espacio}|${m.fecha.slice(5, 7)}`
    const fila = resumen[clave] || (resumen[clave] = { espacio: m.espacio, mes: Number(m.fecha.slice(5, 7)), diezmos: 0, ofrendas: 0, otros: 0, gastos: 0 })
    if (m.tipo === 'Egreso') fila.gastos += m.monto
    else if (m.rubro === 'Diezmos') fila.diezmos += m.monto
    else if (m.rubro === 'Ofrenda') fila.ofrendas += m.monto
    else fila.otros += m.monto
  })
  const filasResumen = Object.values(resumen)
    .sort((a, b) => a.espacio.localeCompare(b.espacio) || a.mes - b.mes)
    .map(f => {
      const ingresos = f.diezmos + f.ofrendas + f.otros
      return [f.espacio, MESES[f.mes - 1], f.diezmos, f.ofrendas, f.otros, ingresos, f.gastos, ingresos - f.gastos]
    })
  hoja(libro, 'Resumen por mes', ['Iglesia o comité', 'Mes', 'Diezmos', 'Ofrendas', 'Otras entradas', 'Total entradas', 'Gastos', 'Saldo del mes'], filasResumen, [3, 4, 5, 6, 7, 8])

  // Totales del año por espacio.
  const totales = {}
  filasResumen.forEach(f => {
    const t = totales[f[0]] || (totales[f[0]] = [f[0], 0, 0, 0, 0, 0, 0])
    for (let i = 2; i <= 7; i++) t[i - 1] += f[i]
  })
  hoja(libro, 'Totales del año', ['Iglesia o comité', 'Diezmos', 'Ofrendas', 'Otras entradas', 'Total entradas', 'Gastos', 'Saldo del año'], Object.values(totales), [2, 3, 4, 5, 6, 7])

  hoja(libro, 'Movimientos', ['Fecha', 'Iglesia o comité', 'Tipo', 'Rubro', 'Detalle', 'Monto'],
    delAnio.map(m => [m.fecha, m.espacio, m.tipo, m.rubro, m.detalle, m.monto]), [6])

  // Servicios del mes: cuánto se pagó de cada uno (vacío = no se anotó).
  const servicios = {}
  delAnio.filter(m => m.tipo === 'Egreso' && SERVICIOS.includes(m.rubro)).forEach(m => {
    const clave = `${m.espacio}|${m.fecha.slice(5, 7)}`
    const fila = servicios[clave] || (servicios[clave] = { espacio: m.espacio, mes: Number(m.fecha.slice(5, 7)), montos: {} })
    fila.montos[m.rubro] = (fila.montos[m.rubro] || 0) + m.monto
  })
  hoja(libro, 'Servicios', ['Iglesia o comité', 'Mes', ...SERVICIOS],
    Object.values(servicios).sort((a, b) => a.espacio.localeCompare(b.espacio) || a.mes - b.mes)
      .map(f => [f.espacio, MESES[f.mes - 1], ...SERVICIOS.map(s => f.montos[s] || '')]), [3, 4, 5, 6, 7, 8])
  quitarHojaVacia(libro)
}

function escribirInformes(carpeta, anio, datos, rehacer) {
  const libro = planilla(carpeta, `Informes ${anio}`, rehacer)
  if (!libro) return
  const filas = datos.informes
    .filter(r => r.mes.startsWith(String(anio)))
    .sort((a, b) => a.espacio.localeCompare(b.espacio) || a.mes.localeCompare(b.mes))
    .map(r => {
      const m = r.metrics || {}
      const periodo = r.mes.includes('-C') ? `Cuatrimestre ${r.mes.slice(-1)}` : MESES[Number(r.mes.slice(5, 7)) - 1] || r.mes
      return [r.espacio, periodo, r.status || '', r.pastor || '', m.encounters || 0, m.attendance || 0, m.men || 0, m.women || 0,
        m.youth || 0, m.children || 0, m.visitors || 0, m.baptismsWater || 0, m.income || 0, m.expenses || 0,
        String(r.updatedAt || '').slice(0, 10)]
    })
  hoja(libro, 'Informes', ['Iglesia', 'Período', 'Estado', 'Pastor', 'Cultos y encuentros', 'Asistencia total', 'Hombres (prom.)',
    'Mujeres (prom.)', 'Jóvenes (prom.)', 'Niños (prom.)', 'Visitas (prom.)', 'Bautismos', 'Entradas', 'Gastos', 'Última modificación'], filas, [13, 14])
  quitarHojaVacia(libro)
}

function escribirIglesias(carpeta, datos) {
  const libro = planilla(carpeta, 'Iglesias y comités', true)
  const filas = datos.iglesias
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    .map(i => {
      // Mismas reglas que Personas en el Portal.
      const gente = datos.personas.filter(p => p.churchId === i.id && !['Inactivo', 'Archivado'].includes(p.status))
      const miembros = gente.filter(p => !['Amigo', 'Visita', 'Seguimiento'].includes(p.status)).length
      const bautizados = gente.filter(p => p.baptized === 'Sí' || (p.baptized !== 'No' && /^\d{4}-\d{2}-\d{2}$/.test(String(p.baptism || '')))).length
      const celulas = datos.grupos.filter(g => g.churchId === i.id && /c[eé]lula|refam/i.test(`${g.kind || ''} ${g.name || ''}`)).length
      return [i.name || '', i.city || i.department || '', i.pastor || '', gente.length, miembros, gente.length - miembros, bautizados, celulas]
    })
  hoja(libro, 'Iglesias', ['Iglesia', 'Ciudad', 'Pastor', 'Personas', 'De la iglesia', 'Visitas', 'Bautizados', 'Células'], filas, [])
  hoja(libro, 'Actualizado', ['Última actualización'], [[Utilities.formatDate(new Date(), CONFIG.ZONA, 'dd/MM/yyyy HH:mm')]], [])
  quitarHojaVacia(libro)
}

function guardarRespaldo(carpeta, registros) {
  // Las fotos quedan en el almacenamiento del Portal y en los PDF: acá se guardan solo sus referencias.
  const liviano = JSON.stringify(registros, (clave, valor) =>
    typeof valor === 'string' && valor.startsWith('data:') ? '[foto]' : valor)
  const mes = hoy().slice(0, 7)
  const nombreMes = `respaldo-${mes}.json`
  if (!carpeta.getFilesByName(nombreMes).hasNext()) carpeta.createFile(nombreMes, liviano, 'application/json')
  const ultimo = carpeta.getFilesByName('respaldo-más-reciente.json')
  if (ultimo.hasNext()) ultimo.next().setContent(liviano)
  else carpeta.createFile('respaldo-más-reciente.json', liviano, 'application/json')
}

// ---------------------------------------------------------------------------------------------
// Ayudas

function subcarpeta(padre, nombre) {
  const existentes = padre.getFoldersByName(nombre)
  return existentes.hasNext() ? existentes.next() : padre.createFolder(nombre)
}

// Devuelve la planilla para escribir, o null si ya existe y no hace falta rehacerla.
function planilla(carpeta, nombre, rehacer) {
  const existentes = carpeta.getFilesByName(nombre)
  if (existentes.hasNext()) return rehacer ? SpreadsheetApp.openById(existentes.next().getId()) : null
  const libro = SpreadsheetApp.create(nombre)
  DriveApp.getFileById(libro.getId()).moveTo(carpeta)
  return libro
}

function hoja(libro, nombre, encabezados, filas, columnasDePlata) {
  const h = libro.getSheetByName(nombre) || libro.insertSheet(nombre)
  h.clear()
  const todo = [encabezados, ...filas]
  h.getRange(1, 1, todo.length, encabezados.length).setValues(todo.map(f => encabezados.map((_, i) => f[i] === undefined ? '' : f[i])))
  h.getRange(1, 1, 1, encabezados.length).setFontWeight('bold').setBackground('#1f3b6b').setFontColor('#ffffff')
  h.setFrozenRows(1)
  if (filas.length) columnasDePlata.forEach(c => h.getRange(2, c, filas.length, 1).setNumberFormat('$ #,##0.00'))
  h.autoResizeColumns(1, encabezados.length)
}

function quitarHojaVacia(libro) {
  const vacia = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1') || libro.getSheetByName('Hoja1')
  if (vacia && libro.getSheets().length > 1) libro.deleteSheet(vacia)
}

function hoy() {
  return Utilities.formatDate(new Date(), CONFIG.ZONA, 'yyyy-MM-dd')
}

function sinTildes(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
