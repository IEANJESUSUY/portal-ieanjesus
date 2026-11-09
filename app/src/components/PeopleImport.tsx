import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, X } from 'lucide-react'
import { type Row, type State, findPossibleDuplicates, label, normalizeText, parseCsv, today } from '../utils'

type Save = (collection: string, row: Row) => Promise<any>
type Status = 'nueva' | 'repetida' | 'sin-permiso' | 'incompleta'
type Candidate = { line: number; person: Row; cell: string; groupId: string; status: Status; reason: string }

const STATUS_TEXT: Record<Status, string> = {
  nueva: 'Se agrega',
  repetida: 'Ya está cargada',
  'sin-permiso': 'No autorizó',
  incompleta: 'Faltan datos'
}

// Fechas como las exporta Google: 15/03/1990, 15-3-90 o 1990-03-15.
function parseDate(value = '') {
  const text = value.trim()
  let year = '', month = '', day = ''
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text)
  if (match) [, year, month, day] = match
  else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(text))) {
    ;[, day, month, year] = match
    if (year.length === 2) year = `${Number(year) > 30 ? '19' : '20'}${year}`
  }
  if (!year || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return ''
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return iso <= today() ? iso : ''
}

function parseYear(value = '') {
  const match = /(19|20)\d{2}/.exec(value)
  return match && Number(match[0]) <= new Date().getFullYear() ? match[0] : ''
}

const isYes = (value = '') => /^s[ií]/i.test(value.trim())

// Lee las respuestas del formulario de Google y las convierte en fichas de Personas de la congregación.
function readResponses(text: string, state: State, scope: string) {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('El archivo no tiene respuestas. Descargá la hoja de respuestas como CSV.')
  const headers = rows[0].map(normalizeText)
  const pick = (test: (header: string) => boolean) => headers.findIndex(test)
  const col = {
    stamp: pick(h => h.includes('marca temporal') || h.includes('timestamp')),
    name: pick(h => h.includes('nombre') && !h.includes('apellido') && !/celula(?!r)/.test(h) && !h.includes('quien')),
    surname: pick(h => h.includes('apellido')),
    phone: pick(h => /celular|telefono|whatsapp/.test(h)),
    birthday: pick(h => h.includes('nacimiento') || h.includes('naciste')),
    gender: pick(h => /sexo|genero/.test(h)),
    baptismYear: pick(h => /\bano\b/.test(h) && h.includes('bautiz')),
    baptismDate: pick(h => h.includes('fecha') && /bautism|bautiz/.test(h)),
    baptized: pick(h => h.includes('bautizad')),
    // "celular" contiene "celula": la columna de la célula es la que no habla del teléfono.
    cell: pick(h => /celula(?!r)/.test(h)),
    neighborhood: pick(h => h.includes('barrio')),
    consent: pick(h => /acepto|autoriz|consent/.test(h))
  }
  if (col.name < 0) throw new Error('No encontré la columna "Nombre". ¿Es la hoja de respuestas del formulario?')
  const get = (values: string[], index: number) => (index >= 0 ? values[index] || '' : '').trim()
  const existing = (state.people || []).filter(p => p.churchId === scope)
  const cells = (state.groups || []).filter(g => g.kind === 'Célula' && g.churchId === scope)
  const accepted: Row[] = []
  const candidates: Candidate[] = rows.slice(1).map((values, i) => {
    const baptized = isYes(get(values, col.baptized)) ? 'Sí' : get(values, col.baptized) ? 'No' : ''
    const exact = parseDate(get(values, col.baptismDate))
    const year = parseYear(get(values, col.baptismYear))
    const genderText = normalizeText(get(values, col.gender))
    const cellText = get(values, col.cell)
    const noCell = !cellText || /^(ninguna|no|no voy|todavia no)/.test(normalizeText(cellText))
    const group = noCell ? undefined : cells.find(g => {
      const a = normalizeText(g.name), b = normalizeText(cellText)
      return a === b || a.includes(b) || b.includes(a)
    })
    const stamp = get(values, col.stamp)
    const person: Row = {
      id: '',
      churchId: scope,
      name: get(values, col.name),
      surname: get(values, col.surname),
      phone: get(values, col.phone),
      birthday: parseDate(get(values, col.birthday)),
      gender: /hombre|masculino|varon/.test(genderText) ? 'Masculino' : /mujer|femenino/.test(genderText) ? 'Femenino' : '',
      // Bautizado entra como de la iglesia; sin bautizar, como visita. El pastor lo ajusta después.
      status: baptized === 'Sí' ? 'Persona vinculada' : 'Amigo',
      baptized: baptized || (exact || year ? 'Sí' : ''),
      baptism: exact || (year ? `${year}-01-01` : ''),
      baptismPrecision: exact ? 'Exacta' : year ? 'Solo año' : '',
      neighborhood: get(values, col.neighborhood),
      dataConsent: col.consent < 0 ? '' : get(values, col.consent) && !/^no/i.test(get(values, col.consent)) ? 'Sí' : 'No',
      notes: [
        `Cargado desde el formulario de Google${stamp ? ` (${stamp})` : ''}.`,
        !noCell && !group ? `Célula: ${cellText}.` : ''
      ].filter(Boolean).join(' ')
    }
    let status: Status = 'nueva'
    let reason = ''
    if (!person.name) { status = 'incompleta'; reason = 'Sin nombre' }
    else if (person.dataConsent === 'No') { status = 'sin-permiso'; reason = 'No marcó la autorización' }
    else {
      const duplicate = findPossibleDuplicates([...existing, ...accepted], person)[0]
      if (duplicate) { status = 'repetida'; reason = `Igual a ${label(duplicate)}` }
      else accepted.push(person)
    }
    return { line: i + 2, person, cell: noCell ? '' : group?.name || cellText, groupId: group?.id || '', status, reason }
  })
  return candidates
}

