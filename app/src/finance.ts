// Rubros de dinero de una congregación. Los gastos fijos (servicios) se controlan mes a mes.
import { normalizeText, type Row } from './utils'

export type MoneyItem = { label: string; category: string; fixed?: boolean; hint?: string; match?: RegExp; custom?: boolean }

export const EXPENSE_ITEMS: MoneyItem[] = [
  { label: 'Luz', category: 'Gasto', fixed: true, hint: 'UTE', match: /\b(luz|ute|electric)/ },
  { label: 'Agua', category: 'Gasto', fixed: true, hint: 'OSE', match: /\b(agua|ose)\b/ },
  { label: 'Internet', category: 'Gasto', fixed: true, hint: 'Antel, Claro…', match: /internet|wifi|fibra/ },
  { label: 'Teléfono', category: 'Gasto', fixed: true, hint: 'Celular de la iglesia', match: /telefono|celular|recarga/ },
  { label: 'Gas', category: 'Gasto', fixed: true, hint: 'Supergás, garrafa', match: /\bgas\b|supergas|garrafa/ },
  { label: 'Alquiler', category: 'Gasto', fixed: true, hint: 'Del local', match: /alquiler|arrendamiento/ },
  { label: 'Limpieza y materiales', category: 'Gasto', match: /limpieza|material|insumo/ },
  { label: 'Mantenimiento', category: 'Gasto', match: /mantenimiento|arreglo|reparacion|pintura|obra/ },
  { label: 'Ayuda social', category: 'Gasto', match: /ayuda|canasta|social|donacion entregada/ },
  { label: 'Actividades y eventos', category: 'Gasto', match: /evento|actividad|campamento|retiro|convencion/ },
  { label: 'Transporte', category: 'Gasto', match: /transporte|nafta|combustible|pasaje|omnibus/ },
  { label: 'Otro gasto', category: 'Gasto', custom: true }
]

export const INCOME_ITEMS: MoneyItem[] = [
  { label: 'Diezmos', category: 'Diezmo' },
  { label: 'Ofrenda', category: 'Ofrenda' },
  { label: 'Donación', category: 'Donación' },
  { label: 'Otra entrada', category: 'Otro', custom: true }
]

export const FIXED_EXPENSES = EXPENSE_ITEMS.filter(item => item.fixed)

// Rubro de un gasto: el elegido al anotarlo o, en movimientos viejos, el que se deduce de la descripción.
export function expenseItemOf(row: Row) {
  if (row.direction !== 'Egreso') return ''
  const chosen = EXPENSE_ITEMS.find(item => item.label === row.subCategory)
  if (chosen) return chosen.label
  const text = normalizeText([row.name, row.description, row.subCategory].filter(Boolean).join(' '))
  return EXPENSE_ITEMS.find(item => item.match?.test(text))?.label || 'Otro gasto'
}

export const isFixedExpense = (row: Row) => FIXED_EXPENSES.some(item => item.label === expenseItemOf(row))
