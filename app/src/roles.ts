// Qué puede ver y hacer cada cuenta de una congregación.
//   Pastor: todo su iglesia.
//   Secretaría: personas, cultos y listas, informes, pedidos de comités; en Dinero anota ingresos y
//               gastos y ve los totales, pero no anota diezmos ni ve su monto.
//   Tesorería: Dinero completo (diezmos, comprobantes, cuentas) y los informes para ver.
// La Administración Nacional y los comités no tienen estas restricciones.
// Las mismas reglas están en la base central (supabase/schema.sql), no solo en la pantalla.
import { normalizeText } from './utils'

export type Role = 'full' | 'secretaria' | 'tesoreria'
export const ROLE_LABEL: Record<Role, string> = { full: 'Pastor', secretaria: 'Secretaría', tesoreria: 'Tesorería' }

export function roleOf(workspace?: { type?: string; role?: string } | null): Role {
  if (!workspace || !['church', 'preaching_place'].includes(workspace.type || '')) return 'full'
  const role = normalizeText(workspace.role)
  if (role.includes('tesor')) return 'tesoreria'
  if (role.includes('secret')) return 'secretaria'
  return 'full'
}

const TESORERIA_PATHS = ['/', '/finanzas', '/informes', '/configuracion']

export const canSeePath = (role: Role, path: string) => role !== 'tesoreria' || TESORERIA_PATHS.includes(path)

type Action = 'tithe' | 'moneyDetail' | 'people' | 'attendance' | 'editReports' | 'requests' | 'manageAccounts' | 'messages'
const RULES: Record<Action, Role[]> = {
  tithe: ['full', 'tesoreria'],
  moneyDetail: ['full', 'tesoreria'],
  people: ['full', 'secretaria'],
  attendance: ['full', 'secretaria'],
  editReports: ['full', 'secretaria'],
  requests: ['full', 'secretaria'],
  manageAccounts: ['full'],
  messages: ['full', 'secretaria']
}
export const can = (role: Role, action: Action) => RULES[action].includes(role)

// El rol del espacio activo, para los componentes que no lo reciben por props.
// App lo fija antes de dibujar el resto: al cambiar de espacio se vuelve a dibujar todo.
let current: Role = 'full'
export function setActiveRole(role: Role) {
  current = role
}
export const activeRole = () => current
export const useActiveRole = () => current
