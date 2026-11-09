import { catalog, validateRecord, validateState } from '../shared/catalog.mjs'

type RecordData = { id: string; [key: string]: any }
type Data = Record<string, RecordData[]>
const DEMO_SEED_VERSION = 5
export const empty = (): Data => Object.fromEntries([...Object.keys(catalog), 'attendance'].map(key => [key, []]))

function deduplicateSchedules(schedules: RecordData[]): RecordData[] {
  const seen = new Map<string, RecordData>()
  for (const item of schedules) {
    const key = `${item.churchId || ''}::${item.day || ''}::${item.time || ''}`
    if (!seen.has(key)) seen.set(key, item)
  }
  return [...seen.values()]
}

function createDefaultSeed(): Data {
  // La copia oficial comienza limpia; los datos de prueba de la copia anterior no se cargan aquí.
  return empty()

  // Conservado debajo como referencia de migración, pero nunca se aplica a la versión oficial.
  const seed = empty()

  seed.churches = [
    {
      id: 'ch-maldonado',
      name: 'Congregación Maldonado',
      pastor: 'Carlos Rodríguez',
      phone: '099123456',
      city: 'Maldonado',
      department: 'Maldonado',
      isPreachingPlace: 'No',
      parentChurchId: '',
      cells: 'No',
      notes: 'Sede central departamental',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'ch-san-carlos',
      name: 'Lugar de Predicación San Carlos',
      pastor: 'Roberto Gómez (Encargado)',
      phone: '098765432',
      city: 'San Carlos',
      department: 'Maldonado',
      isPreachingPlace: 'Sí',
      parentChurchId: 'ch-maldonado',
      cells: 'No',
      notes: 'Lugar de predicación dependiente de Congregación Maldonado',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'ch-salto',
      name: 'Congregación Salto',
      pastor: 'Esteban Martínez',
      phone: '097111222',
      city: 'Salto',
      department: 'Salto',
      isPreachingPlace: 'No',
      parentChurchId: '',
      cells: 'Sí',
      notes: 'Congregación litoral norte',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'ch-melo',
      name: 'Congregación Melo',
      pastor: 'Daniel Silva',
      phone: '096333444',
      city: 'Melo',
      department: 'Cerro Largo',
      isPreachingPlace: 'No',
      parentChurchId: '',
      cells: 'No',
      notes: 'Congregación noreste',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ]

  seed.people = [
    {
      id: 'p-valeria-g',
      name: 'Valeria',
      surname: 'Giménez',
      churchId: 'ch-maldonado',
      preachingPlaceId: '',
      birthday: '2002-05-14',
      gender: 'Femenino',
      phone: '099112233',
      status: 'Miembro',
      role: 'Líder local de Jóvenes',
      notes: 'Ficha de prueba demostrativa',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'p-mateo-g',
      name: 'Mateo',
      surname: 'González',
      churchId: 'ch-maldonado',
      preachingPlaceId: '',
      birthday: '2007-08-20',
      gender: 'Masculino',
      phone: '098445566',
      status: 'Miembro',
      role: 'Músico y vocalista',
      notes: 'Participa del coro nacional y ministerio de alabanza',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'p-lucia-f',
      name: 'Lucía',
      surname: 'Fernández',
      churchId: 'ch-maldonado',
      preachingPlaceId: '',
      birthday: '1988-03-10',
      gender: 'Femenino',
      phone: '097778899',
      status: 'Miembro',
      role: 'Líder local de Damas',
      notes: 'Coordinadora programa Virtuosas',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'p-roberto-g',
      name: 'Roberto',
      surname: 'Gómez',
      churchId: 'ch-maldonado',
      preachingPlaceId: 'ch-san-carlos',
      birthday: '1981-11-25',
      gender: 'Masculino',
      phone: '098765432',
      status: 'Miembro',
      role: 'Encargado lugar de predicación',
      notes: 'Asiste a la congregación madre y atiende el lugar de predicación San Carlos',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'p-marcos-d',
      name: 'Marcos',
      surname: 'Díaz',
      churchId: 'ch-salto',
      preachingPlaceId: '',
      birthday: '2004-09-02',
      gender: 'Masculino',
      phone: '096123987',
      status: 'Miembro',
      role: 'Líder local de Jóvenes',
      notes: 'Coordinador juvenil en Salto',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ]

  seed.committeeMembers = [
    {
      id: 'cm-1',
      personId: 'p-valeria-g',
      churchId: 'ch-maldonado',
      committeeKey: 'jovenes',
      isLocalLeader: 'Sí',
      roleSpecialty: 'Presidente local de Jóvenes',
      startDate: '2025-02-01',
      status: 'Activo',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'cm-2',
      personId: 'p-mateo-g',
      churchId: 'ch-maldonado',
      committeeKey: 'musica',
      isLocalLeader: 'Sí',
      roleSpecialty: 'Pianista y Vocalista',
      startDate: '2025-03-15',
      status: 'Activo',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'cm-3',
      personId: 'p-lucia-f',
      churchId: 'ch-maldonado',
      committeeKey: 'damas',
      isLocalLeader: 'Sí',
      roleSpecialty: 'Líder local Damas',
      startDate: '2025-01-10',
      status: 'Activo',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'cm-4',
      personId: 'p-marcos-d',
      churchId: 'ch-salto',
      committeeKey: 'jovenes',
      isLocalLeader: 'Sí',
      roleSpecialty: 'Líder local Jóvenes',
      startDate: '2025-02-15',
      status: 'Activo',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ]

  seed.designRequests = [
    {
      id: 'dr-1',
      name: 'Afiche Culto Misionero Jóvenes 2026',
      category: 'Afiche',
      churchId: 'ch-maldonado',
      committeeKey: 'jovenes',
      deadline: '2026-11-15',
      status: 'En desarrollo',
      description: 'Diseño para difusión de culto misionero departamental',
      finalFile: '',
      notes: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ]

  seed.socialMetrics = [
    {
      id: 'sm-1',
      churchId: 'ch-maldonado',
      platform: 'Instagram',
      initialDate: '2026-01-01',
      initialFollowers: '450',
      currentDate: '2026-10-01',
      currentFollowers: '680',
      calculatedGrowth: 230,
      calculatedPercentage: 51.1,
      notes: 'Campañas de difusión de cultos presenciales',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ]

  const demoMonth = new Date().toISOString().slice(0, 7)
  const stamp = '2026-01-01T00:00:00.000Z'
  const LOCAL_ROLES = ['Pastor local', 'Secretaría', 'Tesorero', 'Líder de Jóvenes', 'Líder de Damas', 'Músico', 'Encargado de células', 'Junta Local']
  const brotherNames = [
    ['Andrés', 'Pereira'], ['Beatriz', 'Cornejo'], ['Camila', 'Sosa'], ['Daniel', 'Silva'],
    ['Elena', 'Ramos'], ['Federico', 'Núñez'], ['Gabriela', 'Méndez'], ['Héctor', 'Paz'],
    ['Irene', 'Acosta'], ['Javier', 'López'], ['Karina', 'Suárez'], ['Leonardo', 'Franco'],
    ['Marina', 'Salas'], ['Nicolás', 'Olivera'], ['Olga', 'Cabrera'], ['Pablo', 'Viera'],
    ['Raquel', 'Pintos'], ['Santiago', 'Correa'], ['Tamara', 'Maldonado'], ['Uriel', 'Costa'],
    ['Verónica', 'Perdomo'], ['Walter', 'Bentancur'], ['Ximena', 'Ríos'], ['Yamila', 'Sánchez'],
    ['Agustín', 'Barrios'], ['Brenda', 'Lemos'], ['Cristian', 'Pérez'], ['Diana', 'Roldán'],
    ['Emiliano', 'García'], ['Fátima', 'Larrañaga']
  ]
  const brotherPeople = brotherNames.map(([name, surname], index) => ({
    id: `demo-brother-${String(index + 1).padStart(2, '0')}`,
    name,
    surname,
    churchId: index % 10 < 7 ? 'ch-maldonado' : index % 2 === 0 ? 'ch-salto' : 'ch-melo',
    preachingPlaceId: index % 10 === 0 ? 'ch-san-carlos' : '',
    birthday: `${1975 + (index % 28)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 25) + 1).padStart(2, '0')}`,
    gender: index % 2 === 0 ? 'Masculino' : 'Femenino',
    phone: `09${String(4100000 + index * 137).slice(0, 7)}`,
    status: 'Miembro',
    role: index < 8 ? LOCAL_ROLES[index % LOCAL_ROLES.length] : '',
    notes: 'Perfil de prueba oficial para validar listados, cumpleaños y reportes.',
    createdAt: stamp,
    updatedAt: stamp
  }))
  const friendNames = [
    ['Alicia', 'Duarte'], ['Bruno', 'Fagúndez'], ['Cecilia', 'Mora'], ['Diego', 'Lima'], ['Eva', 'Silveira'],
    ['Fabián', 'Rossi'], ['Gloria', 'Techera'], ['Hugo', 'Píriz'], ['Inés', 'González'], ['José', 'Ferreira']
  ]
  const friendPeople = friendNames.map(([name, surname], index) => ({
    id: `demo-friend-${String(index + 1).padStart(2, '0')}`,
    name,
    surname,
    churchId: index % 2 === 0 ? 'ch-maldonado' : 'ch-salto',
    preachingPlaceId: '',
    birthday: `${1990 + (index % 12)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 20) + 1).padStart(2, '0')}`,
    gender: index % 2 === 0 ? 'Femenino' : 'Masculino',
    phone: `09${String(4800000 + index * 173).slice(0, 7)}`,
    status: 'Amigo',
    role: '',
    notes: 'Contacto de prueba para seguimiento pastoral.',
    createdAt: stamp,
    updatedAt: stamp
  }))
  seed.people = [...seed.people, ...brotherPeople, ...friendPeople]

  // Lote 3: Maldonado solo tiene dos cultos habituales por semana (Jueves y Domingo)
  seed.serviceSchedules = [
    {
      id: 'sched-maldonado-jueves',
      churchId: 'ch-maldonado',
      day: 'Jueves',
      time: '20:00',
      name: 'Culto habitual de jueves',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'sched-maldonado-domingo',
      churchId: 'ch-maldonado',
      day: 'Domingo',
      time: '19:00',
      name: 'Culto dominical',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'sched-salto-domingo',
      churchId: 'ch-salto',
      day: 'Domingo',
      time: '19:00',
      name: 'Culto dominical Salto',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'sched-melo-domingo',
      churchId: 'ch-melo',
      day: 'Domingo',
      time: '19:00',
      name: 'Culto dominical Melo',
      createdAt: stamp,
      updatedAt: stamp
    }
  ]

  const monthEvents = [
    { id: 'demo-event-01', name: 'Culto dominical', date: `${demoMonth}-04`, time: '19:00', kind: 'Culto', location: 'Templo Maldonado', responsible: 'Pastor Maldonado', activityId: '', committeeKey: '', modality: 'Presencial', onlineUrl: '', scopeAudience: 'Congregación local', publicVisible: 'Sí', featured: 'No', showInChurchCalendar: 'Sí', scheduleId: 'sched-maldonado-domingo' },
    { id: 'demo-event-02', name: 'Culto habitual de jueves', date: `${demoMonth}-08`, time: '20:00', kind: 'Culto', location: 'Templo Maldonado', responsible: 'Junta Local', activityId: '', committeeKey: '', modality: 'Presencial', onlineUrl: '', scopeAudience: 'Congregación local', publicVisible: 'Sí', featured: 'No', showInChurchCalendar: 'Sí', scheduleId: 'sched-maldonado-jueves' },
    { id: 'demo-event-03', name: 'Encuentro de jóvenes', date: `${demoMonth}-10`, time: '19:30', kind: 'Jóvenes', location: 'Templo Maldonado', responsible: 'Comité de Jóvenes', activityId: '', committeeKey: 'jovenes', modality: 'Presencial', onlineUrl: '', scopeAudience: 'Jóvenes', publicVisible: 'Sí', featured: 'Sí', showInChurchCalendar: 'Sí', scheduleId: '' },
    { id: 'demo-event-04', name: 'Culto dominical', date: `${demoMonth}-11`, time: '19:00', kind: 'Culto', location: 'Templo Maldonado', responsible: 'Pastor Maldonado', activityId: '', committeeKey: '', modality: 'Presencial', onlineUrl: '', scopeAudience: 'Congregación local', publicVisible: 'Sí', featured: 'No', showInChurchCalendar: 'Sí', scheduleId: 'sched-maldonado-domingo' },
    { id: 'demo-event-05', name: 'Ayuno congregacional', date: `${demoMonth}-14`, time: '09:00', kind: 'Ayuno', location: 'Templo Maldonado', responsible: 'Junta Local', activityId: '', committeeKey: '', modality: 'Presencial', onlineUrl: '', scopeAudience: 'Congregación local', publicVisible: 'Sí', featured: 'No', showInChurchCalendar: 'Sí', scheduleId: '' },
    { id: 'demo-event-06', name: 'Devocional de evangelismo', date: `${demoMonth}-17`, time: '18:00', kind: 'Devocional', location: 'Plaza San Fernando', responsible: 'Comité de Evangelismo', activityId: '', committeeKey: 'misiones', modality: 'Presencial', onlineUrl: '', scopeAudience: 'Congregación local', publicVisible: 'Sí', featured: 'No', showInChurchCalendar: 'Sí', scheduleId: '' }
  ]

  const nationalAndCommitteeEvents = [
    {
      id: 'nat-event-convencion',
      name: 'Convención Nacional Anual 2026',
      churchId: '',
      date: `${demoMonth}-24`,
      time: '18:00',
      kind: 'Convención',
      modality: 'Presencial',
      onlineUrl: '',
      location: 'Centro de Convenciones Montevideo',
      responsible: 'Junta Nacional',
      activityId: '',
      committeeKey: '',
      scopeAudience: 'Nacional',
      publicVisible: 'Sí',
      featured: 'Sí',
      showInChurchCalendar: 'Sí',
      scheduleId: '',
      notes: 'Convención anual extraordinaria con delegaciones de todas las congregaciones.',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'nat-event-campamento',
      name: 'Campamento Nacional de Verano',
      churchId: '',
      date: `${demoMonth}-28`,
      time: '10:00',
      kind: 'Campamento',
      modality: 'Presencial',
      onlineUrl: '',
      location: 'Predio Nacional Piriápolis',
      responsible: 'Administración Nacional',
      activityId: '',
      committeeKey: '',
      scopeAudience: 'Nacional',
      publicVisible: 'Sí',
      featured: 'Sí',
      showInChurchCalendar: 'Sí',
      scheduleId: '',
      notes: 'Encuentro nacional extraordinario de comunión y edificación.',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'com-event-jovenes-presencial',
      name: 'Vigilia Nacional de Jóvenes',
      churchId: '',
      date: `${demoMonth}-21`,
      time: '21:00',
      kind: 'Jóvenes',
      modality: 'Presencial',
      onlineUrl: '',
      location: 'Sede Departamental Maldonado',
      responsible: 'Comité Nacional de Jóvenes',
      activityId: 'nat-act-jovenes-1',
      committeeKey: 'jovenes',
      scopeAudience: 'Comité Nacional de Jóvenes',
      publicVisible: 'Sí',
      featured: 'Sí',
      showInChurchCalendar: 'Sí',
      scheduleId: '',
      notes: 'Encuentro juvenil nacional presencial con delegaciones por congregación.',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'com-event-jovenes-online',
      name: 'Capacitación Nacional de Líderes Juveniles (Online)',
      churchId: '',
      date: `${demoMonth}-25`,
      time: '20:30',
      kind: 'Capacitación',
      modality: 'Online',
      onlineUrl: 'https://zoom.us/j/ieanjesus-jovenes-2026',
      location: 'Sala Zoom Nacional',
      responsible: 'Comité Nacional de Jóvenes',
      activityId: 'nat-act-jovenes-1',
      committeeKey: 'jovenes',
      scopeAudience: 'Comité Nacional de Jóvenes',
      publicVisible: 'Sí',
      featured: 'No',
      showInChurchCalendar: 'Sí',
      scheduleId: '',
      notes: 'Reunión virtual de planificación y capacitación para líderes juveniles de cada congregación.',
      createdAt: stamp,
      updatedAt: stamp
    }
  ]

  seed.events = [
    ...monthEvents.map(event => ({ ...event, churchId: 'ch-maldonado', notes: 'Actividad de demostración local.', createdAt: stamp, updatedAt: stamp })),
    ...nationalAndCommitteeEvents
  ]

  const maldonadoPeople = brotherPeople.filter(person => person.churchId === 'ch-maldonado')
  const saltoPeople = brotherPeople.filter(person => person.churchId === 'ch-salto')
  const meloPeople = brotherPeople.filter(person => person.churchId === 'ch-melo')

  seed.attendance = [
    ...monthEvents.map((event, index) => ({
      id: `demo-attendance-${index + 1}`,
      eventId: event.id,
      churchId: 'ch-maldonado',
      people: [
        'p-valeria-g',
        ...(index % 2 === 0 ? ['p-mateo-g'] : []),
        ...(index % 3 === 0 ? ['p-lucia-f'] : []),
        ...maldonadoPeople.filter((_, pIdx) => (pIdx + index) % 3 !== 0).slice(0, 10 + index).map(person => person.id)
      ],
      visitors: index + 1,
      visitorsByChurch: {},
      onlineConfirmations: [],
      activityId: '',
      assignmentId: ''
    })),
    {
      id: 'demo-attendance-nat-convencion',
      eventId: 'nat-event-convencion',
      churchId: '',
      people: [
        'p-valeria-g', 'p-mateo-g', 'p-lucia-f', 'p-roberto-g', 'p-marcos-d',
        ...maldonadoPeople.slice(0, 8).map(p => p.id),
        ...saltoPeople.slice(0, 4).map(p => p.id),
        ...meloPeople.slice(0, 3).map(p => p.id)
      ],
      visitors: 7,
      visitorsByChurch: { 'ch-maldonado': 4, 'ch-salto': 2, 'ch-melo': 1 },
      onlineConfirmations: [],
      activityId: '',
      assignmentId: ''
    },
    {
      id: 'demo-attendance-com-jovenes-presencial',
      eventId: 'com-event-jovenes-presencial',
      churchId: '',
      people: [
        'p-valeria-g', 'p-mateo-g', 'p-marcos-d',
        ...maldonadoPeople.slice(0, 6).map(p => p.id),
        ...saltoPeople.slice(0, 3).map(p => p.id),
        ...meloPeople.slice(0, 2).map(p => p.id)
      ],
      visitors: 5,
      visitorsByChurch: { 'ch-maldonado': 3, 'ch-salto': 2 },
      onlineConfirmations: [],
      activityId: 'nat-act-jovenes-1',
      assignmentId: ''
    },
    {
      id: 'demo-attendance-com-jovenes-online',
      eventId: 'com-event-jovenes-online',
      churchId: '',
      people: [
        'p-valeria-g', 'p-mateo-g', 'p-marcos-d',
        ...maldonadoPeople.slice(0, 4).map(p => p.id),
        ...saltoPeople.slice(0, 3).map(p => p.id),
        ...meloPeople.slice(0, 2).map(p => p.id)
      ],
      visitors: 3,
      visitorsByChurch: { 'ch-maldonado': 1, 'ch-salto': 1, 'ch-melo': 1 },
      onlineConfirmations: ['p-valeria-g', 'p-mateo-g', 'p-marcos-d'],
      activityId: 'nat-act-jovenes-1',
      assignmentId: ''
    }
  ]

  // Distribución entre congregaciones manteniendo el total nacional de ingresos en 79.800,00
  const demoTransactions = [
    ['demo-tx-01', 'ch-maldonado', `${demoMonth}-02`, 'Ingreso', 'Diezmo', 'Diezmos congregacionales', '38500', '', ''],
    ['demo-tx-02', 'ch-maldonado', `${demoMonth}-04`, 'Ingreso', 'Ofrenda', 'Ofrenda culto domingo', '12600', '', ''],
    ['demo-tx-03', 'ch-maldonado', `${demoMonth}-05`, 'Ingreso', 'Donación', 'Donación familia visitante', '4500', '', ''],
    ['demo-tx-04', 'ch-maldonado', `${demoMonth}-06`, 'Egreso', 'Gasto', 'Compra de alimentos', '6200', '', ''],
    ['demo-tx-05', 'ch-maldonado', `${demoMonth}-07`, 'Egreso', 'Gasto', 'Servicio de electricidad', '4100', '', ''],
    ['demo-tx-06', 'ch-salto', `${demoMonth}-08`, 'Ingreso', 'Ofrenda', 'Ofrenda culto general Salto', '8700', '', 'jovenes'],
    ['demo-tx-07', 'ch-maldonado', `${demoMonth}-09`, 'Ingreso', 'Ofrenda', 'Aporte lugar San Carlos', '5200', 'ch-san-carlos', ''],
    ['demo-tx-08', 'ch-salto', `${demoMonth}-10`, 'Egreso', 'Gasto', 'Material para jóvenes Salto', '2800', '', 'jovenes'],
    ['demo-tx-09', 'ch-melo', `${demoMonth}-11`, 'Ingreso', 'Ofrenda', 'Ofrenda culto congregacional Melo', '10300', '', ''],
    ['demo-tx-10', 'ch-melo', `${demoMonth}-12`, 'Egreso', 'Gasto', 'Mantenimiento del templo Melo', '3500', '', '']
  ]
  seed.transactions = demoTransactions.map(([id, churchId, date, direction, category, name, amount, preachingPlaceId, committeeKey]) => ({
    id, name, description: name, churchId, preachingPlaceId, date, direction, category, subCategory: '', amount,
    eventId: '', activityId: '', committeeKey, financialStatus: 'Registrado', personId: '', groupId: '', receiptPhoto: '', reference: `COMP-${id.slice(-2)}`, notes: 'Movimiento financiero verificado.', createdAt: stamp, updatedAt: stamp
  }))

  const cellSeed = [
    ['centro', 'Centro', 10, 7, 3, 400],
    ['barrio-norte', 'Barrio Norte', 10, 6, 3, 900],
    ['la-milagrosa', 'La Milagrosa', 8, 5, 3, 635],
    ['el-hipodromo', 'El Hipódromo', 7, 5, 2, 300],
    ['cuneti-eucaliptus', 'Cuñeti-Eucaliptus', 6, 4, 2, 470],
    ['maldonado-nuevo', 'Maldonado Nuevo', 6, 3, 2, 540],
    ['rocha', 'Rocha', 3, 2, 1, 220],
    ['cerro-pelado', 'Cerro Pelado', 2, 1, 1, 160]
  ] as const

  const localCommitteeSeed = [
    {
      id: 'loc-com-jovenes-maldonado',
      name: 'Comité Local de Jóvenes',
      kind: 'Comité local',
      churchId: 'ch-maldonado',
      committeeKey: 'jovenes',
      leaderId: 'p-valeria-g',
      schedule: 'Sábados 19:30',
      location: 'Templo Maldonado',
      notes: 'Comité juvenil local vinculado a Conquistadores Pentecostaes.',
      members: ['p-valeria-g', 'p-mateo-g'],
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'loc-com-damas-maldonado',
      name: 'Comité Local de Damas',
      kind: 'Comité local',
      churchId: 'ch-maldonado',
      committeeKey: 'damas',
      leaderId: 'p-lucia-f',
      schedule: 'Martes 18:30',
      location: 'Templo Maldonado',
      notes: 'Comité local de damas vinculado al ministerio nacional Virtuosas.',
      members: ['p-lucia-f'],
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'loc-com-musica-maldonado',
      name: 'Ministerio Local de Alabanza y Música',
      kind: 'Comité local',
      churchId: 'ch-maldonado',
      committeeKey: 'musica',
      leaderId: 'p-mateo-g',
      schedule: 'Jueves 18:30',
      location: 'Templo Maldonado',
      notes: 'Equipo local de músicos y dirección de alabanza.',
      members: ['p-mateo-g'],
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'loc-com-misiones-maldonado',
      name: 'Comité Local de Evangelismo y Misiones',
      kind: 'Comité local',
      churchId: 'ch-maldonado',
      committeeKey: 'misiones',
      leaderId: 'p-roberto-g',
      schedule: 'Sábados 16:00',
      location: 'Maldonado y San Carlos',
      notes: 'Equipo de evangelismo barrial y atención a lugares de predicación.',
      members: ['p-roberto-g'],
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'loc-com-jovenes-salto',
      name: 'Comité Local de Jóvenes Salto',
      kind: 'Comité local',
      churchId: 'ch-salto',
      committeeKey: 'jovenes',
      leaderId: 'p-marcos-d',
      schedule: 'Sábados 20:00',
      location: 'Templo Salto',
      notes: 'Equipo juvenil local de la Congregación Salto.',
      members: ['p-marcos-d'],
      createdAt: stamp,
      updatedAt: stamp
    }
  ]

  seed.groups = [
    ...seed.groups,
    ...cellSeed.map(([key, cellName], index) => ({
      id: `cell-${key}`,
      name: cellName,
      kind: 'Célula',
      churchId: 'ch-maldonado',
      committeeKey: '',
      leaderId: brotherPeople[index]?.id || '',
      schedule: index % 2 === 0 ? 'Miércoles 20:00' : 'Viernes 20:00',
      location: `Zona ${cellName}`,
      notes: 'Grupo de amistad de demostración.',
      members: [],
      createdAt: stamp,
      updatedAt: stamp
    })),
    {
      id: 'cell-salto-norte',
      name: 'Barrio Artigas Salto',
      kind: 'Célula',
      churchId: 'ch-salto',
      committeeKey: '',
      leaderId: 'p-marcos-d',
      schedule: 'Miércoles 20:00',
      location: 'Zona Norte Salto',
      notes: 'Célula activa en Salto.',
      members: [],
      createdAt: stamp,
      updatedAt: stamp
    },
    ...localCommitteeSeed
  ]

  seed.cellReports = [
    ...cellSeed.map(([key, cellName, adults, visitors, children, offering], index) => ({
      id: `cell-report-${key}`,
      name: `${cellName} · cuarta semana`,
      churchId: 'ch-maldonado',
      groupId: `cell-${key}`,
      weekStart: '2026-08-31',
      weekEnd: '2026-09-04',
      adults: String(adults),
      visitors: String(visitors),
      children: String(children),
      offering: String(offering),
      leader: `${brotherPeople[index]?.name || ''} ${brotherPeople[index]?.surname || ''}`.trim(),
      source: index < 5 ? 'Google Forms / CSV' : 'Carga local',
      notes: 'Respuesta semanal de demostración.',
      createdAt: stamp,
      updatedAt: stamp
    })),
    {
      id: 'cell-report-salto-norte',
      name: 'Barrio Artigas Salto · tercera semana',
      churchId: 'ch-salto',
      groupId: 'cell-salto-norte',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-28',
      adults: '9',
      visitors: '4',
      children: '3',
      offering: '580',
      leader: 'Marcos Díaz',
      source: 'Carga local',
      notes: 'Reporte semanal de Salto.',
      createdAt: stamp,
      updatedAt: stamp
    }
  ]

  seed.nationalActivities = [
    {
      id: 'nat-act-jovenes-1',
      name: 'Vigilia Regional de Jóvenes',
      committeeKey: 'jovenes',
      kind: 'Vigilia',
      modality: 'Presencial',
      onlineUrl: '',
      scope: 'Por congregación',
      startDate: `${demoMonth}-21`,
      endDate: `${demoMonth}-21`,
      deadline: `${demoMonth}-26`,
      objective: 'Fortalecer la comunión juvenil y capacitar equipos locales.',
      instructions: 'Confirmar delegación local, registrar jóvenes asistentes y enviar resumen de testimonios.',
      requiresAttendance: 'Sí',
      requiresOffering: 'Sí',
      requiresReport: 'Sí',
      requiresPhotos: 'Sí',
      status: 'Publicada',
      createdBy: 'lider_jovenes',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'nat-act-misiones-1',
      name: 'Jornada Nacional de Evangelismo Simultáneo',
      committeeKey: 'misiones',
      kind: 'Campaña',
      modality: 'Presencial',
      onlineUrl: '',
      scope: 'Nacional',
      startDate: `${demoMonth}-18`,
      endDate: `${demoMonth}-19`,
      deadline: `${demoMonth}-25`,
      objective: 'Alcanzar nuevos hogares con literatura bíblica y seguimiento pastoral.',
      instructions: 'Informar cantidad de hermanos movilizados, contactos nuevos y ofrenda misionera.',
      requiresAttendance: 'Sí',
      requiresOffering: 'Sí',
      requiresReport: 'Sí',
      requiresPhotos: 'Sí',
      status: 'En curso',
      createdBy: 'admin_nacional',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'nat-act-damas-1',
      name: 'Encuentro Regional Virtuosas',
      committeeKey: 'damas',
      kind: 'Conferencia',
      modality: 'Presencial',
      onlineUrl: '',
      scope: 'Por congregación',
      startDate: `${demoMonth}-15`,
      endDate: `${demoMonth}-15`,
      deadline: `${demoMonth}-22`,
      objective: 'Edificación de los comités locales de damas.',
      instructions: 'Enviar reporte de asistencia y ofrenda del encuentro.',
      requiresAttendance: 'Sí',
      requiresOffering: 'Sí',
      requiresReport: 'Sí',
      requiresPhotos: 'No',
      status: 'En curso',
      createdBy: 'admin_nacional',
      createdAt: stamp,
      updatedAt: stamp
    }
  ]

  seed.activityAssignments = [
    {
      id: 'assign-jovenes-salto',
      activityId: 'nat-act-jovenes-1',
      churchId: 'ch-salto',
      committeeKey: 'jovenes',
      status: 'En progreso',
      localEventId: '',
      attendanceCount: 14,
      visitorsCount: 3,
      offeringAmount: 1850,
      reportSummary: 'Delegación juvenil de Salto confirmada con 14 jóvenes.',
      achievementNotes: 'Excelente participación del equipo de alabanza juvenil.',
      difficulties: '',
      photos: [],
      submittedBy: 'Esteban Martínez',
      submittedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      reviewNotes: '',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'assign-misiones-maldonado',
      activityId: 'nat-act-misiones-1',
      churchId: 'ch-maldonado',
      committeeKey: 'misiones',
      status: 'Confirmado',
      localEventId: 'demo-event-06',
      attendanceCount: 22,
      visitorsCount: 6,
      offeringAmount: 2400,
      reportSummary: 'Se visitaron 35 familias en Maldonado y San Carlos.',
      achievementNotes: 'Se abrieron dos nuevos hogares de oración.',
      difficulties: '',
      photos: [],
      submittedBy: 'Carlos Rodríguez',
      submittedAt: stamp,
      reviewedBy: 'Administración Nacional',
      reviewedAt: stamp,
      reviewNotes: 'Informe completo y verificado.',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'assign-misiones-melo',
      activityId: 'nat-act-misiones-1',
      churchId: 'ch-melo',
      committeeKey: 'misiones',
      status: 'Pendiente',
      localEventId: '',
      attendanceCount: 0,
      visitorsCount: 0,
      offeringAmount: 0,
      reportSummary: '',
      achievementNotes: '',
      difficulties: '',
      photos: [],
      submittedBy: '',
      submittedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      reviewNotes: '',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'assign-damas-maldonado',
      activityId: 'nat-act-damas-1',
      churchId: 'ch-maldonado',
      committeeKey: 'damas',
      status: 'Completado',
      localEventId: '',
      attendanceCount: 19,
      visitorsCount: 4,
      offeringAmount: 1950,
      reportSummary: 'Encuentro con participación de 19 hermanas y 4 visitas.',
      achievementNotes: 'Gran tiempo de oración e intercesión.',
      difficulties: '',
      photos: [],
      submittedBy: 'Lucía Fernández',
      submittedAt: stamp,
      reviewedBy: '',
      reviewedAt: '',
      reviewNotes: '',
      createdAt: stamp,
      updatedAt: stamp
    }
  ]

  seed.monthlyReports = [
    {
      id: 'demo-report-monthly',
      name: `Informe mensual ${demoMonth} · Maldonado`,
      churchId: 'ch-maldonado',
      month: demoMonth,
      reportType: 'monthly',
      status: 'Enviado',
      summary: 'Mes de demostración con cultos habituales de jueves y domingo, encuentro juvenil y movimientos financieros registrados.',
      pages: [{ title: 'Actividades destacadas', body: 'Se realizaron los cultos habituales de jueves y domingo, ayuno congregacional, devocional de evangelismo y encuentro de jóvenes.', photos: [] }],
      metrics: { encounters: 6, attendance: 64, income: 60800, expenses: 10300, baptismsWater: 1, baptismsSpirit: 2, preachingPlaces: 1, refam: 2, loveBaskets: 4, intercession: 8, men: 13, women: 18, youth: 17, children: 7, visitors: 10 },
      notes: 'Pendiente de confirmación por Secretaría Nacional.',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'demo-report-monthly-salto',
      name: `Informe mensual ${demoMonth} · Salto`,
      churchId: 'ch-salto',
      month: demoMonth,
      reportType: 'monthly',
      status: 'Confirmado',
      summary: 'Informe mensual de Salto recibido y confirmado por Administración Nacional.',
      pages: [{ title: 'Resumen mensual Salto', body: 'Crecimiento sostenido en células y comité de jóvenes.', photos: [] }],
      metrics: { encounters: 5, attendance: 42, income: 8700, expenses: 2800, baptismsWater: 2, baptismsSpirit: 1, preachingPlaces: 0, refam: 1, loveBaskets: 3, intercession: 5, men: 10, women: 14, youth: 12, children: 6, visitors: 5 },
      notes: 'Revisado y confirmado sin observaciones.',
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      id: 'demo-report-monthly-melo',
      name: `Informe mensual ${demoMonth} · Melo`,
      churchId: 'ch-melo',
      month: demoMonth,
      reportType: 'monthly',
      status: 'Borrador',
      summary: 'Informe en preparación por la secretaría local de Melo.',
      pages: [{ title: 'Avance mensual Melo', body: 'Falta adjuntar cierre de tesorería local.', photos: [] }],
      metrics: { encounters: 4, attendance: 28, income: 10300, expenses: 3500, baptismsWater: 0, baptismsSpirit: 1, preachingPlaces: 0, refam: 1, loveBaskets: 2, intercession: 4, men: 8, women: 11, youth: 6, children: 3, visitors: 4 },
      notes: 'Observado: pendiente adjuntar comprobante de ofrenda misionera.',
      createdAt: stamp,
      updatedAt: stamp
    }
  ]

  seed.messages = [
    {
      id: 'msg-1',
      channel: 'comite:jovenes',
      senderRole: 'national_committee',
      senderName: 'Líder Nacional de Jóvenes',
      churchId: 'ch-maldonado',
      committeeKey: 'jovenes',
      subject: 'Coordinación Vigilia Nacional de Jóvenes',
      body: 'Bendiciones hermanos de Maldonado y Salto. Recordamos confirmar la lista de jóvenes para la Vigilia Nacional presencial y el enlace de capacitación online.',
      contextType: 'activity',
      contextId: 'nat-act-jovenes-1',
      readBy: 'admin_nacional,lider_jovenes',
      createdAt: '2026-10-15T14:20:00.000Z',
      updatedAt: '2026-10-15T14:20:00.000Z'
    },
    {
      id: 'msg-2',
      channel: 'iglesia:ch-maldonado',
      senderRole: 'church_leadership',
      senderName: 'Pastor Carlos Rodríguez (Maldonado)',
      churchId: 'ch-maldonado',
      committeeKey: 'jovenes',
      subject: 'Delegación de Maldonado lista',
      body: 'Paz de Cristo. Confirmamos la participación del Comité Local de Jóvenes de Maldonado junto con los hermanos de San Carlos.',
      contextType: 'activity',
      contextId: 'nat-act-jovenes-1',
      readBy: 'pastor_maldonado,lider_jovenes',
      createdAt: '2026-10-16T09:45:00.000Z',
      updatedAt: '2026-10-16T09:45:00.000Z'
    },
    {
      id: 'msg-3',
      channel: 'nacional:general',
      senderRole: 'national_admin',
      senderName: 'Administración Nacional',
      churchId: '',
      committeeKey: '',
      subject: 'Recepción de informes mensuales y Convención Anual',
      body: 'Solicitamos a todas las congregaciones verificar el envío del informe mensual del período actual y registrar su delegación para la Convención Nacional Anual.',
      contextType: 'report',
      contextId: 'demo-report-monthly',
      readBy: 'admin_nacional',
      createdAt: '2026-10-17T11:00:00.000Z',
      updatedAt: '2026-10-17T11:00:00.000Z'
    }
  ]

  return seed
}

// Reglas para guardar un registro (validación, asistencia única por culto, sin duplicar horarios).
// Las usan el almacenamiento del navegador y la base central, para que ambos guarden igual.
export function prepareRecord(state: Data, collection: string, body: any): RecordData {
  if (!state[collection] && collection !== 'attendance') throw new Error('Colección no válida.')
  const lookup = (type: string, id: string) => state[type]?.find(r => r.id === id)
  let value: any
  let id = body.id
  if (collection === 'attendance') {
    const event = lookup('events', body.eventId)
    if (!event) throw new Error('Selecciona un encuentro existente.')
    const people = [...new Set<string>(body.people || [])]
    if (people.some(personId => !lookup('people', personId) || (event.churchId && lookup('people', personId)?.churchId !== event.churchId))) {
      throw new Error('Hay personas de otra congregación.')
    }
    const visitors = Number(body.visitors ?? 0)
    if (!Number.isInteger(visitors) || visitors < 0 || visitors > 100000) throw new Error('Cantidad de visitas no válida.')
    value = {
      eventId: event.id,
      churchId: event.churchId || '',
      people,
      visitors,
      visitorsByChurch: body.visitorsByChurch && typeof body.visitorsByChurch === 'object' ? body.visitorsByChurch : {},
      onlineConfirmations: Array.isArray(body.onlineConfirmations) ? body.onlineConfirmations : [],
      activityId: body.activityId ? String(body.activityId) : '',
      assignmentId: body.assignmentId ? String(body.assignmentId) : ''
    }
    id = state.attendance.find(a => a.eventId === event.id)?.id
  } else {
    value = validateRecord(collection, body, lookup)
    if (collection === 'serviceSchedules' && !id) {
      const existingSched = state.serviceSchedules.find(
        s => s.churchId === value.churchId && s.day === value.day && s.time === value.time
      )
      if (existingSched) id = existingSched.id
    }
    if (collection === 'events' && !id && value.scheduleId) {
      const existingEvent = state.events.find(
        e => e.churchId === value.churchId && e.date === value.date && e.time === value.time && e.name === value.name
      )
      if (existingEvent) id = existingEvent.id
    }
  }
  const previous = id ? lookup(collection, id) : undefined
  if (id && !previous) throw new Error('No se encontró el registro original.')
  if (previous?.churchId && value.churchId && previous.churchId !== value.churchId) throw new Error('El traslado entre congregaciones requiere revisión.')
  return { ...value, id: id || crypto.randomUUID(), createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
}

// A read/write transaction serializes saves across tabs sharing this database.
export async function localApi(path: string, body?: any): Promise<any> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('portal-nacional-oficial-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('data')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento del navegador.'))
  })
  return new Promise((resolve, reject) => {
    const isWrite = Boolean(body) || path === 'seed' || path === 'restore' || path === 'state'
    const tx = db.transaction('data', isWrite ? 'readwrite' : 'readonly')
    const store = tx.objectStore('data')
    let result: any
    let failure: Error | undefined
    const request = store.get('records')
    request.onsuccess = () => {
      try {
        const raw = request.result
        const base = empty()
        const state: Data = { ...base, ...(raw || {}) }
        for (const key of Object.keys(base)) {
          if (!Array.isArray(state[key])) state[key] = []
        }

        if (path === 'seed') {
          const seeded: any = createDefaultSeed()
          seeded._demoSeedVersion = DEMO_SEED_VERSION
          store.put(seeded, 'records')
          result = seeded
          return
        }

        if (path === 'state' && !raw) {
          const seeded: any = createDefaultSeed()
          seeded._demoSeedVersion = DEMO_SEED_VERSION
          store.put(seeded, 'records')
          result = seeded
          return
        }

        if (path === 'state' && raw && raw._demoSeedVersion !== DEMO_SEED_VERSION) {
          const demo: any = createDefaultSeed()
          const merged: any = { ...state, _demoSeedVersion: DEMO_SEED_VERSION }
          for (const key of Object.keys(base)) {
            const currentRows: RecordData[] = Array.isArray(state[key]) ? state[key] : []
            const demoMap = new Map<string, RecordData>((demo[key] || []).map((row: RecordData) => [String(row.id), row]))
            const updatedCurrent: RecordData[] = currentRows.map((row: RecordData) => demoMap.get(String(row.id)) || row)
            const currentIds = new Set(updatedCurrent.map((row: RecordData) => row.id))
            merged[key] = [...updatedCurrent, ...(demo[key] || []).filter((row: RecordData) => row.id && !currentIds.has(row.id))]
          }
          // Lote 3: Asegurar que Maldonado solo conserve Jueves y Domingo como cultos habituales sin duplicados
          merged.serviceSchedules = deduplicateSchedules(
            (merged.serviceSchedules || []).filter((s: RecordData) =>
              s.churchId !== 'ch-maldonado' || s.day === 'Jueves' || s.day === 'Domingo'
            )
          )
          store.put(merged, 'records')
          result = merged
          return
        }

        if (!body) { result = state; return }
        if (path === 'restore') {
          const clean = validateState(body, () => crypto.randomUUID())
          store.put(clean, 'records')
          result = clean
          return
        }
        const collection = path.split('/').pop()!
        result = prepareRecord(state, collection, body)
        state[collection] = [...state[collection].filter(r => r.id !== result.id), result]
        store.put(state, 'records')
      } catch (error) { failure = error as Error; tx.abort() }
    }
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onabort = tx.onerror = () => { db.close(); reject(failure || new Error('No se pudo guardar. Comprueba el espacio disponible y exporta un respaldo.')) }
  })
}
