import { useEffect } from 'react'

// En el celular las tablas se muestran como tarjetas: cada celda necesita el nombre de su columna.
// Copia el texto de cada encabezado a data-label en las celdas, también cuando las tablas cambian.
export function useTableLabels() {
  useEffect(() => {
    let frame = 0
    const label = () => {
      frame = 0
      document.querySelectorAll<HTMLTableElement>('table.crm-table').forEach(table => {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => (th.textContent || '').trim())
        table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row => {
          Array.from(row.cells).forEach((cell, index) => {
            const text = headers[index] || ''
            if (cell.dataset.label !== text) cell.dataset.label = text
          })
        })
      })
    }
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(label)
    })
    label()
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
}
