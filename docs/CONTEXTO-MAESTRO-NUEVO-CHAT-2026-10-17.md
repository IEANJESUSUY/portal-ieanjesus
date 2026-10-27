# CONTEXTO MAESTRO PARA CONTINUAR PORTAL NACIONAL

## Instrucción principal para la nueva conversación

Continúa el proyecto local existente **Portal Nacional**, ubicado en:

`C:\Users\sanwi\OneDrive\Documentos\ChatGPT\APP NACIONAL`

No empieces una aplicación nueva. Inspecciona el código, los datos locales, las pruebas y los documentos antes de editar. Conserva todas las funciones y registros existentes, pero considera que la organización visual y la experiencia actual **todavía no están aprobadas**.

La nueva prioridad es una reestructuración profunda de la experiencia para que una persona sin experiencia digital pueda entender la aplicación sin recibir una explicación larga. El usuario mostró el CRM a su padre, que forma parte de la directiva de la iglesia, y él no entendió qué hacer ni cómo desplazarse. El propio usuario también se perdió entre menús, opciones y conceptos al intentar explicarlo. Esto demuestra que la aplicación sigue exponiendo demasiada estructura interna y demasiadas decisiones al mismo tiempo.

No respondas únicamente con ideas, wireframes o un nuevo prompt. Primero revisa el proyecto y luego realiza cambios reales en el código, de forma controlada, comprobable y sin borrar datos.

---

## 1. Qué es Portal Nacional

Portal Nacional es una aplicación de gestión para una organización cristiana nacional de Uruguay formada por aproximadamente 10 u 11 congregaciones, lugares de predicación, comités locales y comités nacionales.

No debe sentirse como un CRM empresarial tradicional. Debe funcionar como un acompañante sencillo para ordenar procesos que actualmente se realizan en papel, mensajes de WhatsApp, formularios sueltos, estimaciones de memoria e informes incompletos.

El objetivo no es obligar a los pastores a “usar un sistema complejo”. El objetivo es que las tareas cotidianas sean más rápidas y claras, y que esos registros alimenten automáticamente informes mensuales y cuatrimestrales de mejor calidad.

Procesos principales:

- registrar asistencia;
- registrar ingresos y egresos;
- añadir personas vinculadas y amigos;
- administrar familias como fichas independientes;
- registrar células o grupos de amistad;
- recibir y completar tareas de comités nacionales;
- crear actividades nacionales y revisar devoluciones;
- preparar, guardar, imprimir y enviar informes mensuales;
- preparar informes cuatrimestrales con mayor análisis;
- consultar información sin duplicar registros entre congregaciones y lugares de predicación.

---

## 2. Usuarios y espacios de acceso

La aplicación utiliza cuentas con nombre de usuario y contraseña proporcionados por la organización. No se desea depender de Gmail.

Una persona puede tener uno o varios espacios autorizados. Después de iniciar sesión, solo debe elegir espacio cuando realmente tenga más de uno.

Ejemplos:

- Un pastor puede entrar a su congregación, a un lugar de predicación y a un cargo nacional.
- Una secretaria local entra únicamente al espacio de secretaría de su congregación.
- Un encargado de lugar de predicación entra únicamente a ese lugar.
- Un líder nacional entra al comité correspondiente.
- La Administración Nacional puede consultar todas las congregaciones y revisar entregas.

Regla crítica de alcance:

- En una cuenta congregacional, la congregación queda asignada automáticamente y no se puede seleccionar otra.
- En un lugar de predicación se mantiene la relación con su congregación madre sin duplicar personas.
- Solo los comités nacionales y la Administración Nacional pueden trabajar con listados de varias congregaciones cuando la función lo requiere.
- Nunca debe volver el error “congregación inexistente” al guardar un movimiento local correctamente asignado.

---

## 3. Comités y actividades

Comités contemplados:

