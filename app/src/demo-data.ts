import { catalog } from '../shared/catalog.mjs'

type DemoRow = { id: string; [key: string]: any }
type DemoState = Record<string, DemoRow[]>

const isoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')

export function createDemoState(): DemoState {
  const empty = Object.fromEntries([...Object.keys(catalog), 'attendance'].map(key => [key, []])) as DemoState
  const state: DemoState = { ...empty }
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 12)
  const startDate = isoDate(start)
  const endDate = isoDate(now)
  const monthKeys: string[] = []
  const monthCursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  while (monthCursor <= lastMonth) {
    monthKeys.push(`${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`)
    monthCursor.setMonth(monthCursor.getMonth() + 1)
  }

  state.churches = [
    { id: 'demo-ch-maldonado', name: 'Congregación Maldonado · Demo', pastor: 'Pastor de ejemplo Maldonado', city: 'Maldonado', department: 'Maldonado', isPreachingPlace: 'No', cells: 'Sí', createdAt: startDate },
    { id: 'demo-ch-salto', name: 'Congregación Salto · Demo', pastor: 'Pastora de ejemplo Salto', city: 'Salto', department: 'Salto', isPreachingPlace: 'No', cells: 'Sí', createdAt: startDate },
    { id: 'demo-place-san-carlos', name: 'Lugar de Predicación San Carlos · Demo', pastor: 'Encargado de ejemplo', city: 'San Carlos', department: 'Maldonado', isPreachingPlace: 'Sí', parentChurchId: 'demo-ch-maldonado', cells: 'No', createdAt: startDate }
  ]

  const personNames = [
    ['Ana', 'Muestra'], ['Mateo', 'Ejemplo'], ['Lucía', 'Prueba'], ['David', 'Demo'],
    ['Julia', 'Muestra'], ['Samuel', 'Ejemplo'], ['Sara', 'Prueba'], ['Tomás', 'Demo'],
    ['Noemí', 'Muestra'], ['Elías', 'Ejemplo'], ['Eva', 'Prueba'], ['Juan', 'Demo'],
    ['Lidia', 'Muestra'], ['Marcos', 'Ejemplo'], ['Ruth', 'Prueba'], ['Joel', 'Demo'],
    ['Miriam', 'Muestra'], ['Andrés', 'Ejemplo'], ['Esther', 'Prueba'], ['Pedro', 'Demo'],
    ['Raquel', 'Muestra'], ['Felipe', 'Ejemplo'], ['Débora', 'Prueba'], ['Isaac', 'Demo']
  ]
  const peopleByChurch = new Map<string, string[]>()
  state.people = personNames.map(([name, surname], index) => {
    const churchId = index < 16 ? 'demo-ch-maldonado' : 'demo-ch-salto'
    const id = `demo-person-${String(index + 1).padStart(2, '0')}`
    const birthdayYear = index % 3 === 0 ? 2004 : index % 3 === 1 ? 1986 : 1975
    const isFriend = index === 5 || index === 18
    // Dos de cada tres hermanos tienen fecha de bautismo, años antes del período de los informes.
    const baptized = !isFriend && index % 3 !== 1
    const person = {
      id, name, surname, churchId, status: isFriend ? 'Amigo' : 'Miembro',
      gender: index % 2 === 0 ? 'Femenino' : 'Masculino',
      birthday: `${birthdayYear}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 25) + 1).padStart(2, '0')}`,
      baptism: baptized ? `${birthdayYear + 15 + (index % 4)}-${String(((index * 5) % 12) + 1).padStart(2, '0')}-${String(((index * 7) % 27) + 1).padStart(2, '0')}` : '',
      role: index === 0 ? 'Responsable local de Jóvenes' : '',
      createdAt: startDate
    }
    peopleByChurch.set(churchId, [...(peopleByChurch.get(churchId) || []), id])
    return person
  })

  state.families = [
    { id: 'demo-family-1', name: 'Familia Muestra', churchId: 'demo-ch-maldonado', zone: 'Centro', address: 'Dato de ejemplo' },
    { id: 'demo-family-2', name: 'Familia Ejemplo', churchId: 'demo-ch-maldonado', zone: 'Norte', address: 'Dato de ejemplo' },
    { id: 'demo-family-3', name: 'Familia Prueba', churchId: 'demo-ch-salto', zone: 'Centro', address: 'Dato de ejemplo' }
  ]
  state.people[0].familyId = 'demo-family-1'
  state.people[1].familyId = 'demo-family-1'
  state.people[16].familyId = 'demo-family-3'

  state.serviceSchedules = [
    { id: 'demo-schedule-maldonado-thu', name: 'Culto congregacional', churchId: 'demo-ch-maldonado', day: 'Jueves', time: '19:00', status: 'Activo' },
    { id: 'demo-schedule-maldonado-sun', name: 'Culto congregacional', churchId: 'demo-ch-maldonado', day: 'Domingo', time: '18:00', status: 'Activo' },
    { id: 'demo-schedule-salto-sun', name: 'Culto congregacional', churchId: 'demo-ch-salto', day: 'Domingo', time: '18:00', status: 'Activo' }
  ]

  state.groups = [
    { id: 'demo-local-youth-m', name: 'Comité Local de Jóvenes', kind: 'Comité local', churchId: 'demo-ch-maldonado', committeeKey: 'jovenes', leaderId: 'demo-person-01', members: ['demo-person-01', 'demo-person-02', 'demo-person-03', 'demo-person-04'], location: 'Salón principal' },
    { id: 'demo-local-youth-s', name: 'Comité Local de Jóvenes', kind: 'Comité local', churchId: 'demo-ch-salto', committeeKey: 'jovenes', leaderId: 'demo-person-17', members: ['demo-person-17', 'demo-person-18', 'demo-person-19'], location: 'Salón principal' },
    { id: 'demo-cell-centro', name: 'Célula Centro', kind: 'Célula', churchId: 'demo-ch-maldonado', leaderId: 'demo-person-03', members: ['demo-person-01', 'demo-person-03', 'demo-person-05'], schedule: 'Miércoles 19:30', location: 'Centro' },
    { id: 'demo-cell-salto', name: 'Grupo de amistad Salto Norte', kind: 'Célula', churchId: 'demo-ch-salto', leaderId: 'demo-person-19', members: ['demo-person-17', 'demo-person-19', 'demo-person-21'], schedule: 'Viernes 20:00', location: 'Zona Norte' }
  ]

  state.committeeMembers = [
    { id: 'demo-cm-1', personId: 'demo-person-01', churchId: 'demo-ch-maldonado', committeeKey: 'jovenes', isLocalLeader: 'Sí', status: 'Activo', roleSpecialty: 'Coordinación local' },
    { id: 'demo-cm-2', personId: 'demo-person-17', churchId: 'demo-ch-salto', committeeKey: 'jovenes', isLocalLeader: 'Sí', status: 'Activo', roleSpecialty: 'Enlace local' },
    { id: 'demo-cm-3', personId: 'demo-person-03', churchId: 'demo-ch-maldonado', committeeKey: 'damas', isLocalLeader: 'Sí', status: 'Activo', roleSpecialty: 'Apoyo' },
    { id: 'demo-cm-4', personId: 'demo-person-19', churchId: 'demo-ch-salto', committeeKey: 'misiones', isLocalLeader: 'Sí', status: 'Activo', roleSpecialty: 'Apoyo' }
  ]

  const getPeople = (churchId: string) => peopleByChurch.get(churchId) || []
  const chooseAttendees = (churchId: string, count: number, offset: number) => {
    const ids = getPeople(churchId)
    return Array.from({ length: Math.min(count, ids.length) }, (_, index) => ids[(index + offset) % ids.length])
  }
  const addEvent = (input: { churchId: string; date: string; name: string; kind: string; time?: string; modality?: string; location?: string; committeeKey?: string; preachingPlaceId?: string; attendanceCount?: number; visitors?: number }) => {
    const id = `demo-event-${input.churchId}-${input.date}-${slug(input.name)}`
    const event = {
      id, name: input.name, churchId: input.churchId, preachingPlaceId: input.preachingPlaceId || '',
      date: input.date, time: input.time || '18:00', kind: input.kind,
      modality: input.modality || 'Presencial', location: input.location || 'Templo de ejemplo',
      committeeKey: input.committeeKey || '', responsible: 'Equipo de ejemplo',
      showInChurchCalendar: 'Sí', publicVisible: 'No', status: 'Realizado',
      createdAt: `${input.date}T12:00:00.000Z`
    }
    state.events.push(event)
    const attendeeChurch = input.churchId === 'demo-place-san-carlos' ? 'demo-ch-maldonado' : input.churchId
    // Como en la vida real, algunos hermanos dejan de venir: así se ven los avisos y la barrita amarilla o roja.
    const daysAgo = Math.round((Date.now() - Date.parse(`${input.date}T12:00:00`)) / 86_400_000)
    const away = new Set([
      ...(daysAgo <= 40 ? ['demo-person-08', 'demo-person-20'] : []),
      ...(daysAgo <= 5 ? ['demo-person-11'] : [])
    ])
    const attendees = chooseAttendees(attendeeChurch, input.attendanceCount || 10, Number(input.date.slice(-2)) % 16).filter(id => !away.has(id))
    state.attendance.push({
      id: `demo-attendance-${id}`, eventId: id, churchId: attendeeChurch, people: attendees,
      visitors: input.visitors || 0, visitorsByChurch: {}, onlineConfirmations: [],
      activityId: '', assignmentId: '', createdAt: `${input.date}T21:00:00.000Z`
    })
    return event
  }

  const moneyForService = (churchId: string, date: string, name: string, category: string, amount: number, eventId: string, committeeKey = '') => {
    state.transactions.push({
      id: `demo-tx-${churchId}-${date}-${slug(name)}`, churchId, date,
      direction: 'Ingreso', category, accountType: 'Operación', name, amount,
      eventId, committeeKey, financialStatus: 'Conciliado',
      notes: 'Movimiento ficticio para demostración', createdAt: `${date}T21:15:00.000Z`
    })
  }

  const monthIndexFor = (date: string) => monthKeys.indexOf(date.slice(0, 7))
  const walk = new Date(start)
  let eventOrdinal = 0
  while (walk <= now) {
    const date = isoDate(walk)
    const weekday = walk.getDay()
    if (weekday === 4 || weekday === 0) {
      const name = weekday === 4 ? 'Culto congregacional · Jueves' : 'Culto congregacional · Domingo'
      const event = addEvent({ churchId: 'demo-ch-maldonado', date, name, kind: 'Culto', time: weekday === 4 ? '19:00' : '18:00', attendanceCount: weekday === 4 ? 13 : 19, visitors: weekday === 0 ? 2 : 1 })
      moneyForService('demo-ch-maldonado', date, weekday === 4 ? 'Ofrenda de culto' : 'Diezmos y ofrendas', weekday === 4 ? 'Ofrenda' : 'Diezmo', weekday === 4 ? 3150 + (eventOrdinal % 4) * 280 : 8200 + (eventOrdinal % 5) * 710, event.id)
      eventOrdinal++
    }
    if (weekday === 0) {
      const saltoEvent = addEvent({ churchId: 'demo-ch-salto', date, name: 'Culto congregacional', kind: 'Culto', time: '18:00', location: 'Templo de ejemplo Salto', attendanceCount: 15, visitors: 1 })
      moneyForService('demo-ch-salto', date, 'Ofrendas del culto', 'Ofrenda', 4100 + (eventOrdinal % 4) * 320, saltoEvent.id)
      if (walk.getDate() % 14 < 7) {
        const placeEvent = addEvent({ churchId: 'demo-ch-maldonado', preachingPlaceId: 'demo-place-san-carlos', date, name: 'Encuentro en lugar de predicación', kind: 'Culto', time: '17:00', location: 'Lugar de Predicación San Carlos', attendanceCount: 9, visitors: 2 })
        moneyForService('demo-ch-maldonado', date, 'Ofrenda · San Carlos', 'Ofrenda', 1450 + (eventOrdinal % 3) * 170, placeEvent.id)
      }
    }
    if (weekday === 6 && walk.getDate() < 8) {
      addEvent({ churchId: 'demo-ch-maldonado', date, name: 'Encuentro del Comité de Jóvenes', kind: 'Jóvenes', time: '19:30', location: 'Salón de jóvenes', committeeKey: 'jovenes', attendanceCount: 12, visitors: 1 })
    }
    walk.setDate(walk.getDate() + 1)
  }

  const activityBlueprints = [
    { month: monthKeys[0], day: 18, name: 'Jornada juvenil de servicio', kind: 'Actividad especial', status: 'Terminada' },
    { month: monthKeys[Math.min(1, monthKeys.length - 1)], day: 20, name: 'Encuentro nacional de Jóvenes', kind: 'Reunión nacional', status: 'Terminada' },
    { month: monthKeys[monthKeys.length - 1], day: 24, name: 'Devocional y evangelismo juvenil', kind: 'Campaña', status: 'Terminada' }
  ]
  state.nationalActivities = activityBlueprints.map((item, index) => {
    const date = new Date(`${item.month}-01T12:00:00`)
    date.setDate(Math.min(item.day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
    const activityDate = isoDate(date)
    return {
      id: `demo-national-activity-${index + 1}`, name: item.name, kind: item.kind,
      committeeKey: 'jovenes', modality: index === 1 ? 'Online' : 'Presencial',
      onlineUrl: index === 1 ? 'https://ejemplo.invalid/reunion' : '',
      scope: 'Por congregación', scopeType: 'Todas las congregaciones', dateMode: 'Fecha nacional común',
      date: activityDate, startDate: activityDate, deadline: activityDate,
      objective: 'Actividad ficticia para mostrar asignaciones y seguimiento.',
      instructions: 'Completar asistencia y una breve devolución.', status: item.status,
      requiresAttendance: 'Sí', requiresOffering: 'Sí', requiresReport: 'Sí', requiresPhotos: 'No',
      createdBy: 'demo-admin', createdAt: `${activityDate}T12:00:00.000Z`
    }
  })

  state.nationalActivities.forEach((activity, index) => {
    addEvent({
      churchId: index === 1 ? '' : 'demo-ch-maldonado', date: activity.date, name: activity.name,
      kind: index === 2 ? 'Devocional' : 'Jóvenes', time: index === 1 ? '20:00' : '18:30',
      modality: activity.modality, location: index === 1 ? 'Sala virtual de ejemplo' : 'Maldonado · Demo',
      committeeKey: 'jovenes', attendanceCount: 16 + index * 3, visitors: 2
    })
    for (const [churchIndex, churchId] of ['demo-ch-maldonado', 'demo-ch-salto'].entries()) {
      const completed = index < 2 || churchIndex === 0
      state.activityAssignments.push({
        id: `demo-assignment-${index + 1}-${churchIndex + 1}`, activityId: activity.id,
        churchId, committeeKey: 'jovenes', name: activity.name,
        status: completed ? (index === 0 ? 'Aprobada' : 'Enviada') : 'Pendiente',
        localDate: activity.date, attendanceCount: completed ? 12 + index * 4 + churchIndex : 0,
        visitorsCount: completed ? 1 + churchIndex : 0, offeringAmount: completed ? 900 + index * 350 : 0,
        reportSummary: completed ? 'Actividad realizada; participaron jóvenes y familias de la congregación.' : '',
        achievementNotes: completed ? 'Buena participación y coordinación local.' : '',
        difficulties: '', photos: [], createdAt: `${activity.date}T21:00:00.000Z`
      })
    }
  })

  // Egresos y una entrada mensual por actividad para que los resúmenes muestren categorías distintas.
  for (const [churchIndex, churchId] of ['demo-ch-maldonado', 'demo-ch-salto'].entries()) {
    for (const [monthIndex, month] of monthKeys.entries()) {
      const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
      const date = `${month}-${String(Math.min(8 + monthIndex * 5, lastDay)).padStart(2, '0')}`
      state.transactions.push({ id: `demo-expense-electricity-${churchId}-${month}`, churchId, date, direction: 'Egreso', category: 'Gasto', accountType: 'Operación', name: 'Servicio de electricidad', amount: churchIndex === 0 ? 2580 + monthIndex * 90 : 1760 + monthIndex * 80, financialStatus: 'Conciliado', notes: 'Movimiento ficticio para demostración' })
      state.transactions.push({ id: `demo-expense-supplies-${churchId}-${month}`, churchId, date: `${month}-${String(Math.min(19, lastDay)).padStart(2, '0')}`, direction: 'Egreso', category: 'Gasto', accountType: 'Operación', name: 'Materiales y alimentos', amount: churchIndex === 0 ? 1940 + monthIndex * 120 : 1260 + monthIndex * 75, financialStatus: 'Conciliado', notes: 'Movimiento ficticio para demostración' })
      state.transactions.push({ id: `demo-income-donation-${churchId}-${month}`, churchId, date: `${month}-${String(Math.min(15, lastDay)).padStart(2, '0')}`, direction: 'Ingreso', category: 'Donación', accountType: 'Operación', name: 'Donación para obra social', amount: churchIndex === 0 ? 1800 + monthIndex * 250 : 950 + monthIndex * 180, financialStatus: 'Conciliado', notes: 'Movimiento ficticio para demostración' })
    }
  }

  state.nationalActivities.forEach((activity, index) => {
    state.transactions.push({
      id: `demo-income-youth-${index + 1}`, churchId: 'demo-ch-maldonado', date: activity.date,
      direction: 'Ingreso', category: 'Ofrenda', accountType: 'Operación', name: `Ofrenda · ${activity.name}`,
      amount: 920 + index * 380, committeeKey: 'jovenes', activityId: activity.id,
      financialStatus: 'Enviado', notes: 'Movimiento ficticio vinculado al Comité Nacional de Jóvenes'
    })
  })

  state.monthlyReports = []
  for (const churchId of ['demo-ch-maldonado', 'demo-ch-salto']) {
    const church = state.churches.find(item => item.id === churchId)!
    for (const [index, month] of monthKeys.entries()) {
      const monthTransactions = state.transactions.filter(row => row.churchId === churchId && row.date.startsWith(month))
      const reportIncome = monthTransactions.filter(row => row.direction === 'Ingreso').reduce((sum, row) => sum + Number(row.amount || 0), 0)
      const reportExpenses = monthTransactions.filter(row => row.direction === 'Egreso').reduce((sum, row) => sum + Number(row.amount || 0), 0)
      const monthEnd = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
      const status = index === monthKeys.length - 1 ? 'Borrador' : index === 0 ? 'Revisado' : 'Recibido'
      state.monthlyReports.push({
        id: `demo-report-${churchId}-${month}`, name: `Informe mensual · ${church.name}`, churchId,
        month, reportType: 'monthly', status, pastor: church.pastor,
        from: `${month}-01`, to: isoDate(monthEnd),
        summary: 'Tres meses de ejemplo: cultos, acompañamiento local y actividad ministerial.',
        metrics: { income: reportIncome, expenses: reportExpenses, attendance: index === 0 ? 106 : 124 + index * 9, encounters: 8 + index * 2, visitors: 4 + index },
        // El borrador del mes en curso sigue las cifras del CRM; los ya entregados quedan como se enviaron.
        ...(status === 'Borrador' ? { metricOverrides: [] } : {}),
        createdAt: `${month}-28T18:00:00.000Z`, updatedAt: `${month}-28T18:00:00.000Z`
      })
    }
  }

  state.cellReports = []
  for (const [index, groupId] of ['demo-cell-centro', 'demo-cell-salto'].entries()) {
    const churchId = index === 0 ? 'demo-ch-maldonado' : 'demo-ch-salto'
    for (const [monthIndex, month] of monthKeys.entries()) {
      const end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
      state.cellReports.push({
        id: `demo-cell-report-${groupId}-${month}`, name: state.groups.find(group => group.id === groupId)?.name,
        churchId, groupId, weekStart: `${month}-07`, weekEnd: isoDate(end),
        adults: 7 + monthIndex + index, visitors: 1 + (monthIndex % 2), children: 2 + index,
        offering: 500 + monthIndex * 125 + index * 90,
        leader: index === 0 ? 'Ana Muestra' : 'Raquel Muestra', source: 'Carga local',
        createdAt: `${month}-28T19:00:00.000Z`
      })
    }
  }

  state.messages = [
    { id: 'demo-message-1', channel: 'nacional:general', senderRole: 'national_admin', senderName: 'Administración Nacional · Demo', churchId: '', subject: 'Recordatorio de informes', body: 'Ejemplo: revisar y enviar el informe del período antes del cierre mensual.', contextType: 'report', createdAt: `${monthKeys[monthKeys.length - 1]}-10T12:00:00.000Z` },
    { id: 'demo-message-2', channel: 'comite:jovenes', senderRole: 'national_committee', senderName: 'Comité Nacional de Jóvenes · Demo', churchId: 'demo-ch-maldonado', committeeKey: 'jovenes', subject: 'Encuentro juvenil', body: 'Ejemplo: confirmar asistencia y compartir una breve devolución de la actividad.', contextType: 'activity', contextId: 'demo-national-activity-2', createdAt: `${monthKeys[monthKeys.length - 1]}-14T12:00:00.000Z` }
  ]

  state.events.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  state.transactions.sort((a, b) => a.date.localeCompare(b.date))
  return state
}
