import { FormEvent, useEffect, useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { NATIONAL_COMMITTEES } from '../../shared/catalog.mjs'
import { assignMember, listMembers, removeMember, type Member } from '../cloud'
import type { State } from '../utils'

const ROLES = ['Pastor', 'Secretaría', 'Tesorería', 'Líder', 'Presidente del comité', 'Administración Nacional']

// Configuración → Usuarios: quién entra al Portal y a qué espacio (solo con base central).
export function UsersAdmin({ state }: { state: State }) {
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ email: '', space: '', role: 'Pastor', displayName: '' })
  const churches = (state.churches || []).filter(c => c.isPreachingPlace !== 'Sí')
  const spaceLabel = (m: Member) =>
    m.space_type === 'national_admin' ? 'Administración Nacional'
      : m.space_type === 'national_committee' ? `Comité de ${NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === m.committee_key)?.name || m.committee_key}`
      : state.churches.find(c => c.id === m.church_id)?.name || 'Congregación'

  const refresh = () => listMembers().then(setMembers).catch(e => setError((e as Error).message))
  useEffect(() => { void refresh() }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setDone('')
    const [type, id] = form.space.split(':')
    try {
      await assignMember({
        email: form.email,
        spaceType: type,
        churchId: type === 'church' ? id : '',
        committeeKey: type === 'national_committee' ? id : '',
        role: form.role,
        displayName: form.displayName
      })
      setDone(`Listo: ${form.email} ya puede entrar.`)
      setForm({ email: '', space: '', role: 'Pastor', displayName: '' })
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="restore-box users-admin">
      <h3>Usuarios y permisos</h3>
      <p>Cada persona crea su usuario en la pantalla de entrada («Es mi primera vez»). Después, acá le asignás su espacio.</p>
      <form className="users-admin-form" onSubmit={submit}>
        <label><span>Correo de la persona</span><input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
        <label><span>Nombre (como se va a ver)</span><input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Ej. Pastor Juan Pérez" /></label>
        <label>
          <span>Espacio</span>
          <select required value={form.space} onChange={e => setForm(f => ({ ...f, space: e.target.value }))}>
            <option value="">Elegir…</option>
            <optgroup label="Congregaciones">
              {churches.map(c => <option key={c.id} value={`church:${c.id}`}>{c.name}</option>)}
            </optgroup>
            <optgroup label="Comités nacionales">
              {NATIONAL_COMMITTEES.map((c: { key: string; name: string }) => <option key={c.key} value={`national_committee:${c.key}`}>Comité de {c.name}</option>)}
            </optgroup>
            <option value="national_admin:">Administración Nacional (ve todo)</option>
          </select>
        </label>
        <label>
          <span>Rol</span>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
        <button type="submit" className="primary-action" disabled={busy}><UserPlus size={17} /> {busy ? 'Guardando…' : 'Dar acceso'}</button>
      </form>
      {error && <p role="alert" className="crm-error">{error}</p>}
      {done && <p role="status" className="crm-success">{done}</p>}
      <ul className="users-admin-list">
        {members.map(m => (
          <li key={m.id}>
            <div>
              <strong>{m.display_name || m.email}</strong>
              <small>{m.email} · {spaceLabel(m)} · {m.role}</small>
            </div>
            <button
              type="button"
              className="secondary-action compact-btn"
              aria-label={`Quitar el acceso de ${m.email} a ${spaceLabel(m)}`}
              onClick={async () => {
                if (!window.confirm(`¿Quitar el acceso de ${m.email} a ${spaceLabel(m)}?`)) return
                try { await removeMember(m.id); await refresh() } catch (err) { setError((err as Error).message) }
              }}
            >
              <Trash2 size={15} /> Quitar
            </button>
          </li>
        ))}
        {!members.length && !error && <li className="users-admin-empty">Todavía no hay usuarios con acceso.</li>}
      </ul>
    </div>
  )
}
