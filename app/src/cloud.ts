// Base central en Supabase (opcional). Se activa sola cuando la compilación tiene las variables
// VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY; si no, el Portal sigue guardando en este dispositivo.
// Usa la API web de Supabase directamente (sin librerías), para que funcione también en el archivo único.
// La seguridad la ponen las reglas de la base (supabase/schema.sql): cada usuario ve solo lo suyo.
import { NATIONAL_COMMITTEES } from '../shared/catalog.mjs'
import { empty, prepareRecord } from './local-data'

type Data = Record<string, Array<{ id: string; [key: string]: any }>>
type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email: string } }
export type CloudSpace = { id: string; type: string; name: string; role?: string; committeeKey?: string; parentChurchId?: string }

const URL_BASE = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
const SESSION_KEY = 'pn_cloud_session'
const PAGE = 1000

export const cloudEnabled = () => Boolean(URL_BASE && ANON_KEY)

let cache: Data | null = null

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Sin almacenamiento la sesión dura lo que la pestaña abierta.
  }
}

export const hasCloudSession = () => Boolean(readSession())

// Error de "no hay señal": lo que se estaba guardando queda en el celular y se manda después.
export class OfflineError extends Error {
  constructor() {
    super('Sin señal: queda guardado en este celular y se envía solo cuando vuelva la conexión.')
  }
}

