import { FormEvent, useEffect, useState } from 'react'
import { ArrowRightLeft, KeyRound, MessageCircle, Trash2, UserPlus } from 'lucide-react'
import { NATIONAL_COMMITTEES } from '../../shared/catalog.mjs'
import { ACCOUNT_DOMAIN, assignMember, createAccount, listMembers, loginName, moveMember, removeMember, setMemberPassword, type Member } from '../cloud'
import { normalizeText, type State } from '../utils'

const slug = (text: string) => normalizeText(text).replace(/congregacion|iglesia|lugar de predicacion/g, '').trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')

// Contraseña fácil de dictar o escribir: dos palabras y cuatro números (ej. gozo-roca-4821).
function suggestPassword() {
  const words = ['luz', 'paz', 'gozo', 'roca', 'vid', 'pan', 'sal', 'fe', 'cielo', 'monte', 'rio', 'olivo']
  const n = crypto.getRandomValues(new Uint32Array(3))
  return `${words[n[0] % words.length]}-${words[n[1] % words.length]}-${String(1000 + (n[2] % 9000))}`
}

const shareText = (user: string, password: string, space: string) =>
  `Portal IEANJESÚS · ${space}\nUsuario: ${user}\nContraseña: ${password}\nEntrá desde ${location.origin}${location.pathname} y, si querés, cambiá la contraseña en Configuración.`

