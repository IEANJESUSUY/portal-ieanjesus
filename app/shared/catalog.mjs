const field = (key, label, type = 'text', required = false, options = []) => ({ key, label, type, required, options })
const church = field('churchId', 'Congregación', 'churches', true)
const optionalChurch = field('churchId', 'Congregación', 'churches', false)
const name = field('name', 'Nombre', 'text', true)
const notes = field('notes', 'Observaciones administrativas', 'textarea')

export const NATIONAL_COMMITTEES = [
  { key: 'escuela_dominical', name: 'Escuela Dominical', icon: 'BookOpen' },
  { key: 'jovenes', name: 'Jóvenes', icon: 'Sparkles' },
  { key: 'damas', name: 'Damas Dorcas', icon: 'HeartHandshake' },
  { key: 'caballeros', name: 'Caballeros', icon: 'Shield' },
  { key: 'obra_social', name: 'Obra Social', icon: 'HandHelping' },
  { key: 'misiones', name: 'Misiones', icon: 'Compass' },
  { key: 'comunicaciones', name: 'Comunicaciones', icon: 'Radio' },
  { key: 'musica', name: 'Música', icon: 'Music' }
]

export const LOCAL_COMMITTEES = [
  'Escuela Dominical',
  'Jóvenes',
  'Damas Dorcas',
  'Caballeros',
  'Misiones',
  'Comunicaciones',
  'Música',
  'Obra Social',
  'Junta Local'
]

export const EVENT_CATEGORIES = [
  'Culto',
  'Ayuno',
  'Devocional',
  'Jóvenes',
  'Oración',
  'Célula',
  'Evento',
  'Reunión',
  'Convención',
  'Campamento',
  'Capacitación',
  'Culto misionero',
  'Vigilia'
]

const COMMITTEE_KEYS = ['escuela_dominical', 'jovenes', 'damas', 'caballeros', 'obra_social', 'misiones', 'comunicaciones', 'musica']

export const DEMO_USERS = [
  {
    username: 'pastor_maldonado',
    displayName: 'Pastor Maldonado',
    spaces: [
      { id: 'ch-maldonado', type: 'church', name: 'Congregación Maldonado', role: 'Pastor' },
      { id: 'ch-san-carlos', type: 'preaching_place', name: 'Lugar de Predicación San Carlos', parentChurchId: 'ch-maldonado', role: 'Encargado' }
    ]
  },
  {
    username: 'encargado_sancarlos',
    displayName: 'Roberto Gómez (San Carlos)',
    spaces: [
      { id: 'ch-san-carlos', type: 'preaching_place', name: 'Lugar de Predicación San Carlos', parentChurchId: 'ch-maldonado', role: 'Encargado' }
    ]
  },
  {
    username: 'lider_jovenes',
    displayName: 'Líder Juvenil Nacional',
    spaces: [
      { id: 'ch-maldonado', type: 'church', name: 'Congregación Maldonado', role: 'Miembro' },
      { id: 'com-jovenes', type: 'national_committee', committeeKey: 'jovenes', name: 'Comité Nacional de Jóvenes', role: 'Presidente' }
    ]
  },
  {
    username: 'damas_salto',
    displayName: 'Responsable Damas y Salto',
    hidden: true,
    spaces: [
      { id: 'ch-salto', type: 'church', name: 'Congregación Salto', role: 'Secretaria' },
      { id: 'com-damas', type: 'national_committee', committeeKey: 'damas', name: 'Comité Nacional de Damas Dorcas', role: 'Coordinadora' }
    ]
  },
  {
    username: 'musica_nacional',
    displayName: 'Director de Música Nacional',
    hidden: true,
    spaces: [
      { id: 'com-musica', type: 'national_committee', committeeKey: 'musica', name: 'Comité Nacional de Música', role: 'Director Nacional' }
    ]
  },
  {
    username: 'comunicaciones_nal',
    displayName: 'Equipo de Comunicaciones',
    hidden: true,
    spaces: [
      { id: 'com-comunicaciones', type: 'national_committee', committeeKey: 'comunicaciones', name: 'Comité Nacional de Comunicaciones', role: 'Coordinador' }
    ]
  },
  {
    username: 'admin_nacional',
    displayName: 'Administración General',
    spaces: [
      { id: 'admin-nacional', type: 'national_admin', name: 'Administración Nacional', role: 'Superadministrador' }
    ]
  }
]