async function authRequest(path: string, body: unknown) {
  let response: Response
  try {
    response = await fetch(`${URL_BASE}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {
    throw new OfflineError()
  }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = String(result.error_description || result.msg || result.message || '')
    throw new Error(
      /invalid login|invalid_grant|credentials/i.test(message) ? 'El correo o la contraseña no coinciden.'
        : /already registered|already exists/i.test(message) ? 'Ese correo ya tiene usuario. Entrá con tu contraseña.'
        : /password should be|weak password/i.test(message) ? 'La contraseña es muy corta o fácil. Usá al menos 8 letras o números.'
        : /email not confirmed/i.test(message) ? 'Falta confirmar el correo: abrí el mensaje que te llegó y tocá el enlace.'
        : /rate limit/i.test(message) ? 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.'
        : message || 'No se pudo conectar con la base central.'
    )
  }
  return result
}

function toSession(result: any): Session {
  return {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: Date.now() + Number(result.expires_in || 3600) * 1000,
    user: { id: result.user?.id, email: result.user?.email }
  }
}

// Las cuentas de Secretaría, Tesorería y comités entran con un usuario (secretaria.maldonado) en vez de
// un correo. Por dentro se guardan como usuario@cuentas.ieanjesus.uy, una dirección que no recibe correos.
export const ACCOUNT_DOMAIN = 'cuentas.ieanjesus.uy'
export const toLoginEmail = (input: string) => {
  const value = input.trim().toLowerCase()
  return value.includes('@') ? value : `${value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]/g, '')}@${ACCOUNT_DOMAIN}`
}
export const loginName = (email: string) => (email.endsWith(`@${ACCOUNT_DOMAIN}`) ? email.split('@')[0] : email)

export async function cloudSignIn(email: string, password: string) {
  const session = toSession(await authRequest('token?grant_type=password', { email: toLoginEmail(email), password }))
  writeSession(session)
  cache = null
  return session
}

// Crea el usuario; queda sin acceso hasta que la Administración Nacional le asigne un espacio.
export async function cloudSignUp(email: string, password: string) {
  if (password.length < 8) throw new Error('La contraseña tiene que tener al menos 8 letras o números.')
  const result = await authRequest('signup', { email: toLoginEmail(email), password })
  if (result.access_token) writeSession(toSession(result))
  return Boolean(result.access_token)
}

export async function cloudSignOut() {
  const session = readSession()
  writeSession(null)
  cache = null
  if (session) {
    await fetch(`${URL_BASE}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` }
    }).catch(() => undefined)
  }
}

// Renueva el permiso de acceso antes de que venza (dura una hora).
async function token() {
  let session = readSession()
  if (!session) throw new Error('Tu sesión terminó. Volvé a entrar con tu correo y contraseña.')
  if (session.expires_at - Date.now() < 60_000) {
    try {
      session = toSession(await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token }))
      writeSession(session)
    } catch (e) {
      // Sin señal no se cierra la sesión: se renueva cuando vuelva la conexión.
      if (e instanceof OfflineError) throw e
      writeSession(null)
      throw new Error('Tu sesión terminó. Volvé a entrar con tu correo y contraseña.')
    }
  }
  return session.access_token
}

async function rest(path: string, init: RequestInit = {}) {
  const access = await token()
  let response: Response
  try {
    response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    })
  } catch {
    throw new OfflineError()
  }
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    if (response.status === 401 || response.status === 403 || /row-level security/i.test(result.message || '')) {
      throw new Error('No tenés permiso para guardar este dato en este espacio.')
    }
    throw new Error(result.message || 'No se pudo guardar en la base central.')
  }
  return response.status === 204 ? null : response.json().catch(() => null)
}

async function allRows(filter = '') {
  const rows: Array<{ id: string; collection: string; body: any }> = []
  for (let offset = 0; ; offset += PAGE) {
    const page = await rest(`records?select=id,collection,body${filter}&order=id&offset=${offset}&limit=${PAGE}`)
    rows.push(...(page || []))
    if (!page || page.length < PAGE) return rows
  }
}

// --- Fotos: van al almacenamiento de archivos (bucket "fotos"), no adentro de la base ---------
// En la base queda "storage:<congregación>/<comité>/<archivo>.webp". Al cargar, cada referencia se
// cambia por un enlace temporal firmado (7 días) que solo funciona para quien tiene permiso.
const BUCKET = 'fotos'
const MARK = 'storage:'
const SIGN_SECONDS = 7 * 24 * 3600
const uploadedPaths = new Map<string, string>() // foto (data:image…) → ruta ya subida
const displayUrls = new Map<string, string>() // ruta → enlace o imagen para mostrar
const signedPattern = new RegExp(`/storage/v1/object/sign/${BUCKET}/([^?]+)\\?`)

// Recorre un registro (y sus listas de fotos) cambiando cada texto con `change`.
async function mapStrings(value: any, change: (text: string) => Promise<string> | string): Promise<any> {
  if (typeof value === 'string') return change(value)
  if (Array.isArray(value)) return Promise.all(value.map(item => mapStrings(item, change)))
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await mapStrings(item, change)]))
    return Object.fromEntries(entries)
  }
  return value
}

// Un enlace firmado que vino de la base vuelve a ser su referencia antes de validar y guardar.
const toReference = (text: string) => {
  const match = text.startsWith(URL_BASE) ? text.match(signedPattern) : null
  return match ? `${MARK}${decodeURIComponent(match[1])}` : text
}

async function uploadPhoto(dataUrl: string, folder: string) {
  const known = uploadedPaths.get(dataUrl)
  if (known) return known
  const blob = await (await fetch(dataUrl)).blob()
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const access = await token()
  let response: Response
  try {
    response = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${access}`, 'Content-Type': blob.type, 'cache-control': 'max-age=31536000', 'x-upsert': 'false' },
      body: blob
    })
  } catch {
    throw new OfflineError()
  }
  if (!response.ok) throw new Error('No se pudo subir la foto. Probá de nuevo con buena señal.')
  uploadedPaths.set(dataUrl, path)
  displayUrls.set(path, dataUrl)
  return path
}

const folderFor = (row: { church_id: string | null; committee_key: string | null }) =>
  `${row.church_id || 'nacional'}/${row.committee_key || '_'}`.replace(/[^A-Za-z0-9_\-/]/g, '_')

// Sube las fotos nuevas de un registro y deja solo sus referencias.
const storePhotos = (body: any, folder: string) =>
  mapStrings(body, async text => (text.startsWith('data:image/') ? MARK + (await uploadPhoto(text, folder)) : text))

// Versión para mostrar: cada referencia se cambia por su enlace (o por la foto recién subida).
const showPhotos = (body: any) =>
  mapStrings(body, text => (text.startsWith(MARK) ? displayUrls.get(text.slice(MARK.length)) || '' : text))

async function signPhotos(rows: Array<{ body: any }>) {
  const paths = new Set<string>()
  await Promise.all(rows.map(row => mapStrings(row.body, text => {
    if (text.startsWith(MARK) && !displayUrls.has(text.slice(MARK.length))) paths.add(text.slice(MARK.length))
    return text
  })))
  const list = [...paths]
  for (let i = 0; i < list.length; i += 500) {
    const signed = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: SIGN_SECONDS, paths: list.slice(i, i + 500) })
    }).then(r => (r.ok ? r.json() : [])).catch(() => [])
    for (const item of signed || []) {
      if (item?.signedURL && item.path) displayUrls.set(item.path, `${URL_BASE}/storage/v1${item.signedURL}`)
    }
  }
}

