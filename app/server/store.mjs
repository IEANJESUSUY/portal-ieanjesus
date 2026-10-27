import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { catalog, validateRecord, validateState } from '../shared/catalog.mjs'

export function createStore(directory, databaseName = 'portal.sqlite') {
  mkdirSync(directory, { recursive: true })
  const db = new DatabaseSync(`${directory}/${databaseName}`)
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, collection TEXT NOT NULL, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, date TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT NOT NULL)')
  const all = () => db.prepare('SELECT collection, body FROM records').all().reduce((state, row) => {
    if (state[row.collection]) state[row.collection].push(JSON.parse(row.body))
    return state
  }, Object.fromEntries([...Object.keys(catalog), 'attendance'].map(key => [key, []])))
  const lookup = (collection, id) => { const row = db.prepare('SELECT body FROM records WHERE collection=? AND id=?').get(collection, id); return row ? JSON.parse(row.body) : null }
  function save(collection, input) {
    if (!catalog[collection] && collection !== 'attendance') throw new Error('Colección no válida.')
    if (input.id && !lookup(collection, input.id)) throw new Error('El registro ya no existe.')
    let body
    if (collection === 'attendance') {
      const event = lookup('events', input.eventId)
      if (!event) throw new Error('Selecciona un culto existente.')
      const people = [...new Set(input.people ?? [])]
      if (people.some(id => !lookup('people', id) || (event.churchId && lookup('people', id)?.churchId !== event.churchId))) throw new Error('La asistencia contiene personas de otra congregación.')
      const visitors = Number(input.visitors ?? 0)
      if (!Number.isInteger(visitors) || visitors < 0 || visitors > 100000) throw new Error('Cantidad de visitas no válida.')
      body = {
        eventId: event.id,
        churchId: event.churchId || '',
        people,
        visitors,
        visitorsByChurch: input.visitorsByChurch && typeof input.visitorsByChurch === 'object' ? input.visitorsByChurch : {},
        onlineConfirmations: Array.isArray(input.onlineConfirmations) ? input.onlineConfirmations : [],
        activityId: input.activityId ? String(input.activityId) : '',
        assignmentId: input.assignmentId ? String(input.assignmentId) : ''
      }
      input = { ...input, id: all().attendance.find(row => row.eventId === event.id)?.id }
    } else body = validateRecord(collection, input, lookup)
    const previous = input.id ? lookup(collection, input.id) : null
    if (previous?.churchId && body.churchId && body.churchId !== previous.churchId) throw new Error('El traslado entre iglesias requiere revisión; crea la ficha en la iglesia correcta.')
    const result = { ...body, id: input.id || randomUUID(), createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
    db.exec('BEGIN')
    try {
      db.prepare('INSERT INTO records VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(result.id, collection, JSON.stringify(result))
      db.prepare('INSERT INTO audit(date,action,record_id) VALUES(?,?,?)').run(result.updatedAt, `${collection}:${previous ? 'editar' : 'crear'}`, result.id)
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return result
  }
  function restore(inputState) {
    const clean = validateState(inputState, randomUUID)
    db.exec('BEGIN')
    try {
      db.exec('DELETE FROM records')
      const insert = db.prepare('INSERT INTO records VALUES (?,?,?)')
      for (const [collection, list] of Object.entries(clean)) {
        for (const item of list) {
          insert.run(item.id, collection, JSON.stringify(item))
        }
      }
      db.prepare('INSERT INTO audit(date,action,record_id) VALUES(?,?,?)').run(new Date().toISOString(), 'restaurar_respaldo', 'todo')
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return clean
  }
  return { all, save, restore, close: () => db.close() }
}