- Escuela Dominical;
- Jóvenes;
- Damas Dorcas;
- Caballeros;
- Misiones;
- Comunicaciones;
- Música;
- Obra Social;
- Junta Local en la congregación;
- Administración Nacional a nivel país.

Los comités nacionales crean actividades, seleccionan todas o algunas congregaciones, establecen fechas, descripción, requisitos y tareas. Las congregaciones reciben esas actividades, completan su devolución y pueden adjuntar asistencia, datos económicos y fotografías.

Ejemplos: cultos misioneros, ofrendas premisioneras, votos, mes de la familia, capacitaciones, reuniones y actividades sin movimiento económico.

Debe conservarse:

- matriz de actividades;
- asignaciones por congregación;
- estados pendientes, enviados, observados, corregidos y aprobados;
- revisión nacional;
- finanzas segmentadas por actividad y congregación;
- líderes locales visibles para el comité correspondiente.

---

## 4. Personas, amigos y familias

Existen dos altas claramente separadas:

### Amigo

Registro rápido para alguien que visitó una vez o fue contactado fuera de la iglesia:

- nombre;
- apellido opcional cuando todavía no se conoce;
- celular;
- fecha de nacimiento;
- género;
- fotografía opcional.

Debe poder completarse después. La aplicación puede recordar que faltan detalles, sin impedir la tarea actual.

### Persona vinculada

Ficha más completa:

- nombre y apellido;
- congregación asignada por el espacio;
- lugar de predicación vinculado;
- género;
- nacimiento;
- celular;
- dirección;
- bautismo;
- responsabilidad o comité;
- fotografía;
- observaciones administrativas.

No crear duplicados si una persona ya existe. Al escribir un nombre similar se debe sugerir utilizar la ficha existente.

### Familias

Las familias son fichas independientes, no un árbol genealógico. Una familia puede incluir personas con roles como padre, madre, hijo, abuelo, nieto, tutor u otro, y relacionarse con otra familia cuando sea necesario. Mantener esta solución.

---

## 5. Asistencia y cultos

Los días y horarios habituales se configuran una vez por congregación o lugar de predicación. Por ejemplo: martes, jueves y domingo; o miércoles y domingo.

Los cultos especiales —vigilias, ayunos u otros eventos— se crean desde calendario.

La toma de asistencia debe ser una de las experiencias más simples de toda la aplicación:

- abrir directamente el culto de hoy;
- pantalla dedicada, sin menús ni otras funciones que distraigan;
- nombres grandes y fáciles de marcar;
- búsqueda y filtros sencillos;
- total visible;
- visitas sin ficha;
- botón para añadir rápidamente un amigo y dejarlo marcado como presente;
- guardar siempre visible en teléfono;
- si se vuelve a abrir el mismo horario del mismo día, reutilizar el encuentro y no duplicarlo;
- permitir vincular la asistencia a una actividad nacional;
- recordatorio dentro de la aplicación si pasó una hora del horario del culto y todavía no se guardó la lista.

Esta pantalla dedicada ya existe y fue probada, pero debe evaluarse con usuarios reales y simplificarse todavía más si una persona no comprende inmediatamente qué debe tocar.

---

## 6. Finanzas

El formulario principal debe ser corto:

- ingreso o egreso;
- importe en pesos uruguayos;
- nombre o concepto breve;
- categoría;
- fecha.

En “más detalles” pueden aparecer comprobante, fotografía, comité, célula, culto, evento, actividad nacional, aportante y observaciones.

Categorías típicas: diezmos, ofrendas, donaciones, gastos y otros.

Se incorporaron cuentas por cobrar y cuentas por pagar como opciones secundarias. Estas obligaciones no deben contarse como efectivo recibido o gastado hasta corresponder.

No llamar “patrimonio acumulado” a un simple ingreso menos egreso. La aplicación puede mostrar:

- ingresos;
- egresos;
- resultado del período;
- saldo de efectivo acumulado cuando sea calculable;
- obligaciones pendientes por separado.

