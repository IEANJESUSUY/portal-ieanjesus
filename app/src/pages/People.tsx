import { Camera, ChevronRight, Filter, MapPin, Plus, Search, UsersRound, X } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'

type Person = { id: number; initials: string; name: string; family: string; church: string; phone: string; role: string; status: 'Activo' | 'Seguimiento'; color: string }

const initialPeople: Person[] = [
  { id: 1, initials: 'MP', name: 'María Pereira', family: 'Familia Pereira', church: 'Maldonado', phone: '099 123 456', role: 'Miembro', status: 'Activo', color: '#d9e8d8' },
  { id: 2, initials: 'JR', name: 'Juan Rodríguez', family: 'Familia Rodríguez', church: 'Montevideo Centro', phone: '098 431 220', role: 'Pastor local', status: 'Activo', color: '#dce7ea' },
  { id: 3, initials: 'AL', name: 'Ana López', family: 'Familia López', church: 'Las Piedras', phone: '096 829 041', role: 'Secretaria', status: 'Activo', color: '#eee4ce' },
  { id: 4, initials: 'CS', name: 'Carlos Silva', family: 'Familia Silva', church: 'Pando', phone: '092 775 390', role: 'Miembro', status: 'Seguimiento', color: '#e8e1ed' },
  { id: 5, initials: 'SM', name: 'Sofía Martínez', family: 'Familia Martínez', church: 'Maldonado', phone: '091 612 844', role: 'Líder de jóvenes', status: 'Activo', color: '#dcebdd' },
]

export function People() {
  const [people, setPeople] = useState(initialPeople)
  const [query, setQuery] = useState('')
  const [church, setChurch] = useState('Todas')
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => people.filter(person => (church === 'Todas' || person.church === church) && `${person.name} ${person.family} ${person.phone}`.toLowerCase().includes(query.toLowerCase())), [people, query, church])

  function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name'))
    const initials = name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()
    setPeople(current => [{ id: Date.now(), initials, name, family: String(data.get('family')), church: String(data.get('church')), phone: String(data.get('phone')), role: 'Miembro', status: 'Activo', color: '#d9e8d8' }, ...current])
    setOpen(false)
  }

  return <main className="people-page">
    <div className="page-title-row"><div><span className="eyebrow">Directorio nacional</span><h2>Personas y familias</h2><p>Contactos, vínculos familiares y participación en cada congregación.</p></div><button className="primary-action" onClick={() => setOpen(true)}><Plus size={18}/> Nueva persona</button></div>
    <div className="demo-note"><span>Vista de desarrollo</span> Los datos que ves son demostrativos y todavía no se guardan en la base nacional.</div>

    <section className="directory-summary">
      <div><UsersRound size={20}/><span><strong>{people.length}</strong> personas visibles</span></div>
      <div><MapPin size={20}/><span><strong>11</strong> congregaciones</span></div>
      <div><span className="family-symbol">⌂</span><span><strong>412</strong> familias registradas</span></div>
    </section>

    <section className="panel directory-panel">
      <div className="directory-toolbar">
        <label className="directory-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, familia o teléfono"/></label>
        <label className="filter-select"><Filter size={16}/><select value={church} onChange={event => setChurch(event.target.value)}><option>Todas</option><option>Maldonado</option><option>Montevideo Centro</option><option>Las Piedras</option><option>Pando</option></select></label>
      </div>
      <div className="people-table" role="table" aria-label="Personas registradas">
        <div className="people-head" role="row"><span>Persona</span><span>Congregación</span><span>Contacto</span><span>Estado</span><span/></div>
        {filtered.map(person => <div className="person-row" role="row" key={person.id}>
          <div className="person-main"><div className="person-avatar" style={{ background: person.color }}>{person.initials}</div><div><strong>{person.name}</strong><span>{person.family} · {person.role}</span></div></div>
          <span className="church-name">{person.church}</span><span className="phone">{person.phone}</span><span className={`person-status ${person.status === 'Seguimiento' ? 'attention' : ''}`}>{person.status}</span><button className="row-arrow" aria-label={`Abrir ficha de ${person.name}`}><ChevronRight size={18}/></button>
        </div>)}
        {!filtered.length && <div className="empty-state">No encontramos personas con esos filtros.</div>}
      </div>
    </section>

    {open && <div className="modal-backdrop" role="presentation"><section className="person-modal" role="dialog" aria-modal="true" aria-labelledby="new-person-title"><div className="modal-heading"><div><span className="eyebrow">Nueva ficha</span><h2 id="new-person-title">Agregar persona</h2></div><button onClick={() => setOpen(false)} aria-label="Cerrar"><X size={20}/></button></div><form onSubmit={addPerson}><button type="button" className="photo-upload"><Camera size={22}/><span>Agregar foto</span></button><label>Nombre completo<input name="name" required placeholder="Ej. Laura González"/></label><label>Familia<input name="family" required placeholder="Ej. Familia González"/></label><label>Teléfono<input name="phone" required placeholder="09X XXX XXX"/></label><label>Congregación<select name="church"><option>Maldonado</option><option>Montevideo Centro</option><option>Las Piedras</option><option>Pando</option></select></label><div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-action" type="submit">Agregar a la lista</button></div></form></section></div>}
  </main>
}