// Configuración → Usuarios y permisos (con base central).
// Nacional administra todas las cuentas; el pastor, las de Secretaría y Tesorería de su iglesia.
export function UsersAdmin({ state, churchId }: { state: State; churchId?: string }) {
  const isNational = !churchId
  const churches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí' && (!churchId || c.id === churchId))
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [created, setCreated] = useState<{ user: string; password: string; space: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [account, setAccount] = useState({ space: churchId ? `church:${churchId}` : '', role: 'Secretaría', username: '', password: suggestPassword(), displayName: '' })
  const [byEmail, setByEmail] = useState({ email: '', space: '', role: 'Pastor', displayName: '' })

  const committeeName = (key?: string | null) => NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === key)?.name || key || ''
  const spaceLabel = (m: Member) =>
    m.space_type === 'national_admin' ? 'Administración Nacional'
      : m.space_type === 'national_committee' ? `Comité de ${committeeName(m.committee_key)}`
      : state.churches.find(c => c.id === m.church_id)?.name || 'Congregación'
  const isAccount = (m: Member) => m.email.endsWith(`@${ACCOUNT_DOMAIN}`)

  const refresh = () => listMembers().then(setMembers).catch(e => setError((e as Error).message))
  useEffect(() => { void refresh() }, [])

  // Sugiere el usuario según el espacio y el rol: secretaria.maldonado, tesoreria.salto, comite.jovenes.
  useEffect(() => {
    const [type, id] = account.space.split(':')
    if (!type) return
    const church = state.churches.find(c => c.id === id)
    const suggestion = type === 'national_committee' ? `comite.${id}` : `${account.role === 'Tesorería' ? 'tesoreria' : 'secretaria'}.${slug(church?.city || church?.name || id)}`
    setAccount(a => ({ ...a, username: suggestion }))
  }, [account.space, account.role])

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError('')
    setDone('')
    try {
      await action()
      setDone(success)
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submitAccount(e: FormEvent) {
    e.preventDefault()
    const [type, id] = account.space.split(':')
    const committee = type === 'national_committee'
    const space = committee ? `Comité de ${committeeName(id)}` : state.churches.find(c => c.id === id)?.name || ''
    await run(async () => {
      await createAccount({
        username: account.username,
        password: account.password,
        spaceType: type,
        churchId: committee ? '' : id,
        committeeKey: committee ? id : '',
        role: committee ? 'Comité' : account.role,
        displayName: account.displayName || `${committee ? 'Comité' : account.role} · ${space}`
      })
      setCreated({ user: account.username, password: account.password, space })
      setAccount(a => ({ ...a, password: suggestPassword(), displayName: '' }))
    }, `Cuenta creada: ${account.username}`)
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault()
    const [type, id] = byEmail.space.split(':')
    await run(() => assignMember({
      email: byEmail.email,
      spaceType: type,
      churchId: type === 'church' ? id : '',
      committeeKey: '',
      role: byEmail.role,
      displayName: byEmail.displayName
    }), `Listo: ${byEmail.email} ya puede entrar.`)
    setByEmail({ email: '', space: '', role: 'Pastor', displayName: '' })
  }

  return (
    <div className="restore-box users-admin">
      <h3>Usuarios y permisos</h3>
      <p>
        {isNational
          ? 'Pastores y Nacional entran con su correo. Secretaría, Tesorería y cada comité tienen una cuenta con usuario y contraseña, que no depende de una persona.'
          : 'Acá creás las cuentas de Secretaría y Tesorería de tu iglesia y les cambiás la contraseña cuando haga falta.'}
      </p>

      <h4>Cuenta con usuario (Secretaría, Tesorería{isNational ? ' o comité' : ''})</h4>
      <form className="users-admin-form" onSubmit={submitAccount}>
        <label>
          <span>Espacio</span>
          <select required value={account.space} disabled={!isNational} onChange={e => setAccount(a => ({ ...a, space: e.target.value }))}>
            <option value="">Elegir…</option>
            <optgroup label="Congregaciones">
              {churches.map(c => <option key={c.id} value={`church:${c.id}`}>{c.name}</option>)}
            </optgroup>
            {isNational && (
              <optgroup label="Comités nacionales">
                {NATIONAL_COMMITTEES.map((c: { key: string; name: string }) => <option key={c.key} value={`national_committee:${c.key}`}>Comité de {c.name}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        {!account.space.startsWith('national_committee') && (
          <label>
            <span>Rol</span>
            <select value={account.role} onChange={e => setAccount(a => ({ ...a, role: e.target.value }))}>
              <option>Secretaría</option>
              <option>Tesorería</option>
            </select>
          </label>
        )}
        <label><span>Usuario</span><input required value={account.username} onChange={e => setAccount(a => ({ ...a, username: e.target.value }))} /></label>
        <label><span>Contraseña</span><input required minLength={8} value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} /></label>
        <button type="submit" className="primary-action" disabled={busy || !account.space}><UserPlus size={17} /> Crear cuenta</button>
      </form>
      {created && (
        <div className="users-admin-created" role="status">
          <strong>Cuenta lista: {created.space}</strong>
          <span>Usuario: <b>{created.user}</b> · Contraseña: <b>{created.password}</b></span>
          <a className="secondary-action whatsapp-action" href={`https://wa.me/?text=${encodeURIComponent(shareText(created.user, created.password, created.space))}`} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> Enviar los datos por WhatsApp
          </a>
        </div>
      )}

      {isNational && (
        <>
          <h4>Acceso con correo (pastores y Administración Nacional)</h4>
          <p className="section-help">La persona primero crea su usuario en la pantalla de entrada («Es mi primera vez»).</p>
          <form className="users-admin-form" onSubmit={submitEmail}>
            <label><span>Correo</span><input type="email" required value={byEmail.email} onChange={e => setByEmail(f => ({ ...f, email: e.target.value }))} /></label>
            <label><span>Nombre (como se va a ver)</span><input value={byEmail.displayName} onChange={e => setByEmail(f => ({ ...f, displayName: e.target.value }))} placeholder="Ej. Pastor Franklin Salas" /></label>
            <label>
              <span>Espacio</span>
              <select required value={byEmail.space} onChange={e => setByEmail(f => ({ ...f, space: e.target.value }))}>
                <option value="">Elegir…</option>
                <optgroup label="Congregaciones">
                  {churches.map(c => <option key={c.id} value={`church:${c.id}`}>{c.name}</option>)}
                </optgroup>
                <option value="national_admin:">Administración Nacional (ve todo)</option>
              </select>
            </label>
            <label>
              <span>Rol</span>
              <select value={byEmail.role} onChange={e => setByEmail(f => ({ ...f, role: e.target.value }))}>
                <option>Pastor</option>
                <option>Esposa del pastor</option>
                <option>Administración Nacional</option>
              </select>
            </label>
            <button type="submit" className="primary-action" disabled={busy}><UserPlus size={17} /> Dar acceso</button>
          </form>
        </>
      )}

      {error && <p role="alert" className="crm-error">{error}</p>}
      {done && <p role="status" className="crm-success">{done}</p>}

      <h4>Quién entra hoy</h4>
      <ul className="users-admin-list">
        {members.map(m => (
          <li key={m.id}>
            <div>
              <strong>{m.display_name || loginName(m.email)}</strong>
              <small>{loginName(m.email)} · {spaceLabel(m)} · {m.role}</small>
            </div>
            <div className="users-admin-actions">
              {(isNational || isAccount(m)) && (
                <button
                  type="button"
                  className="secondary-action compact-btn"
                  aria-label={`Nueva contraseña para ${loginName(m.email)}`}
                  onClick={() => {
                    const password = window.prompt(`Nueva contraseña para ${loginName(m.email)} (al menos 8 letras o números):`, suggestPassword())
                    if (password) void run(() => setMemberPassword(m.email, password), `Contraseña cambiada. Nueva: ${password}`)
                  }}
                >
                  <KeyRound size={15} /> Contraseña
                </button>
              )}
              {isNational && m.space_type === 'church' && !isAccount(m) && (
                <select
                  aria-label={`Cambiar de iglesia a ${loginName(m.email)}`}
                  value=""
                  onChange={e => {
                    const target = e.target.value
                    const name = state.churches.find(c => c.id === target)?.name
                    if (target && window.confirm(`¿Pasar a ${m.display_name || loginName(m.email)} a ${name}?`)) void run(() => moveMember(m.id, target), `Listo: ahora está en ${name}.`)
                  }}
                >
                  <option value="">Cambiar de iglesia…</option>
                  {churches.filter(c => c.id !== m.church_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <button
                type="button"
                className="secondary-action compact-btn"
                aria-label={`Quitar el acceso de ${loginName(m.email)} a ${spaceLabel(m)}`}
                onClick={() => {
                  if (window.confirm(`¿Quitar el acceso de ${loginName(m.email)} a ${spaceLabel(m)}?`)) void run(() => removeMember(m.id), 'Acceso quitado.')
                }}
              >
                <Trash2 size={15} /> Quitar
              </button>
            </div>
          </li>
        ))}
        {!members.length && !error && <li className="users-admin-empty">Todavía no hay usuarios con acceso.</li>}
      </ul>
      {isNational && <p className="section-help"><ArrowRightLeft size={14} /> Si un pastor cambia de iglesia, se lo pasa con «Cambiar de iglesia». Las cuentas de Secretaría y Tesorería quedan en su congregación.</p>}
    </div>
  )
}