La aplicación no reemplaza una revisión contable profesional ni debe inventar estados financieros que no pueden respaldarse con los registros disponibles.

---

## 7. Informes mensuales y cuatrimestrales

Son una prioridad central, no una función secundaria.

El informe mensual y el informe cuatrimestral tienen la misma importancia visual. El cuatrimestral incluye mayor comparación y análisis.

El centro de informes debe permitir:

- elegir el período;
- ver si está pendiente, en borrador, guardado, enviado, recibido o revisado;
- abrir y continuar un borrador;
- preparar un documento precargado con asistencia y economía;
- editar responsables y cifras solo dentro del informe;
- aclarar cuando una cifra fue ajustada manualmente;
- agregar observaciones;
- agregar páginas de actividades o eventos;
- adjuntar fotografías comprimidas;
- mostrar gráficos limpios;
- guardar sin duplicar el informe;
- imprimir o guardar todas las páginas como PDF sin mostrar controles de la aplicación;
- enviar la misma versión guardada;
- reflejar el envío en Administración Nacional.

En los últimos cinco días del mes debe aparecer la tarea de entregar el informe mensual cuando esté pendiente.

Ya existe un editor documental nuevo con páginas y recuperación de borrador. No volver al antiguo modal con tarjetas que parecía una captura de pantalla de la aplicación. El formato institucional exacto aún debe ajustarse con documentos reales y revisión del usuario.

---

## 8. Células o grupos de amistad

La sección incluye registros semanales de:

- grupo o célula;
- adultos;
- visitas;
- niños;
- ofrenda;
- responsable.

Se conserva entrada manual e importación CSV. Ya existen gráficos de asistencia por grupo, ofrendas y categorías, inspirados en las imágenes utilizadas por la iglesia.

Una conexión remota real con Google Forms o Google Sheets todavía no está implementada y debe considerarse una etapa posterior.

---

## 9. Qué se implementó en la última reestructuración

- Inicio operativo separado de Informes.
- Inicio con acciones frecuentes, pendientes, informes, próximos encuentros, última asistencia y movimientos recientes.
- Navegación móvil con Inicio, Asistencia, Finanzas, Informes y Más.
- Modo rápido con asistencia, finanzas, personas, tareas e informe mensual.
- Pantalla de asistencia dedicada y adaptable a teléfono.
- Alta rápida de amigo desde asistencia.
- Reutilización del culto del día para evitar duplicados.
- Centro de informes con mensual y cuatrimestral.
- Editor de documentos con planilla, observaciones, eventos, fotografías y gráficos.
- Guardado y recuperación de borradores.
- Impresión limpia de todas las páginas.
- Estados de entrega y revisión.
- Tareas completas en la ruta `/tareas`.
- Separación entre flujo operativo y análisis gráfico.
- Paleta azul oscuro, celeste, amarillo y blanco con logo oficial.
- Capa de estilos intencional en `app/src/workspace.css`.

Archivos centrales:

- `app/src/CRM.tsx`
- `app/src/components/OperationalHome.tsx`
- `app/src/components/ReportStudio.tsx`
- `app/src/components/Sidebar.tsx`
- `app/src/components/Header.tsx`
- `app/src/App.tsx`
- `app/src/workspace.css`
- `app/shared/catalog.mjs`
- `app/src/local-data.ts`

Archivo para abrir:

- `app/index.html`

---

## 10. Problema de producto descubierto el 17/10/2026

Aunque la última versión está más ordenada técnicamente, el producto todavía no cumple el criterio principal de facilidad.

Prueba real informal:

- El usuario enseñó el CRM a su padre, integrante de la directiva.
- Su padre no entendió los menús ni qué debía hacer.
- El usuario también se trabó al explicarlo y se perdió entre las opciones.
- La interfaz sigue dependiendo de que alguien conozca de antemano qué significa cada módulo.
- Hay demasiados menús, conceptos y decisiones visibles simultáneamente.

Por tanto, la siguiente etapa no es añadir más módulos. Es reorganizar el producto alrededor de las tareas reales de cada persona.