// Columnas que usan las reglas de acceso: a qué congregación y a qué comité pertenece cada registro.
function columnsFor(collection: string, record: any, state: Data) {
  const activity = (state.nationalActivities || []).find(a => a.id === record.activityId)
  // La asistencia de un evento de comité queda visible para ese comité.
  const event = collection === 'attendance' ? (state.events || []).find(e => e.id === record.eventId) : undefined
  return {
    id: record.id,
    collection,
    church_id: collection === 'churches' ? record.id : record.churchId || null,
    committee_key: record.committeeKey || activity?.committeeKey || event?.committeeKey || null,
    body: record,
    updated_at: record.updatedAt || new Date().toISOString()
  }
}

async function upsert(rows: any[]) {
  for (let i = 0; i < rows.length; i += 500) {
    await rest('records?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500))
    })
  }
}

// --- Sin señal: cambios pendientes y última copia de los datos -------------------------------------
// Lo que se guarda sin internet queda en el celular (IndexedDB) y se envía solo, en el mismo orden,
// cuando vuelve la conexión. La última copia de los datos permite abrir el Portal sin señal.
// La fila (con su congregación y comité) se calcula al guardar, con los datos de ese momento.
type Pending = { collection: string; record: any; row: ReturnType<typeof columnsFor>; at: string }
type OutboxSnapshot = { pending: number; sending: boolean; offline: boolean; failed: string }
let outbox: OutboxSnapshot = { pending: 0, sending: false, offline: false, failed: '' }
const outboxListeners = new Set<() => void>()
const setOutbox = (change: Partial<OutboxSnapshot>) => {
  outbox = { ...outbox, ...change }
  outboxListeners.forEach(fn => fn())
}
export const subscribeOutbox = (fn: () => void) => { outboxListeners.add(fn); return () => { outboxListeners.delete(fn) } }
export const outboxState = () => outbox

function kv<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('portal-nube', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('kv')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode)
      const request = run(tx.objectStore('kv'))
      tx.oncomplete = () => { open.result.close(); resolve(request ? (request.result as T) : (undefined as T)) }
      tx.onerror = () => { open.result.close(); reject(tx.error) }
    }
  })
}
const userKey = (name: string) => `${name}:${readSession()?.user.id || 'anon'}`
const readPending = async () => (await kv<Pending[] | undefined>('readonly', s => s.get(userKey('outbox')))) || []
const writePending = (list: Pending[]) => kv<void>('readwrite', s => { s.put(list, userKey('outbox')) })

async function sendRecord(row: ReturnType<typeof columnsFor>) {
  const stored = { ...row, body: await storePhotos(row.body, folderFor(row)) }
  await upsert([stored])
  return stored
}

let flushing: Promise<void> | null = null
// Manda los cambios pendientes. Si sigue sin señal, quedan para la próxima.
export function flushOutbox(): Promise<void> {
  if (!cloudEnabled() || !readSession()) return Promise.resolve()
  flushing ||= (async () => {
    let list = await readPending()
    setOutbox({ pending: list.length })
    if (!list.length) return
    setOutbox({ sending: true })
    try {
      while (list.length) {
        const [next, ...rest] = list
        try {
          await sendRecord(next.row)
        } catch (e) {
          if (e instanceof OfflineError) { setOutbox({ offline: true }); break }
          // Un cambio que la base rechaza (por ejemplo, por permisos) no frena a los demás.
          setOutbox({ failed: `No se pudo enviar un cambio guardado sin señal: ${(e as Error).message}` })
        }
        list = rest
        await writePending(list)
        setOutbox({ pending: list.length, offline: false })
      }
    } finally {
      setOutbox({ sending: false })
    }
  })().finally(() => { flushing = null })
  return flushing
}

if (typeof window !== 'undefined' && cloudEnabled()) {
  window.addEventListener('online', () => { setOutbox({ offline: false }); void flushOutbox() })
  window.addEventListener('offline', () => setOutbox({ offline: true }))
  window.setInterval(() => { if (outbox.pending) void flushOutbox() }, 30_000)
}

