import { Building2, CircleDollarSign, ClipboardCheck, UsersRound } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../components/MetricCard'
import { attendanceTrend, congregationAttendance, pendingItems, recentActivity } from '../data/dashboard'

export function Dashboard() {
  const total = congregationAttendance.reduce((sum, item) => sum + item.value, 0)
  return <main className="dashboard">
    <section className="metrics-grid" aria-label="Indicadores principales">
      <MetricCard icon={Building2} label="Iglesias activas" value="11" change="100%" detail="reportaron este mes" accent="green"/>
      <MetricCard icon={UsersRound} label="Personas registradas" value="1.284" change="+4,8%" detail="frente al mes anterior" accent="blue"/>
      <MetricCard icon={ClipboardCheck} label="Asistencia del mes" value="558" change="+24" detail="personas en promedio" accent="lilac"/>
      <MetricCard icon={CircleDollarSign} label="Ofrendas registradas" value="$ 203.400" change="+4,5%" detail="frente a setiembre" accent="gold"/>
    </section>

    <section className="analytics-grid">
      <article className="panel trend-panel">
        <div className="panel-heading"><div><h2>Asistencia nacional</h2><p>Promedio mensual de todos los cultos</p></div><select aria-label="Período" defaultValue="6"><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceTrend} margin={{ top: 12, right: 2, left: -22 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e9e2"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#7c827d', fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#7c827d', fontSize: 12 }}/><Tooltip cursor={{ fill: '#f1f3ed' }} contentStyle={{ border: 0, borderRadius: 12 }}/><Bar dataKey="attendance" name="Asistencia" fill="#91ad95" radius={[8, 8, 3, 3]} maxBarSize={46}/></BarChart></ResponsiveContainer></div>
      </article>

      <article className="panel distribution-panel">
        <div className="panel-heading"><div><h2>Distribución</h2><p>Asistencia por congregación</p></div></div>
        <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={congregationAttendance} dataKey="value" innerRadius={64} outerRadius={91} paddingAngle={2} stroke="none">{congregationAttendance.map(entry => <Cell key={entry.name} fill={entry.color}/>)}</Pie><Tooltip contentStyle={{ border: 0, borderRadius: 12 }}/></PieChart></ResponsiveContainer><div className="donut-label"><strong>{total}</strong><span>asistencias</span></div></div>
        <div className="legend">{congregationAttendance.map(item => <div key={item.name}><i style={{ background: item.color }}/><span>{item.name}</span><strong>{item.value}</strong></div>)}</div>
      </article>
    </section>

    <section className="lower-grid">
      <article className="panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Últimos movimientos registrados</p></div><button className="text-button">Ver todo</button></div><div className="activity-list">{recentActivity.map(item => <div className="activity-row" key={item.title}><div className={`activity-dot ${item.tone}`}/><div><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>)}</div></article>
      <article className="panel"><div className="panel-heading"><div><h2>Pendientes</h2><p>Informes que requieren atención</p></div><button className="text-button">Gestionar</button></div><div className="pending-list">{pendingItems.map(item => <div className="pending-row" key={item.church}><div className="church-initial">{item.church[0]}</div><div><strong>{item.church}</strong><span>{item.item}</span></div><span className={`status ${item.status === 'Revisar' ? 'review' : ''}`}>{item.status}</span></div>)}</div></article>
    </section>
  </main>
}
