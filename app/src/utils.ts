import { NATIONAL_COMMITTEES } from '../shared/catalog.mjs'

export type Row = { id: string; [key: string]: any }
export type State = Record<string, Row[]>

export const money = (n: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(n)
export const today = () => new Date().toLocaleDateString('sv-SE')
export const label = (r?: Row) => r ? [r.name, r.surname].filter(Boolean).join(' ') : '—'

export const normalizeText = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// Fecha en formato uruguayo (dd/mm/aaaa) para mostrar en pantalla; los datos se guardan en ISO.
export const formatDate = (value?: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '—'
}
// Lee un CSV (coma o punto y coma, con comillas) como el que descarga Google Forms / Hojas de cálculo.
export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0]
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ','
  const source = text.replace(/^﻿/, '')
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '"' && quoted && source[index + 1] === '"') { value += '"'; index++; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === delimiter && !quoted) { row.push(value.trim()); value = ''; continue }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index++
      row.push(value.trim()); value = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
      continue
    }
    value += char
  }
  row.push(value.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
export const committeeLabel = (key?: string) => NATIONAL_COMMITTEES.find((c: { key: string }) => c.key === key)?.name || key || ''

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Fecha (ISO) del último día de la semana indicado, contando hoy. Ej.: "Domingo" un martes → el domingo pasado.
export function lastDateForWeekday(day: string) {
  const target = WEEKDAYS.indexOf(day)
  const date = new Date()
  if (target < 0) return today()
  date.setDate(date.getDate() - ((date.getDay() - target + 7) % 7))
  return date.toLocaleDateString('sv-SE')
}

// Detecta fichas que probablemente son la misma persona (mismo nombre y apellido, o mismo celular).
export function findPossibleDuplicates(people: Row[], draft: Row) {
  const name = normalizeText(draft.name)
  const surname = normalizeText(draft.surname)
  const phone = String(draft.phone || '').replace(/\D/g, '')
  if (!name && phone.length < 6) return []
  return people.filter(p => {
    if (p.id && p.id === draft.id) return false
    const samePhone = phone.length >= 6 && String(p.phone || '').replace(/\D/g, '') === phone
    const pSurname = normalizeText(p.surname)
    const sameName = Boolean(name) && normalizeText(p.name) === name &&
      (!surname || !pSurname || pSurname.startsWith(surname) || surname.startsWith(pSurname))
    return samePhone || sameName
  })
}

// Tamaño máximo y calidad según para qué es la foto (WebP: se ve igual y pesa mucho menos).
//   actividad: se imprime en el informe A4 · ~100–180 KB
//   comprobante: tiene que leerse el texto · ~80–150 KB
//   persona: se ve chiquita en la ficha · ~20–30 KB
export const PHOTO = {
  activity: [1280, 1280, 0.72],
  receipt: [1000, 1400, 0.7],
  person: [400, 400, 0.75]
} as const satisfies Record<string, readonly [number, number, number]>

export const compressFor = (kind: keyof typeof PHOTO, file: File) => compressPhoto(file, ...PHOTO[kind])

// Compresor de imágenes en cliente: reduce dimensiones y convierte a WebP
export async function compressPhoto(file: File, maxWidth = 900, maxHeight = 900, quality = 0.82): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato no admitido. Selecciona JPG, PNG o WebP.')
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No se pudo inicializar canvas.'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/webp', quality))
      }
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}
