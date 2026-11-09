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

async function authRequest(path: string, body: unknown) {
  const response = await fetch(`${URL_BASE}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
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

export async function cloudSignIn(email: string, password: string) {
  const session = toSession(await authRequest('token?grant_type=password', { email: email.trim(), password }))
  writeSession(session)
  cache = null
  return session
}

// Crea el usuario; queda sin acceso hasta que la Administración Nacional le asigne un espacio.
export async function cloudSignUp(email: string, password: string) {
  if (password.length < 8) throw new Error('La contraseña tiene que tener al menos 8 letras o números.')
  const result = await authRequest('signup', { email: email.trim(), password })
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
    } catch {
      writeSession(null)
      throw new Error('Tu sesión terminó. Volvé a entrar con tu correo y contraseña.')
    }
  }
  return session.access_token
}

async function rest(path: string, init: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${await token()}`,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    })
  } catch {
    throw new Error('Sin conexión a internet. Revisá la conexión y volvé a intentar.')
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

export async function cloudApi(path: string, body?: any): Promise<any> {
  if (path === 'state') {
    const state = empty()
    for (const row of await allRows()) {
      if (state[row.collection]) state[row.collection].push({ ...row.body, id: row.id })
    }
    cache = state
    return state
  }
  const state = cache || (await cloudApi('state'))
  if (path === 'restore') {
    // Sube un respaldo (por ejemplo, lo cargado en este dispositivo) sin borrar lo que ya está en la base.
    const rows = Object.entries(body || {}).flatMap(([collection, list]) =>
      Array.isArray(list) && state[collection] ? list.map(record => columnsFor(collection, record, body)) : []
    )
    await upsert(rows)
    return cloudApi('state')
  }
  const collection = path.split('/').pop()!
  const record = prepareRecord(state, collection, body)
  await upsert([columnsFor(collection, record, state)])
  state[collection] = [...state[collection].filter((r: { id: string }) => r.id !== record.id), record]
  return record
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

export const removeMember = (id: string) => rest(`memberships?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })

// Espacios a los que puede entrar el usuario, según sus permisos en la tabla memberships.
export async function cloudSpaces(): Promise<{ email: string; displayName: string; spaces: CloudSpace[] }> {
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
  return { email: session.user.email, displayName: memberships.find(m => m.display_name)?.display_name || session.user.email, spaces: unique }
}