Principio obligatorio:

> Una persona debe poder entrar y saber qué hacer hoy sin conocer las palabras CRM, módulo, matriz, trazabilidad, alcance, espacio de trabajo ni estado de resultados.

No basta con cambiar colores, tamaños o tarjetas. Hay que revisar la arquitectura de información, los nombres, el orden de los pasos y cuántas decisiones aparecen juntas.

---

## 11. Dirección nueva para la experiencia

### Entrada guiada por rol

Después del acceso, mostrar primero una portada muy simple adaptada al rol:

- “¿Qué necesitas hacer?”
- Pasar lista.
- Registrar dinero.
- Preparar un informe.
- Ver tareas pendientes.

Las opciones menos frecuentes pueden quedar detrás de “Más herramientas”.

No presentar al usuario un mapa completo de la organización cuando solo necesita una acción.

### Navegación por lenguaje cotidiano

Revisar nombres como:

- “Cultos y asistencia” → “Pasar lista”.
- “Finanzas locales” → “Dinero de la iglesia” o “Ingresos y gastos”.
- “Personas y familias” → “Personas”.
- “Tareas y comités” → “Pendientes”.
- “Centro de informes” → “Preparar informe”.

No cambiar estos nombres ciegamente: probarlos en contexto y utilizar subtítulos breves que expliquen el resultado de cada opción.

### Divulgación progresiva

- Mostrar primero lo necesario para completar la tarea.
- Colocar detalles avanzados detrás de “Agregar más información”.
- No repetir los mismos totales en Inicio, Informes y Finanzas sin una razón concreta.
- No colocar tarjetas dentro de tarjetas sin jerarquía clara.
- Evitar tablas anchas en teléfono.
- Usar una acción principal por pantalla.
- Cuando se complete una acción, indicar claramente qué ocurrió y cuál es el siguiente paso.

### Ayuda dentro del flujo

- Textos breves, en lenguaje cotidiano.
- Ejemplos dentro de campos cuando sea útil.
- Primera entrada guiada y descartable.
- Estados vacíos que expliquen para qué sirve la pantalla y ofrezcan una sola acción.
- No crear una sección de manual separada como sustituto de una interfaz comprensible.

### Dos niveles sin duplicar el producto

Debe existir una experiencia cotidiana muy simple y acceso a herramientas completas cuando se necesiten. No crear dos aplicaciones independientes ni dos navegaciones que compitan.

Propuesta conceptual:

1. **Hoy:** acciones frecuentes y pendientes.
2. **Registros:** personas, asistencia, dinero y células.
3. **Informes:** preparar, revisar y enviar.
4. **Organización:** comités, configuración y herramientas avanzadas.

En teléfono, “Hoy” debe ser el punto de entrada dominante. En escritorio puede haber navegación lateral, pero agrupada y explicada.

---

## 12. Trabajo solicitado para la próxima IA

### Fase 1: auditoría real antes de editar

1. Abrir la aplicación actual en teléfono y escritorio.
2. Recorrer como mínimo:
   - pastor de una congregación;
   - encargado de un lugar de predicación;
   - líder de comité nacional;
   - Administración Nacional.
3. Enumerar:
   - decisiones innecesarias;
   - menús duplicados;
   - términos difíciles;
   - información repetida;
   - pantallas que mezclan consulta y acción;
   - pasos que pueden eliminarse;
   - acciones esenciales ocultas.
4. No confiar solo en nombres de componentes: observar la interfaz renderizada.

### Fase 2: definir una arquitectura comprensible

Antes de hacer cambios masivos, elaborar un mapa breve de:

- pantalla inicial por rol;
- navegación principal;
- acciones primarias;
- funciones secundarias;
- recorrido de asistencia;
- recorrido de ingreso o gasto;
- recorrido de informe mensual;
- recorrido de tarea nacional.