export const DEFAULT_AGE_RANGES = {
  kidsMaxAge: 11,
  youthMinAge: 12,
  youthMaxAge: 25,
  adultMinAge: 26
}

export function segmentPerson(person, customRanges = DEFAULT_AGE_RANGES) {
  const segments = []
  const age = calculateAge(person?.birthday)
  if (!person?.birthday || age === null) {
    segments.push('Personas sin fecha de nacimiento')
  } else {
    if (age <= customRanges.kidsMaxAge) segments.push('Niños')
    if (age >= customRanges.youthMinAge && age <= customRanges.youthMaxAge) segments.push('Jóvenes')
    if (age >= customRanges.adultMinAge) {
      if (person.gender === 'Femenino') segments.push('Damas')
      else if (person.gender === 'Masculino') segments.push('Caballeros')
      else segments.push('Adultos')
    }
  }
  if (person?.familyId) segments.push('Familias')
  if (segments.length === 0) segments.push('Personas sin clasificación')
  return segments
}

export const catalog = {
  churches: {
    title: 'Iglesias y lugares de predicación',
    fields: [
      name,
      field('pastor', 'Pastor o responsable'),
      field('phone', 'Teléfono', 'tel'),
      field('email', 'Correo', 'email'),
      field('address', 'Dirección'),
      field('city', 'Ciudad'),
      field('department', 'Departamento'),
      field('isPreachingPlace', '¿Es lugar de predicación?', 'select', false, ['No', 'Sí']),
      field('parentChurchId', 'Congregación madre (solo para lugar de predicación)', 'churches'),
      field('cells', '¿Tiene células?', 'select', false, ['No', 'Sí']),
      notes
    ]
  },
  families: {
    title: 'Familias',
    fields: [
      name,
      church,
      field('zone', 'Barrio o zona', 'text', true),
      field('address', 'Dirección (opcional)'),
      field('phone', 'Teléfono familiar', 'tel'),
      notes
    ]
  },
  people: {
    title: 'Personas',
    fields: [
      name,
      field('surname', 'Apellidos', 'text', true),
      church,
      field('preachingPlaceId', 'Lugar de predicación vinculado', 'churches'),
      field('familyId', 'Familia', 'families'),
      field('familyRole', 'Vínculo familiar', 'select', false, ['Padre', 'Madre', 'Hijo/a', 'Abuelo/a', 'Nieto/a', 'Tutor/a', 'Otro']),
      field('gender', 'Género', 'select', false, ['Femenino', 'Masculino', 'No informado']),
      field('birthday', 'Fecha de nacimiento', 'date'),
      field('ageGroup', 'Edad aproximada', 'select', false, ['Niño', 'Joven', 'Adulto']),
      field('phone', 'Celular', 'tel'),
      field('address', 'Dirección'),
      field('baptism', 'Fecha de bautismo', 'date'),
      field('role', 'Responsabilidad o comité'),
      field('status', 'Tipo de registro', 'select', true, ['Amigo', 'Persona vinculada', 'Inactivo', 'Miembro', 'Visita']),
      field('photo', 'Fotografía', 'photo'),
      notes
    ]
  },
  serviceSchedules: {
    title: 'Cultos habituales',
    fields: [
      name,
      church,
      field('day', 'Día habitual', 'select', true, ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']),
      field('time', 'Hora', 'time', true),
      field('location', 'Lugar'),
      field('status', 'Estado', 'select', true, ['Activo', 'Inactivo'])
    ]
  },
  monthlyReports: {
    title: 'Informes mensuales',
    fields: [
      name,
      church,
      field('month', 'Mes informado', 'text', true),
      field('reportType', 'Tipo de informe', 'select', false, ['monthly', 'quarterly']),
      field('status', 'Estado', 'select', true, ['Borrador', 'Guardado', 'Enviado', 'Recibido', 'Revisado', 'Observado']),
      field('pastor', 'Pastor / responsable'),
      field('license', 'Licencia pastoral'),
      field('place', 'Lugar'),
      field('secretary', 'Secretaría'),
      field('from', 'Desde', 'date'),
      field('to', 'Hasta', 'date'),
      field('summary', 'Actividades destacadas', 'textarea'),
      notes
    ]
  },
  events: {
    title: 'Calendario y cultos',
    fields: [
      name,
      optionalChurch,
      field('date', 'Fecha', 'date', true),
      field('time', 'Hora', 'time'),
      field('kind', 'Tipo', 'select', true, EVENT_CATEGORIES),
      field('location', 'Lugar'),
      field('modality', 'Modalidad', 'select', false, ['Presencial', 'Online', 'Híbrido']),
      field('onlineUrl', 'Enlace o acceso online', 'text'),
      field('responsible', 'Responsable'),
      field('committeeKey', 'Comité relacionado', 'text'),
      field('activityId', 'Actividad nacional vinculada', 'text'),
      field('scopeAudience', 'Alcance', 'select', false, ['Congregación local', 'Lugar de predicación', 'Comité nacional', 'Nacional', 'Público general']),
      field('publicVisible', 'Visibilidad pública', 'select', false, ['Sí', 'No']),
      field('featured', 'Destacar evento', 'select', false, ['Sí', 'No']),
      field('showInChurchCalendar', 'Mostrar en calendario de la iglesia', 'select', false, ['Sí', 'No']),
      field('scheduleId', 'Horario habitual origen', 'text'),
      notes
    ]
  },
  groups: {
    title: 'Comités y células',
    fields: [
      name,
      field('kind', 'Tipo', 'select', true, ['Comité nacional', 'Comité local', 'Célula', 'Escuela bíblica', 'Junta local']),
      field('churchId', 'Congregación (vacío para comité nacional)', 'churches'),
      field('committeeKey', 'Comité nacional vinculado', 'text'),
      field('leaderId', 'Responsable', 'people'),
      field('schedule', 'Horario habitual'),
      field('location', 'Lugar'),
      notes
    ]
  },
  cellReports: {
    title: 'Informes semanales de células',
    fields: [
      name,
      church,
      field('groupId', 'Célula o grupo de amistad', 'groups', true),
      field('weekStart', 'Inicio de la semana', 'date', true),
      field('weekEnd', 'Fin de la semana', 'date', true),
      field('adults', 'Adultos', 'number', true),
      field('visitors', 'Visitas', 'number', true),
      field('children', 'Niños', 'number', true),
      field('offering', 'Ofrenda en pesos uruguayos', 'number', true),
      field('leader', 'Líder que informó'),
      field('source', 'Origen', 'select', true, ['Carga local', 'Google Forms / CSV', 'Enlace público de Google Sheets']),
      notes
    ]
  },
  transactions: {
    title: 'Finanzas',
    fields: [
      name,
      optionalChurch,
      field('date', 'Fecha', 'date', true),
      field('direction', 'Movimiento', 'select', true, ['Ingreso', 'Egreso']),
      field('category', 'Concepto', 'select', true, ['Diezmo', 'Ofrenda', 'Donación', 'Gasto', 'Otro']),
      field('accountType', 'Clasificación financiera', 'select', false, ['Operación', 'Activo', 'Pasivo', 'Cuenta por cobrar', 'Cuenta por pagar']),
      field('subCategory', 'Subcategoría o destino', 'text'),
      field('amount', 'Importe en pesos uruguayos', 'money', true),
      field('eventId', 'Culto o evento relacionado', 'events'),
      field('activityId', 'Actividad nacional relacionada', 'text'),
      field('committeeKey', 'Comité nacional relacionado', 'text'),
      field('financialStatus', 'Estado del movimiento', 'select', false, ['Registrado', 'Preparado para enviar', 'Enviado', 'Recibido', 'Conciliado', 'Observado']),
      field('personId', 'Aportante (opcional)', 'people'),
      field('groupId', 'Comité o célula (opcional)', 'groups'),
      field('receiptPhoto', 'Comprobante', 'photo'),
      field('reference', 'Referencia de comprobante'),
      notes
    ]
  },
  nationalActivities: {
    title: 'Actividades nacionales',
    fields: [
      name,
      field('kind', 'Tipo de actividad', 'select', true, ['Culto misionero', 'Vigilia', 'Capacitación', 'Campaña', 'Reunión nacional', 'Actividad especial', 'Convención', 'Campamento']),
      field('motto', 'Tema o lema', 'text'),
      field('description', 'Descripción breve (máx. 500 caracteres)', 'textarea'),
      field('committeeKey', 'Comité responsable', 'select', true, COMMITTEE_KEYS),
      field('modality', 'Modalidad', 'select', false, ['Presencial', 'Online', 'Híbrido']),
      field('onlineUrl', 'Enlace o acceso online', 'text'),
      field('scopeType', 'Alcance', 'select', true, ['Todas las congregaciones', 'Congregaciones seleccionadas']),
      field('dateMode', 'Modalidad de fecha', 'select', true, ['Fecha nacional común', 'Fecha definida por cada congregación']),
      field('date', 'Fecha general', 'date'),
      field('deadline', 'Fecha límite para enviar devolución', 'date', true),
      field('maxPhotos', 'Cantidad máxima de fotografías', 'text'),
      field('status', 'Estado', 'select', true, ['Borrador', 'Publicada', 'En desarrollo', 'Terminada', 'Archivada']),
      notes
    ]
  },
  activityAssignments: {
    title: 'Asignaciones de actividades',
    fields: [
      name,
      field('activityId', 'Actividad nacional', 'text', true),
      church,
      field('status', 'Estado de la asignación', 'select', true, ['Pendiente', 'Iniciada', 'Enviada', 'Observada', 'Corregida', 'Aprobada']),
      field('localDate', 'Fecha local', 'date'),
      field('eventId', 'Culto local relacionado', 'events'),
      field('places', 'Lugares donde se realizó', 'text'),
      field('description', 'Descripción de lo realizado', 'textarea'),
      notes
    ]
  },
  committeeMembers: {
    title: 'Líderes y miembros de comités',
    fields: [
      field('personId', 'Persona', 'people', true),
      optionalChurch,
      field('committeeKey', 'Comité nacional', 'select', true, COMMITTEE_KEYS),
      field('isLocalLeader', '¿Es líder local?', 'select', true, ['Sí', 'No']),
      field('roleSpecialty', 'Especialidad o función', 'text'),
      field('startDate', 'Fecha de inicio', 'date'),
      field('status', 'Estado', 'select', true, ['Activo', 'Inactivo']),
      notes
    ]
  },
  designRequests: {
    title: 'Solicitudes de diseño (Comunicaciones)',
    fields: [
      name,
      field('category', 'Categoría', 'select', true, ['Afiche', 'Cumpleaños pastor/esposa', 'Línea gráfica', 'Campaña', 'Otro']),
      optionalChurch,
      field('committeeKey', 'Comité solicitante', 'text'),
      field('deadline', 'Fecha límite', 'date'),
      field('status', 'Estado', 'select', true, ['Solicitado', 'En desarrollo', 'Entregado']),
      field('description', 'Descripción del trabajo solicitado', 'textarea'),
      field('finalFile', 'Archivos finales', 'text'),
      notes
    ]
  },
  socialMetrics: {
    title: 'Métricas de redes sociales',
    fields: [
      church,
      field('platform', 'Plataforma', 'select', true, ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'Otra']),
      field('initialDate', 'Fecha inicial', 'date', true),
      field('initialFollowers', 'Seguidores iniciales', 'text', true),
      field('currentDate', 'Fecha actual', 'date', true),
      field('currentFollowers', 'Seguidores actuales', 'text', true),
      notes
    ]
  },
  messages: {
    title: 'Comunicación y mensajes',
    fields: [
      field('name', 'Asunto', 'text', true),
      optionalChurch,
      field('committeeKey', 'Comité nacional', 'text'),
      field('channelType', 'Canal', 'select', false, ['General', 'Congregación', 'Comité', 'Tarea', 'Informe']),
      field('relatedId', 'Registro vinculado', 'text'),
      field('relatedTitle', 'Referencia vinculada', 'text'),
      field('senderName', 'Remitente', 'text', true),
      field('senderRole', 'Rol del remitente', 'text'),
      field('body', 'Mensaje', 'textarea', true),
      notes
    ]
  }
}

