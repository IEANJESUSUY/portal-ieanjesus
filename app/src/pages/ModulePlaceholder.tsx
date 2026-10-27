import { ArrowLeft, Hammer } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return <main className="module-page"><div className="module-card"><div className="module-icon"><Hammer size={26}/></div><span className="eyebrow">Módulo oficial</span><h2>{title}</h2><p>{description}</p><Link to="/" className="back-link"><ArrowLeft size={16}/> Volver al panel</Link></div></main>
}