Usar como prueba esta pregunta: “Si le entregamos el teléfono a una persona que solo usa WhatsApp, ¿sabe dónde tocar sin explicación?”

### Fase 3: implementar la reorganización

- Reutilizar los componentes y datos existentes.
- No borrar funciones ni registros.
- Simplificar por agrupación y divulgación progresiva.
- Mantener el diseño profesional y la paleta oficial.
- Priorizar 360 y 390 píxeles.
- En pantallas esenciales, evitar que el usuario tenga que desplazarse para descubrir la acción principal.
- Mantener el editor documental y la asistencia dedicada, pero revisar su entrada y su lenguaje.
- No introducir funcionalidades remotas simuladas como si fueran reales.

### Fase 4: validación comprensible

Además de pruebas técnicas, realizar una comprobación basada en tareas:

- “Pasar lista del culto de hoy”.
- “Registrar una ofrenda de 2.000 pesos”.
- “Agregar a un visitante llamado Juan”.
- “Ver qué debo entregar esta semana”.
- “Continuar el informe mensual”.

Cada tarea debe comenzar desde Inicio y requerir la menor cantidad razonable de decisiones.

Registrar cantidad de toques, puntos de duda y textos que necesitan explicación. No declarar terminada la reorganización solo porque compila.

---

## 13. Reglas de seguridad y preservación

- No borrar IndexedDB, localStorage, sessionStorage ni datos de demostración.
- No resetear el repositorio ni sobrescribir cambios ajenos.
- No reemplazar logo o paleta sin pedido explícito.
- No prometer autenticación segura, sincronización nacional o envío remoto mientras la aplicación sea local.
- No modificar filtros de congregación de forma que un usuario local vea o edite otra iglesia.
- No esconder errores de validación; traducirlos a mensajes claros.
- Conservar exportación e importación de respaldo.
- Mantener posibilidad de abrir `app/index.html` sin servidor.

---

## 14. Verificación técnica obligatoria

Desde `app` ejecutar:

```text
npm run build
node scripts/check-portable.mjs
node scripts/verify-all-criterios.mjs
node scripts/verify-recorridos.mjs
node scripts/verify-workspace-redesign.mjs
```

La última entrega pasó estas verificaciones. Las pruebas pueden actualizarse si afirman explícitamente un diseño viejo que ahora se desea cambiar, pero no deben debilitarse las comprobaciones funcionales de persistencia, alcance, ausencia de duplicados, informes, asistencia y funcionamiento móvil.

Capturas de referencia de la última entrega:

- `output/playwright/nuevo-inicio-390.png`
- `output/playwright/nueva-asistencia-390.png`
- `output/playwright/nuevo-editor-390.png`
- `output/playwright/nuevo-editor-1440.png`

---

## 15. Límites pendientes para etapas posteriores

No están terminados y no deben presentarse como hechos:

- Supabase, autenticación real, permisos y RLS;
- sincronización entre dispositivos;
- Google Forms y Google Sheets en vivo;
- mapas de zonas de residencia;
- notificaciones push con el navegador cerrado;
- plantillas exactas de todos los comités;
- validación contable profesional;
- despliegue de producción;
- prueba formal con todos los pastores.

---

## 16. Criterio final de éxito

La aplicación debe conservar su capacidad de organizar la iglesia, pero sentirse mucho más simple de lo que realmente es.

El éxito no es que tenga muchas funciones. El éxito es que:

- un pastor sepa qué tocar;
- una secretaria complete una tarea sin llamar para preguntar;
- un encargado pase lista rápidamente desde el teléfono;
- la Administración Nacional reciba información más completa;
- los informes se creen a partir de registros reales;
- nadie tenga que aprender qué es un CRM para usarla.

Al terminar la siguiente etapa, informar claramente:

1. qué se reorganizó;
2. qué términos se simplificaron;
3. cuántos pasos requiere cada tarea principal;
4. qué se comprobó en teléfono y escritorio;
5. qué queda pendiente;
6. qué archivo debe abrir el usuario.