export function calculateAge(birthday) {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null
  const [y, m, d] = birthday.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  const monthDiff = (today.getMonth() + 1) - m
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--
  return age >= 0 ? age : null
}

export function getAgeCategory(birthday, customRanges = DEFAULT_AGE_RANGES) {
  const age = calculateAge(birthday)
  if (age === null) return 'Adulto'
  if (age <= customRanges.kidsMaxAge) return 'Niño'
  if (age <= customRanges.youthMaxAge) return 'Joven'
  return 'Adulto'
}

// La fecha de nacimiento manda; si no está, se usa la edad aproximada anotada en el Modo rápido.
export function personAgeCategory(person, customRanges = DEFAULT_AGE_RANGES) {
  if (calculateAge(person?.birthday) !== null) return getAgeCategory(person.birthday, customRanges)
  return person?.ageGroup || 'Adulto'
}

export function validateRecord(collection, input, lookup) {
  const schema = catalog[collection]
  if (!schema || !input || typeof input !== 'object') throw new Error('Registro no válido.')
  const record = {}
  for (const f of schema.fields) {
    const value = String(input[f.key] ?? '').trim()
    const quickFriendSurname = collection === 'people' && f.key === 'surname' && input.status === 'Amigo'
    if (f.required && !value && !quickFriendSurname) throw new Error(`${f.label}: es obligatorio.`)
    if (value.length > (f.type === 'photo' ? 1500000 : 4000)) throw new Error(`${f.label}: supera el tamaño permitido.`)
    if (value && f.type === 'select' && !f.options.includes(value)) throw new Error(`${f.label}: opción no válida.`)
    if (value && ['money', 'latitude', 'longitude'].includes(f.type) && (!Number.isFinite(Number(value)) || (f.type === 'money' && (Number(value) <= 0 || Number(value) > 1e10 || !/^\d+(\.\d{1,2})?$/.test(value))) || (f.type === 'latitude' && Math.abs(Number(value)) > 90) || (f.type === 'longitude' && Math.abs(Number(value)) > 180))) throw new Error(`${f.label}: número no válido.`)
    if (value && f.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error(`${f.label}: fecha no válida.`)
    if (value && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Correo no válido.')
    if (value && f.type === 'photo' && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) throw new Error('Fotografía no válida.')
    if (value && catalog[f.type]) {
      const target = lookup(f.type, value)
      if (!target) throw new Error(`${f.label}: registro inexistente.`)
      if (input.churchId && target.churchId && target.churchId !== input.churchId) throw new Error(`${f.label}: pertenece a otra congregación.`)
    }
    record[f.key] = value
  }

  // Conserva el ámbito específico de un lugar de predicación sin perder la
  // congregación madre que se usa para consolidar sus datos.
  if (['people', 'families', 'events', 'transactions', 'serviceSchedules', 'monthlyReports', 'groups', 'cellReports', 'designRequests', 'socialMetrics', 'messages'].includes(collection)) {
    const preachingPlaceId = String(input.preachingPlaceId || '').trim()
    if (preachingPlaceId) record.preachingPlaceId = preachingPlaceId
  }

  // Validaciones especiales por colección
  if (collection === 'churches') {
    if (record.isPreachingPlace === 'Sí') {
      if (!record.parentChurchId) throw new Error('Un lugar de predicación debe tener una congregación madre asignada.')
      if (input.id && record.parentChurchId === input.id) throw new Error('Un lugar de predicación no puede ser su propia congregación madre.')
      const parent = lookup('churches', record.parentChurchId)
      if (!parent) throw new Error('La congregación madre seleccionada no existe.')
    }
  }

  if (collection === 'events') {
    const isNationalOrCommittee = Boolean(record.committeeKey || record.scopeAudience === 'Nacional' || record.scopeAudience === 'Comité nacional' || ['Convención', 'Campamento', 'Capacitación'].includes(record.kind))
    if (!record.churchId && !isNationalOrCommittee) {
      throw new Error('Congregación: es obligatorio para encuentros locales.')
    }
    if (!record.modality) record.modality = 'Presencial'
    if (!record.scopeAudience) record.scopeAudience = record.committeeKey ? 'Comité nacional' : record.churchId ? 'Congregación local' : 'Nacional'
    if (!record.publicVisible) record.publicVisible = 'Sí'
    if (!record.featured) record.featured = ['Convención', 'Campamento'].includes(record.kind) ? 'Sí' : 'No'
    if (!record.showInChurchCalendar) record.showInChurchCalendar = 'Sí'
  }

  if (collection === 'groups') {
    if (record.kind !== 'Comité nacional' && !record.churchId) throw new Error('Selecciona una congregación para el grupo local.')
    if (record.kind === 'Comité nacional' && record.churchId) throw new Error('Un comité nacional no pertenece a una sola congregación.')
    if (Array.isArray(input.members)) {
      record.members = input.members.map(m => {
        const personId = typeof m === 'string' ? m : String(m?.personId ?? '').trim()
        const role = typeof m === 'object' && m?.role ? String(m.role).trim().slice(0, 100) : 'Integrante'
        if (personId) {
          const person = lookup('people', personId)
          if (!person) throw new Error(`Integrante no encontrado (${personId}).`)
          if (record.churchId && person.churchId && person.churchId !== record.churchId) throw new Error(`El integrante ${person.name || ''} pertenece a otra congregación.`)
          return { personId, role }
        }
        return null
      }).filter(Boolean)
    } else {
      record.members = []
    }
  }

  if (collection === 'cellReports') {
    for (const key of ['adults', 'visitors', 'children', 'offering']) {
      const value = Number(record[key])
      if (!Number.isFinite(value) || value < 0 || value > 1e10 || (key !== 'offering' && !Number.isInteger(value))) throw new Error(`${catalog.cellReports.fields.find(f => f.key === key)?.label}: debe ser un número no negativo.`)
      record[key] = String(value)
    }
    if (record.weekEnd < record.weekStart) throw new Error('El fin de la semana no puede ser anterior al inicio.')
  }

  if (collection === 'families') {
    record.members = Array.isArray(input.members) ? input.members.map(m => ({
      personId: String(m?.personId || ''),
      role: String(m?.role || 'Otro').slice(0, 60)
    })).filter(m => m.personId) : []
    record.familyLinks = Array.isArray(input.familyLinks) ? input.familyLinks.map(link => ({
      familyId: String(link?.familyId || ''),
      relation: String(link?.relation || 'Familia relacionada').slice(0, 100)
    })).filter(link => link.familyId && link.familyId !== input.id) : []
  }

  if (collection === 'monthlyReports') {
    record.pages = Array.isArray(input.pages) ? input.pages.map(page => ({
      title: String(page?.title || 'Actividad').slice(0, 160),
      body: String(page?.body || '').slice(0, 6000),
      photos: Array.isArray(page?.photos) ? page.photos.slice(0, 4).filter(p => typeof p === 'string' && p.startsWith('data:image/')) : []
    })).slice(0, 20) : []
    record.metrics = input.metrics && typeof input.metrics === 'object' ? Object.fromEntries(
      ['encounters', 'attendance', 'income', 'expenses', 'baptismsWater', 'baptismsSpirit', 'preachingPlaces', 'refam', 'homeServices', 'loveBaskets', 'intercession', 'men', 'women', 'youth', 'children', 'visitors']
        .map(key => [key, Number.isFinite(Number(input.metrics[key])) ? Math.max(0, Number(input.metrics[key])) : 0])
    ) : null
    const metricKeys = ['encounters', 'attendance', 'income', 'expenses', 'baptismsWater', 'baptismsSpirit', 'preachingPlaces', 'refam', 'homeServices', 'loveBaskets', 'intercession', 'men', 'women', 'youth', 'children', 'visitors']
    record.metricOverrides = Array.isArray(input.metricOverrides)
      ? [...new Set(input.metricOverrides.map(String).filter(key => metricKeys.includes(key))) ]
      : []
  }

  if (collection === 'nationalActivities') {
    if (record.description && record.description.length > 500) throw new Error('La descripción no puede superar los 500 caracteres.')
    record.instructions = String(input.instructions || '').slice(0, 4000)
    record.targetChurches = Array.isArray(input.targetChurches) ? input.targetChurches.map(String) : []
    record.requestedFields = Array.isArray(input.requestedFields) ? input.requestedFields.map(String) : []
    if (!record.modality) record.modality = 'Presencial'
  }

  if (collection === 'activityAssignments') {
    record.attendanceCount = Math.max(0, Number(input.attendanceCount) || 0)
    record.visitorsCount = Math.max(0, Number(input.visitorsCount) || 0)
    record.previousActivitiesCount = Math.max(0, Number(input.previousActivitiesCount) || 0)
    record.feedback = String(input.feedback || '').slice(0, 4000)
    record.submittedAt = String(input.submittedAt || '')
    record.reviewedAt = String(input.reviewedAt || '')

    // Manejo de fotos (hasta 2)
    if (Array.isArray(input.photos)) {
      record.photos = input.photos.slice(0, 2).filter(p => typeof p === 'string' && p.startsWith('data:image/'))
    } else {
      record.photos = []
    }

    // Datos financieros desglosados
    if (input.financialData && typeof input.financialData === 'object') {
      record.financialData = {
        preMissionaryOfferings: Math.max(0, Number(input.financialData.preMissionaryOfferings) || 0),
        missionaryServiceOffering: Math.max(0, Number(input.financialData.missionaryServiceOffering) || 0),
        pledges: Math.max(0, Number(input.financialData.pledges) || 0),
        otherAuthorizedIncome: Math.max(0, Number(input.financialData.otherAuthorizedIncome) || 0),
        expenses: Math.max(0, Number(input.financialData.expenses) || 0),
        totalGathered: Math.max(0, Number(input.financialData.totalGathered) || 0),
        totalSent: Math.max(0, Number(input.financialData.totalSent) || 0),
        totalReceived: Math.max(0, Number(input.financialData.totalReceived) || 0),
        status: String(input.financialData.status || 'Registrado')
      }
    } else {
      record.financialData = null
    }
  }

  if (collection === 'socialMetrics') {
    const initF = Number(record.initialFollowers)
    const currF = Number(record.currentFollowers)
    if (Number.isNaN(initF) || initF < 0) throw new Error('Seguidores iniciales debe ser un número entero no negativo.')
    if (Number.isNaN(currF) || currF < 0) throw new Error('Seguidores actuales debe ser un número entero no negativo.')
    record.calculatedGrowth = currF - initF
    record.calculatedPercentage = initF > 0 ? Number((((currF - initF) / initF) * 100).toFixed(1)) : 0
  }

  if (collection === 'people') {
    if (record.status === 'Miembro') record.status = 'Persona vinculada'
    if (record.status === 'Visita' || record.status === 'Seguimiento') record.status = 'Amigo'
    if (record.birthday && record.birthday > new Date().toISOString().slice(0, 10)) {
      throw new Error('El nacimiento no puede estar en el futuro.')
    }
  }

  if (collection === 'transactions') {
    if (!record.financialStatus) record.financialStatus = 'Registrado'
    if (!record.churchId && !record.committeeKey) throw new Error('Congregación: es obligatorio.')
  }

  return record
}

export function validateState(inputState, generateId = () => Math.random().toString(36).slice(2, 11)) {
  if (!inputState || typeof inputState !== 'object') throw new Error('El archivo no contiene un formato de datos válido.')
  const rawRecords = inputState.records && typeof inputState.records === 'object' ? inputState.records : inputState
  const keys = [...Object.keys(catalog), 'attendance']
  const cleanState = Object.fromEntries(keys.map(k => [k, []]))

  const lookup = (type, id) => cleanState[type]?.find(r => r.id === id)

  const order = [
    'churches',
    'families',
    'people',
    'serviceSchedules',
    'monthlyReports',
    'events',
    'groups',
    'cellReports',
    'transactions',
    'nationalActivities',
    'activityAssignments',
    'committeeMembers',
    'designRequests',
    'socialMetrics',
    'messages'
  ]

  for (const col of order) {
    const list = Array.isArray(rawRecords[col]) ? rawRecords[col] : []
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const validated = validateRecord(col, item, lookup)
      const id = String(item.id || '').trim() || generateId()
      cleanState[col].push({
        ...validated,
        id,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      })
    }
  }

  const attList = Array.isArray(rawRecords.attendance) ? rawRecords.attendance : []
  for (const item of attList) {
    if (!item || typeof item !== 'object') continue
    const event = lookup('events', item.eventId)
    if (!event) continue
    const people = [...new Set((Array.isArray(item.people) ? item.people : []).map(String))]
      .filter(id => {
        const p = lookup('people', id)
        if (!p) return false
        return !event.churchId || p.churchId === event.churchId
      })
    const visitors = Math.max(0, Math.min(100000, Number.isInteger(Number(item.visitors)) ? Number(item.visitors) : 0))
    cleanState.attendance.push({
      id: String(item.id || '').trim() || generateId(),
      eventId: event.id,
      churchId: event.churchId || '',
      activityId: item.activityId ? String(item.activityId) : '',
      assignmentId: item.assignmentId ? String(item.assignmentId) : '',
      people,
      visitors,
      visitorsByChurch: item.visitorsByChurch && typeof item.visitorsByChurch === 'object' ? item.visitorsByChurch : {},
      onlineConfirmations: Array.isArray(item.onlineConfirmations) ? item.onlineConfirmations : []
    })
  }

  return cleanState
}
