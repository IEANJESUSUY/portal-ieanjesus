import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from './store.mjs'
import { calculateAge, getAgeCategory, segmentPerson } from '../shared/catalog.mjs'

test('registros persistentes, relaciones, asistencia única y validaciones', () => {
  const dir = mkdtempSync(join(tmpdir(), 'portal-test-'))
  let store = createStore(dir)
  try {
    const church = store.save('churches', { name: 'Iglesia de prueba' })
    const other = store.save('churches', { name: 'Otra iglesia' })
    const family = store.save('families', { name: 'Familia de prueba', churchId: church.id, zone: 'Centro' })
    const person = store.save('people', { name: 'Ana', surname: 'Prueba', churchId: church.id, familyId: family.id, status: 'Persona vinculada', birthday: '2000-02-29' })
    assert.throws(() => store.save('people', { ...person, birthday: '2001-02-29' }))
    assert.throws(() => store.save('people', { ...person, id: '', churchId: other.id }))
    
    // Group with members
    const group = store.save('groups', { name: 'Comité de Jóvenes', kind: 'Comité local', churchId: church.id, leaderId: person.id, members: [{ personId: person.id, role: 'Secretaria' }] })
    assert.equal(group.members.length, 1)
    assert.equal(group.members[0].role, 'Secretaria')

    // Preaching place validation
    assert.throws(() => store.save('churches', { name: 'Lugar San Carlos', isPreachingPlace: 'Sí' }))
    const preachingPlace = store.save('churches', { name: 'Lugar San Carlos', isPreachingPlace: 'Sí', parentChurchId: church.id })
    assert.equal(preachingPlace.parentChurchId, church.id)

    // National activity and character limit
    const longDesc = 'A'.repeat(501)
    assert.throws(() => store.save('nationalActivities', {
      name: 'Actividad con error',
      kind: 'Culto misionero',
      committeeKey: 'jovenes',
      scopeType: 'Todas las congregaciones',
      dateMode: 'Fecha definida por cada congregación',
      deadline: '2026-11-30',
      status: 'Publicada',
      description: longDesc
    }))

    const activity = store.save('nationalActivities', {
      name: 'Culto Misionero Nacional de Jóvenes',
      kind: 'Culto misionero',
      committeeKey: 'jovenes',
      scopeType: 'Todas las congregaciones',
      dateMode: 'Fecha definida por cada congregación',
      deadline: '2026-11-30',
      status: 'Publicada',
      description: 'Culto misionero nacional celebrado en cada congregación local'
    })
    assert.equal(activity.committeeKey, 'jovenes')

    // Activity assignment
    const assignment = store.save('activityAssignments', {
      name: 'Entrega Maldonado',
      activityId: activity.id,
      churchId: church.id,
      status: 'Enviada',
      localDate: '2026-10-20',
      attendanceCount: 45,
      visitorsCount: 4,
      financialData: {
        preMissionaryOfferings: 1200,
        missionaryServiceOffering: 4500,
        pledges: 800,
        totalGathered: 6500,
        totalSent: 6500,
        status: 'Enviado'
      }
    })
    assert.equal(assignment.status, 'Enviada')
    assert.equal(assignment.financialData.totalSent, 6500)

    // Social metrics growth calculation
    const metric = store.save('socialMetrics', {
      churchId: church.id,
      platform: 'Instagram',
      initialDate: '2026-01-01',
      initialFollowers: '100',
      currentDate: '2026-10-01',
      currentFollowers: '150'
    })
    assert.equal(metric.calculatedGrowth, 50)
    assert.equal(metric.calculatedPercentage, 50)

    const event = store.save('events', { name: 'Culto', churchId: church.id, date: '2026-10-09', kind: 'Culto', activityId: activity.id })
    store.save('attendance', { eventId: event.id, people: [person.id, person.id], visitors: 2, activityId: activity.id, assignmentId: assignment.id })
    store.save('attendance', { eventId: event.id, people: [person.id], visitors: 3, activityId: activity.id, assignmentId: assignment.id })
    assert.equal(store.all().attendance.length, 1)
    assert.equal(store.all().attendance[0].people.length, 1)
    assert.equal(store.all().attendance[0].visitors, 3)
    assert.equal(store.all().attendance[0].activityId, activity.id)
    assert.throws(() => store.save('attendance', { eventId: event.id, people: ['invalid'] }))

    const tx = {
      name: 'Ofrenda Misionera Jóvenes',
      churchId: church.id,
      date: '2026-10-09',
      direction: 'Ingreso',
      category: 'Ofrenda',
      subCategory: 'Ofrenda del culto misionero',
      amount: '4500.00',
      eventId: event.id,
      activityId: activity.id,
      committeeKey: 'jovenes',
      financialStatus: 'Enviado'
    }
    store.save('transactions', tx)
    assert.throws(() => store.save('transactions', { ...tx, amount: '-1' }))
    assert.throws(() => store.save('transactions', { ...tx, amount: '1.001' }))
    store.close(); store = createStore(dir)
    assert.equal(store.all().people[0].birthday, '2000-02-29')
    assert.equal(store.all().transactions[0].amount, '4500.00')
    assert.equal(store.all().nationalActivities.length, 1)
    assert.equal(store.all().activityAssignments.length, 1)

    // Test restore
    const snapshot = store.all()
    const restored = store.restore({ records: snapshot })
    assert.equal(restored.people.length, 1)
    assert.equal(restored.groups[0].members.length, 1)
    assert.equal(restored.nationalActivities.length, 1)

    // Test age helpers & segmentation
    assert.equal(typeof calculateAge('2000-01-01'), 'number')
    assert.equal(getAgeCategory('2020-01-01'), 'Niño')
    const segs = segmentPerson({ birthday: '2004-05-10', gender: 'Femenino', familyId: 'f1' })
    assert.ok(segs.includes('Jóvenes'))
    assert.ok(segs.includes('Familias'))
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }) }
})