// Aplica sobre los datos lo que todavía no llegó a la base, para que se vea igual que si hubiera señal.
async function withPending(state: Data) {
  for (const item of await readPending()) {
    if (!state[item.collection]) continue
    state[item.collection] = [...state[item.collection].filter(r => r.id !== item.record.id), await showPhotos(item.record)]
  }
  return state
}

export async function cloudApi(path: string, body?: any): Promise<any> {
  if (path === 'state') {
    let state = empty()
    try {
      await flushOutbox()
      const rows = await allRows()
      await signPhotos(rows)
      for (const row of rows) {
        if (state[row.collection]) state[row.collection].push({ ...(await showPhotos(row.body)), id: row.id })
      }
      setOutbox({ offline: false })
      void kv('readwrite', s => { s.put(state, userKey('state')) }).catch(() => undefined)
    } catch (e) {
      if (!(e instanceof OfflineError)) throw e
      // Sin señal: se abre con la última copia guardada en este celular.
      const saved = await kv<Data | undefined>('readonly', s => s.get(userKey('state'))).catch(() => undefined)
      if (!saved) throw new Error('Sin señal y todavía no hay datos guardados en este celular. Conectate a internet una vez para empezar.')
      state = { ...empty(), ...saved }
      setOutbox({ offline: true })
    }
    cache = await withPending(state)
    setOutbox({ pending: (await readPending()).length })
    return cache
  }
  const state = cache || (await cloudApi('state'))
  if (path === 'restore') {
    // Sube un respaldo (por ejemplo, lo cargado en este dispositivo) sin borrar lo que ya está en la base.
    // Las fotos que traiga adentro se pasan al almacenamiento.
    const rows = []
    for (const [collection, list] of Object.entries(body || {})) {
      if (!Array.isArray(list) || !state[collection]) continue
      for (const record of list) {
        const row = columnsFor(collection, await mapStrings(record, toReference), body)
        rows.push({ ...row, body: await storePhotos(row.body, folderFor(row)) })
      }
    }
    await upsert(rows)
    return cloudApi('state')
  }
  const collection = path.split('/').pop()!
  const record = prepareRecord(state, collection, await mapStrings(body, toReference))
  const row = columnsFor(collection, record, state)
  let shown: any
  // Si ya hay cambios esperando, este va detrás de ellos para respetar el orden.
  const queued = (await readPending()).length > 0
  try {
    if (queued) throw new OfflineError()
    const stored = await sendRecord(row)
    shown = { ...(await showPhotos(stored.body)), id: record.id }
  } catch (e) {
    if (!(e instanceof OfflineError)) throw e
    const list = [...(await readPending()), { collection, record, row, at: new Date().toISOString() }]
    await writePending(list)
    setOutbox({ pending: list.length, offline: !queued || outbox.offline })
    shown = { ...(await showPhotos(record)), id: record.id }
    if (queued) void flushOutbox()
  }
  state[collection] = [...state[collection].filter((r: { id: string }) => r.id !== record.id), shown]
  return shown
}

// --- Usuarios y permisos (solo Administración Nacional; lo controla la base con is_national_admin) ---
export type Member = { id: string; email: string; space_type: string; church_id: string | null; committee_key: string | null; role: string; display_name: string | null }

export const listMembers = async (): Promise<Member[]> => (await rest('rpc/list_memberships', { method: 'POST', body: '{}' })) || []

export async function assignMember(input: { email: string; spaceType: string; churchId?: string; committeeKey?: string; role: string; displayName?: string }) {
  await rest('rpc/assign_membership', {
    method: 'POST',
    body: JSON.stringify({
      p_email: input.email,
      p_space_type: input.spaceType,
      p_church_id: input.churchId || '',
      p_committee_key: input.committeeKey || '',
      p_role: input.role,
      p_display_name: input.displayName || ''
    })
  })
}

export const removeMember = (id: string) => rest('rpc/remove_membership', { method: 'POST', body: JSON.stringify({ p_id: id }) })

