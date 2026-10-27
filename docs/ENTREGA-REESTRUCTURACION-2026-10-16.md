# Reestructuración — 16/10/2026

## Abrir

Abrir `app/index.html` con doble clic. Si ya estaba abierto, recargar la pestaña. Se conservó el almacenamiento existente; no limpiar los datos del navegador. Para regenerar el archivo: ejecutar `npm run build` dentro de `app`.

## Cambios implementados

- Inicio operativo independiente: acciones frecuentes, tareas pendientes, estado de informes, próximos encuentros, última asistencia y movimientos recientes. Ya no repite los cinco gráficos de Informes.
- Centro de Informes: mensual y cuatrimestral con la misma jerarquía; elección de período, borradores e historial. Análisis y trazabilidad separados de la preparación del documento. Eliminado el falso «patrimonio acumulado» equivalente al resultado del período.
- Editor documental: planilla precargada editable, responsables, observaciones, páginas de actividades con fotografías comprimidas, gráficos y vista previa. Guardar y reabrir conserva los datos y el ID; enviar no duplica el informe. Impresión de todas las páginas sin botones ni navegación. Los ajustes del informe no alteran los registros originales y se identifican como manuales.
- Estados Borrador, Guardado, Enviado, Recibido y Revisado admitidos; recepción/revisión desde la administración en la demostración local. La tarea de informe mensual aparece en Inicio en los últimos cinco días del mes cuando falta entregar.
- Asistencia en diálogo nativo dedicado, de pantalla completa en teléfono: nombres grandes, búsqueda, filtros, conteo, visitas sin ficha, guardado visible y alta rápida de amigo con nombre, teléfono/foto opcionales. Se permite apellido desconocido para amigos, no para personas vinculadas. El horario habitual reutiliza el encuentro del día en lugar de crearlo otra vez.
- Tareas completas disponibles en `/tareas`; las pendientes se muestran en Inicio. Se conservan comités, devoluciones, finanzas, células, familias, personas y exportaciones existentes.
- Navegación móvil con Inicio, Asistencia, Finanzas, Informes y Más. Modo rápido sin navegación duplicada, con acceso al informe mensual. Header sin repetir el nombre del espacio varias veces. Botones, espaciado y tarjetas unificados con azul, blanco y amarillo.
- Cambio de espacio vuelve a Inicio; se conservó la asignación local de congregación validada por las pruebas existentes.

## Verificaciones

- `npm run build` (TypeScript y archivo portátil).
- `node scripts/check-portable.mjs`: altas, persistencia, asistencia, finanzas, informes, CSV de células, modo rápido y móvil.
- `node scripts/verify-all-criterios.mjs`: seis recorridos de pastor, amigo, persona vinculada, predicación, comité y compatibilidad.
- `node scripts/verify-recorridos.mjs`: actividad nacional, devolución local, revisión, datos demostrativos y detección de duplicados.
- `node scripts/verify-workspace-redesign.mjs`: Inicio distinto de Informes, anchos 360/390/768/1440 sin desbordamiento de página, lista dedicada, amigo con un solo nombre, no duplicación de culto, recuperación de borrador, todas las páginas imprimibles, envío sin duplicación y apertura cuatrimestral.
- Capturas revisadas en `output/playwright/nuevo-inicio-390.png`, `nueva-asistencia-390.png`, `nuevo-editor-390.png` y `nuevo-editor-1440.png`. PDF generado de prueba: `output/playwright/informe-nuevo-prueba.pdf`.
- Las pruebas usan contextos de navegador aislados; sus datos QA no se insertan en el navegador del usuario.

## Límites y siguiente etapa

- El envío de informes y los permisos siguen siendo simulados localmente. No hay sincronización remota, Supabase/RLS ni Google Forms/Sheets en vivo. No exponer datos reales como si esta demostración ofreciera aislamiento seguro entre usuarios.
- Recordatorios dentro de la aplicación; no son notificaciones push ni tareas ejecutadas con el navegador cerrado.
- La contabilidad mostrada no constituye un balance patrimonial completo ni sustituye la clasificación/revisión contable. Cobros/pagos pendientes no se cuentan como efectivo en el análisis de Informes.
- Pendiente revisar con el usuario la plantilla institucional exacta y la salida de documentos con textos/fotografías excepcionalmente largos, además de confirmar categorías y reglas de cada comité. No añadir módulos nuevos sin autorización.
- No reescribir ni borrar datos para retocar la apariencia. Mantener las pruebas de persistencia y alcance de congregación al continuar.

## Archivos principales

`app/src/CRM.tsx`, `app/src/components/OperationalHome.tsx`, `app/src/components/ReportStudio.tsx`, `app/src/workspace.css`, `app/src/components/Header.tsx`, `app/src/components/Sidebar.tsx`, `app/src/App.tsx`, `app/shared/catalog.mjs`.