export function PeopleImport({ state, scope, churchName, save, onClose }: {
  state: State
  scope: string
  churchName: string
  save: Save
  onClose: () => void
}) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [createCells, setCreateCells] = useState(true)
  const fresh = (candidates || []).filter(c => c.status === 'nueva')
  const missingCells = useMemo(
    () => [...new Set(fresh.filter(c => c.cell && !c.groupId).map(c => c.cell))],
    [candidates]
  )
  const count = (status: Status) => (candidates || []).filter(c => c.status === status).length

  async function readFile(file?: File) {
    if (!file) return
    setError('')
    try {
      setCandidates(readResponses(await file.text(), state, scope))
    } catch (e) {
      setCandidates(null)
      setError((e as Error).message)
    }
  }

  async function importAll() {
    setBusy(true)
    setError('')
    try {
      // Primero las células que falten, para poder anotar a cada persona en la suya.
      const cellIds = new Map<string, string>()
      if (createCells) {
        for (const name of missingCells) {
          const created = await save('groups', { id: '', name, kind: 'Célula', churchId: scope, members: [], notes: 'Creada al importar el formulario de Google.' })
          cellIds.set(name, created.id)
        }
      }
      const members = new Map<string, string[]>()
      let added = 0
      for (const candidate of fresh) {
        const groupId = candidate.groupId || cellIds.get(candidate.cell) || ''
        const notes = groupId ? candidate.person.notes.replace(` Célula: ${candidate.cell}.`, '') : candidate.person.notes
        const saved = await save('people', { ...candidate.person, notes })
        added++
        if (groupId && saved?.id) members.set(groupId, [...(members.get(groupId) || []), saved.id])
      }
      for (const [groupId, ids] of members) {
        const group = (state.groups || []).find(g => g.id === groupId) || { id: groupId, name: [...cellIds].find(([, id]) => id === groupId)?.[0], kind: 'Célula', churchId: scope, members: [] }
        await save('groups', { ...group, members: [...(group.members || []), ...ids.map(personId => ({ personId, role: 'Integrante' }))] })
      }
      setDone(`Listo: se agregaron ${added} ${added === 1 ? 'persona' : 'personas'} a ${churchName}.`)
    } catch (e) {
      setError(`Se cortó la importación: ${(e as Error).message}. Las personas que ya entraron quedan guardadas; podés volver a importar el mismo archivo y no se repiten.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="people-import-backdrop" role="dialog" aria-modal="true" aria-label="Importar personas del formulario">
      <section className="people-import">
        <header>
          <div>
            <span className="eyebrow">{churchName}</span>
            <h2>Importar personas del formulario</h2>
          </div>
          <button type="button" className="people-import-close" aria-label="Cerrar" onClick={onClose} disabled={busy}>
            <X size={20} />
          </button>
        </header>

        {done ? (
          <div className="people-import-done">
            <CheckCircle2 size={44} />
            <strong>{done}</strong>
            <p>Los bautizados entraron como “De la iglesia” y los demás como “Visita”. Podés cambiarlo en la ficha de cada uno.</p>
            <button type="button" className="primary-action" onClick={onClose}>Ver la lista de personas</button>
          </div>
        ) : !candidates ? (
          <>
            <ol className="people-import-steps">
              <li>En Google Forms abrí <b>Respuestas</b> y tocá <b>Ver en Hojas de cálculo</b>.</li>
              <li>En la hoja: <b>Archivo → Descargar → Valores separados por comas (.csv)</b>.</li>
              <li>Elegí ese archivo acá abajo. Antes de guardar vas a ver quiénes entran.</li>
            </ol>
            <label className="people-import-file">
              <FileUp size={24} />
              <span>Elegir el archivo de respuestas (.csv)</span>
              <input type="file" accept=".csv,text/csv" onChange={e => void readFile(e.target.files?.[0])} />
            </label>
          </>
        ) : (
          <>
            <div className="people-import-summary">
              <span className="ok">{count('nueva')} se agregan</span>
              {count('repetida') > 0 && <span>{count('repetida')} ya estaban</span>}
              {count('sin-permiso') > 0 && <span className="warn">{count('sin-permiso')} no autorizaron</span>}
              {count('incompleta') > 0 && <span className="warn">{count('incompleta')} con datos faltantes</span>}
            </div>
            <ul className="people-import-list">
              {candidates.map(c => (
                <li key={c.line} className={c.status}>
                  <div>
                    <strong>{label(c.person) === '—' ? `Fila ${c.line}` : label(c.person)}</strong>
                    <small>
                      {c.person.status === 'Persona vinculada' ? 'De la iglesia' : 'Visita'}
                      {c.person.baptized === 'Sí' ? ` · Bautizado/a${c.person.baptism ? ` (${c.person.baptismPrecision === 'Solo año' ? c.person.baptism.slice(0, 4) : c.person.baptism.split('-').reverse().join('/')})` : ''}` : ''}
                      {c.cell ? ` · ${/^c[eé]lula/i.test(c.cell) ? c.cell : `Célula ${c.cell}`}` : ''}
                      {c.reason ? ` · ${c.reason}` : ''}
                    </small>
                  </div>
                  <span className="people-import-tag">{STATUS_TEXT[c.status]}</span>
                </li>
              ))}
            </ul>
            {missingCells.length > 0 && (
              <label className="people-import-check">
                <input type="checkbox" checked={createCells} onChange={e => setCreateCells(e.target.checked)} />
                <span>Crear en el Portal las células que todavía no están: <b>{missingCells.join(', ')}</b></span>
              </label>
            )}
            <div className="people-import-actions">
              <button type="button" className="secondary-action" disabled={busy} onClick={() => setCandidates(null)}>Elegir otro archivo</button>
              <button type="button" className="primary-action" disabled={busy || !fresh.length} onClick={() => void importAll()}>
                {busy ? 'Guardando…' : `Agregar ${fresh.length} ${fresh.length === 1 ? 'persona' : 'personas'}`}
              </button>
            </div>
          </>
        )}
        {error && <p className="people-import-error" role="alert"><AlertTriangle size={18} /> {error}</p>}
      </section>
    </div>
  )
}