// Crea una cuenta con usuario y contraseña (Secretaría, Tesorería o un comité) y le da su espacio.
// Se registra sin guardar su sesión: quien la crea sigue adentro con su propia cuenta.
export async function createAccount(input: { username: string; password: string; spaceType: string; churchId?: string; committeeKey?: string; role: string; displayName?: string }) {
  if (input.password.length < 8) throw new Error('La contraseña tiene que tener al menos 8 letras o números.')
  const email = toLoginEmail(input.username)
  try {
    await authRequest('signup', { email, password: input.password })
  } catch (e) {
    // Si el usuario ya existía (por ejemplo, la secretaría anterior), se le cambia la contraseña y se reasigna.
    if (!/ya tiene usuario/.test((e as Error).message)) throw e
    await setMemberPassword(email, input.password)
  }
  await assignMember({ ...input, email })
  return email
}

// Nueva contraseña para una cuenta de Secretaría, Tesorería o comité (la usan Nacional y el pastor).
export const setMemberPassword = (email: string, password: string) =>
  rest('rpc/set_account_password', { method: 'POST', body: JSON.stringify({ p_email: toLoginEmail(email), p_password: password }) })

// Cambia la congregación de una persona (por ejemplo, un pastor que pasa a otra iglesia).
export const moveMember = (id: string, churchId: string) =>
  rest(`memberships?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ church_id: churchId }) })

// Cada uno puede cambiar su propia contraseña.
export async function changeOwnPassword(password: string) {
  if (password.length < 8) throw new Error('La contraseña tiene que tener al menos 8 letras o números.')
  const response = await fetch(`${URL_BASE}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  }).catch(() => null)
  if (!response?.ok) throw new Error('No se pudo cambiar la contraseña. Probá de nuevo con señal.')
}

// Espacios a los que puede entrar el usuario, según sus permisos en la tabla memberships.
type SpacesResult = { email: string; displayName: string; spaces: CloudSpace[] }

// Sin señal, quien ya entró en este celular sigue entrando con sus espacios guardados.
export async function cloudSpaces(): Promise<SpacesResult> {
  const key = `pn_cloud_spaces:${readSession()?.user.id || ''}`
  try {
    const result = await fetchSpaces()
    try { localStorage.setItem(key, JSON.stringify(result)) } catch { /* sin almacenamiento */ }
    return result
  } catch (e) {
    const saved = (() => { try { return localStorage.getItem(key) } catch { return null } })()
    if (e instanceof OfflineError && saved) return JSON.parse(saved)
    throw e
  }
}

async function fetchSpaces(): Promise<SpacesResult> {
  const session = readSession()
  if (!session) throw new Error('Tu sesión terminó.')
  const memberships: any[] = (await rest(`memberships?select=*&user_id=eq.${encodeURIComponent(session.user.id)}`)) || []
  if (!memberships.length) throw new Error('Tu usuario todavía no tiene un espacio asignado. Pedile a la Administración Nacional que te habilite.')
  const churches = (await allRows('&collection=eq.churches')).map(row => ({ ...row.body, id: row.id }))
  const churchName = (id: string) => churches.find(c => c.id === id)?.name || 'Congregación'
  const spaces: CloudSpace[] = []
  for (const m of memberships) {
    if (m.space_type === 'national_admin') {
      spaces.push({ id: 'national', type: 'national_admin', name: 'Administración Nacional', role: m.role })
      // La Administración Nacional también puede entrar a cada congregación para acompañarla.
      for (const c of churches) {
        spaces.push({ id: c.id, type: c.isPreachingPlace === 'Sí' ? 'preaching_place' : 'church', name: c.name, parentChurchId: c.parentChurchId, role: 'Acompañamiento nacional' })
      }
    } else if (m.space_type === 'national_committee') {
      const committee = NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === m.committee_key)
      spaces.push({ id: `committee-${m.committee_key}`, type: 'national_committee', committeeKey: m.committee_key, name: `Comité Nacional de ${committee?.name || m.committee_key}`, role: m.role })
    } else if (m.church_id) {
      const church = churches.find(c => c.id === m.church_id)
      spaces.push({ id: m.church_id, type: m.space_type, name: churchName(m.church_id), parentChurchId: church?.parentChurchId, role: m.role })
    }
  }
  const unique = spaces.filter((s, i) => spaces.findIndex(o => o.id === s.id) === i)
  return { email: session.user.email, displayName: memberships.find(m => m.display_name)?.display_name || loginName(session.user.email), spaces: unique }
}
