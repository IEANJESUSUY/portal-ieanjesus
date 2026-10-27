import type { LucideIcon } from 'lucide-react'

interface Props { icon: LucideIcon; label: string; value: string; change: string; detail: string; accent: string }

export function MetricCard({ icon: Icon, label, value, change, detail, accent }: Props) {
  return <article className="metric-card">
    <div className={`metric-icon ${accent}`}><Icon size={20}/></div>
    <div className="metric-heading"><span>{label}</span><button className="more-button" aria-label={`Más opciones de ${label}`}>•••</button></div>
    <strong className="metric-value">{value}</strong>
    <div className="metric-foot"><span className="positive">{change}</span><span>{detail}</span></div>
  </article>
}
