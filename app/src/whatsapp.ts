// La comunicación entre iglesias, comités y la Administración Nacional se hace por WhatsApp.
// Convierte un celular uruguayo (099 112 233, +598 99 112 233…) en un enlace wa.me con un mensaje ya escrito.

export function whatsappNumber(phone?: string) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('598')) return digits.length >= 11 ? digits : ''
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.length === 8 ? `598${digits}` : ''
}

export function whatsappLink(phone?: string, text = '') {
  const number = whatsappNumber(phone)
  if (!number) return ''
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
