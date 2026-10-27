# Requisitos para el rediseño

> **Estado:** Implementación completada y verificada (Lotes 1 a 5).

## Lote 1 — Administración Nacional

Fecha de registro: 2026-10-19

### Enfoque general

- La experiencia debe estar diseñada específicamente para el rol **Administración Nacional**.
- La vista inicial debe ofrecer un **panorama nacional resumido**.
- Toda información repetitiva debe agruparse y segmentarse primero por **congregación/iglesia**.
- Desde los resúmenes debe existir la opción de **abrir y consultar el detalle**, sin mostrarlo todo de entrada.
- La Administración Nacional no debe recibir una copia de las operaciones cotidianas de una congregación local.

### Asistencia, cultos y calendario

- La Administración Nacional **no pasa asistencia a los cultos habituales de cada congregación**.
- Solo puede registrar asistencia en casos especiales de alcance nacional, por ejemplo:
  - convenciones;
  - campamentos nacionales;
  - otros encuentros nacionales extraordinarios.
- El calendario nacional debe priorizar eventos nacionales y no una lista mezclada de todos los cultos locales.
- Deben eliminarse de esta experiencia nacional elementos operativos locales como:
  - configuración de cultos habituales;
  - horarios semanales locales;
  - acción de pasar lista en cultos de una congregación.

### Finanzas

- Las finanzas deben estar segmentadas por iglesia/congregación.
- La primera vista debe mostrar un resumen por congregación, no una tabla exhaustiva de cada movimiento.
- Debe poder abrirse cada congregación para consultar sus movimientos y comprobantes en detalle.
- Conviene conservar una lectura nacional agregada, pero siempre distinguiendo claramente la procedencia por congregación.

### Células y datos repetitivos

- Las células deben mostrarse primero agrupadas por congregación.
- La vista nacional debe resumir indicadores como cantidad de células, asistencia, ofrendas, cumplimiento y reportes pendientes por congregación.
- El detalle de células individuales, responsables e informes semanales debe quedar disponible mediante navegación de profundización.
- Este patrón de **resumen → congregación → detalle** debe aplicarse también a otros módulos con muchos registros repetitivos.

### Comités nacionales y tareas

- La sección de Comités debe centrarse en los **comités nacionales**, no mezclar comités con células locales.
- La Administración Nacional debe poder ver y gestionar los comités nacionales.
- Los comités nacionales deben poder crear y asignar tareas a las congregaciones.
- Debe visualizarse el seguimiento de cada tarea:
  - congregaciones destinatarias;
  - estado por congregación;
  - fecha límite;
  - respuesta de cada congregación;
  - archivos o evidencias, cuando corresponda;
  - pendientes y atrasos.
- La Administración Nacional debe poder revisar las respuestas de cada congregación y obtener un resumen general de cumplimiento.

### Informes

- La Administración Nacional debe enfocarse en **recibir, revisar y confirmar** informes enviados por las congregaciones.
- No debe parecer que la Administración Nacional prepara los informes ordinarios en nombre de una congregación.
- Los informes mensuales y cuatrimestrales deben presentarse por período y congregación, con estados claros de entrega, recepción, revisión y pendiente.
- La vista inicial debe resumir el cumplimiento nacional; el contenido completo de un informe se abre solo cuando se necesita.

### Comunicación

- Incorporar un chat o sistema de comunicación entre las partes involucradas.
- Alcance inicial registrado: Administración Nacional, comités nacionales y congregaciones.
- Debe relacionarse, cuando sea útil, con tareas, respuestas, informes u otros asuntos concretos.

### Problemas observados en las capturas actuales

- **Informes:** se ofrece crear informes para una congregación; el foco nacional debería ser recepción, control y seguimiento.
- **Calendario:** se listan cultos locales de Maldonado y aparece la acción de pasar lista; no corresponde al rol nacional salvo eventos especiales.
- **Cultos y asistencia:** se muestran la configuración y los horarios habituales de una iglesia local; deben desaparecer del espacio nacional.
- **Finanzas:** los movimientos detallados aparecen todos juntos desde la primera pantalla; hace falta resumen por iglesia y acceso progresivo al detalle.
- **Células:** la pantalla parece un panel operativo de una sola congregación; la vista nacional debe comparar y agrupar congregaciones.
- **Comités:** la pantalla actual mezcla “Comités y células” y muestra células locales; debe reemplazarse por gestión de comités nacionales, tareas y respuestas.

### Decisiones que se definirán al cerrar la recopilación

- Participantes exactos y permisos del chat.
- Si el chat será general, por congregación, por comité, por tarea o una combinación.
- Quién puede crear y editar cada tipo de evento nacional.
- Indicadores exactos que aparecerán en cada resumen nacional.
- Flujo de revisión, corrección y aprobación de informes y respuestas.

## Registro de implementación

| Campo | Detalle |
| --- | --- |
| **Estado** | Completado |
| **Fecha** | 2026-10-19 |
| **Archivos modificados** | `app/src/components/OperationalHome.tsx`, `app/src/components/CommitteesModule.tsx`, `app/src/components/CommunicationHub.tsx`, `app/src/components/ReportStudio.tsx`, `app/src/CRM.tsx`, `app/src/components/Sidebar.tsx`, `app/shared/catalog.mjs`, `app/server/store.mjs`, `app/src/local-data.ts` |
| **Verificación desktop (1440px)** | Aprobada (`verify-requisitos-2026-10-19.mjs`, `verify-all-criterios.mjs`) |
| **Verificación móvil (360px / 390px)** | Aprobada sin desbordamientos horizontales (`verify-workspace-redesign.mjs`, `verify-requisitos-2026-10-19.mjs`) |

## Lote 2 — Comité Nacional de Jóvenes y regla común para comités

Fecha de registro: 2026-10-19

### Alcance

- Las observaciones parten del **Comité Nacional de Jóvenes**, pero deben aplicarse como regla de diseño a **todos los comités nacionales**.
- Cada comité debe trabajar con información organizada y segmentada por congregación.

### Panel y actividades sin información duplicada

- El **Panel del comité** y la sección **Actividades y matriz** no deben repetir la misma pantalla ni la misma información completa.
- El Panel debe funcionar como resumen ejecutivo y mostrar únicamente lo que requiere atención, por ejemplo:
  - próxima actividad;
  - tareas o devoluciones pendientes;
  - congregaciones que todavía no respondieron;
  - asistencia consolidada;
  - alertas y vencimientos;
  - acceso rápido para crear una actividad.
- Actividades y matriz debe ser el espacio operativo para:
  - crear y editar actividades;
  - consultar todas las actividades;
  - asignar acciones a congregaciones;
  - revisar el estado y la respuesta de cada congregación;
  - acceder al detalle de una actividad.
- La navegación interna del panel no debe volver a duplicar secciones que ya existen en el menú lateral.

### Segmentación por congregación

- Toda la información del comité debe poder consultarse por congregación.
- Esto incluye, como mínimo:
  - actividades y participación;
  - asignaciones, entregas y respuestas;
  - asistencia;
  - personas y líderes vinculados;
  - calendario;
  - finanzas del comité;
  - informes.
- La primera vista debe presentar totales y estados resumidos por congregación, con acceso al detalle cuando sea necesario.
- La sección Personas debe agrupar o filtrar a los líderes y demás personas vinculadas por congregación, evitando una lista nacional plana como única vista.

### Asistencia a eventos de los comités

- Cada comité nacional podrá registrar asistencia en los eventos que organice.
- Los eventos podrán ser:
  - presenciales;
  - online.
- La asistencia debe pertenecer a una actividad concreta del comité, no a los cultos habituales de las iglesias.
- El registro debe permitir identificar la congregación de procedencia de cada asistente para obtener resultados segmentados por congregación.
- El resumen del evento debe mostrar asistencia total y distribución por congregación, con acceso al listado detallado.
- Para eventos online deberá contemplarse una forma adecuada de registrar o confirmar la participación remota.

### Informes de los comités

- La pantalla actual de Informes parece reutilizar el flujo congregacional de informes mensuales y cuatrimestrales.
- Los informes de un comité nacional deben responder al trabajo propio del comité: actividades, asistencia, asignaciones, respuestas, resultados y, cuando corresponda, finanzas.
- Deben consolidarse a nivel nacional y permitir desglose por congregación.
- Se revisará al cerrar la recopilación si los comités realmente necesitan informes mensuales/cuatrimestrales o informes por actividad/período diseñados específicamente para ellos.

### Problemas observados en las capturas actuales

- **Panel del comité y Actividades y matriz:** presentan esencialmente el mismo contenido, las mismas métricas y la misma lista de actividades.
- **Doble navegación:** el menú lateral y las pestañas internas repiten destinos como Panel y Actividades.
- **Personas:** muestra una lista plana de líderes; falta una lectura agrupada o filtrable por congregación.
- **Informes:** usa textos y acciones propios de informes congregacionales, por ejemplo “información de la congregación” y “crear informe mensual”, sin adaptar el flujo al comité.
- **Asistencia:** aparece solo como una cifra reunida; falta el flujo para pasar asistencia en cada evento presencial u online y analizarla por congregación.

### Decisiones que se definirán al cerrar la recopilación

- Método de asistencia para eventos online: registro manual, enlace de confirmación, código, importación o integración con la plataforma utilizada.
- Datos mínimos solicitados a asistentes que no estén registrados previamente.
- Permisos para crear eventos, pasar lista, corregir asistencia y consultar datos personales.
- Estructura definitiva de los informes propios de cada comité.

## Registro de implementación del lote 2

| Campo | Detalle |
| --- | --- |
| **Estado** | Completado |
| **Fecha** | 2026-10-19 |
| **Archivos modificados** | `app/src/CRM.tsx`, `app/src/components/CalendarModule.tsx`, `app/src/components/Sidebar.tsx`, `app/src/local-data.ts`, `app/shared/catalog.mjs`, `app/server/store.mjs` |
| **Verificación desktop (1440px)** | Aprobada (`verify-requisitos-2026-10-19.mjs`, `verify-all-criterios.mjs`) |
| **Verificación móvil (360px / 390px)** | Aprobada sin desbordamientos horizontales (`verify-workspace-redesign.mjs`, `verify-requisitos-2026-10-19.mjs`) |

## Lote 3 — Congregaciones, comités locales y asistencia

Fecha de registro: 2026-10-19

### Comités dentro de cada congregación

- En cada congregación, la sección Comités debe mostrar **comités locales separados**, no mezclar comités y células en una misma tabla.
- Los comités locales se llaman igual que sus correspondientes comités nacionales.
- Cada comité local debe estar vinculado a su comité nacional equivalente.
- La información debe segmentarse primero por comité; al abrir un comité se accede a sus responsables, personas, actividades, tareas, asistencia, respuestas, finanzas e informes.
- Las células permanecen en su propia sección y no deben aparecer como si fueran comités.
- La congregación debe poder distinguir claramente entre:
  - comité nacional;
  - representación o comité local de esa congregación;
  - células o grupos de amistad.

### Cultos habituales de la Congregación Maldonado

- En Maldonado solo existen dos cultos habituales por semana:
  - jueves;
  - domingo.
- El sistema no debe generar varias listas duplicadas para una misma fecha y hora.
- Cada ocurrencia real de un culto habitual debe producir una sola lista de asistencia.
- Los demás encuentros no deben etiquetarse genéricamente como “Culto congregacional”. Deben conservar su tipo y nombre reales, por ejemplo:
  - ayuno;
  - devocional de evangelismo;
  - encuentro de jóvenes;
  - culto de oración, si corresponde;
  - otras actividades especiales.
- La programación automática debe basarse en la configuración real de días, horarios y tipos de encuentro de cada congregación.

### Dos experiencias complementarias de asistencia

#### 1. Toma de asistencia del encuentro actual

- Al momento de pasar lista debe mantenerse el enfoque visual actual: tarjetas grandes con el nombre de cada persona y una casilla para marcar su presencia.
- Esta interfaz debe mostrarse un poco más grande y con buena legibilidad para que la persona encargada pueda utilizarla cómodamente.
- Marcar la casilla significa que la persona asistió.
- Si no asistió, la casilla se deja sin marcar; no es obligatorio registrar manualmente una ausencia.
- Debe conservar funciones útiles como:
  - búsqueda por nombre;
  - filtros por adultos, jóvenes y niños;
  - contador de presentes;
  - añadir una persona amiga o visitante;
  - guardar la asistencia.
- El encuentro, fecha y hora deben verse claramente para evitar tomar lista en la actividad equivocada.

#### 2. Planilla histórica automática

- Debe existir una vista tipo planilla o matriz, inspirada en la referencia enviada:
  - una fila por persona;
  - una columna o casilla por fecha/encuentro;
  - visto para asistencia registrada;
  - casilla vacía cuando la persona no asistió.
- Las columnas de la planilla deben generarse automáticamente según las fechas reales de los cultos y actividades configurados.
- Al guardar la asistencia del encuentro actual, la casilla correspondiente de la planilla histórica debe actualizarse automáticamente.
- El usuario no debe tener que construir manualmente la planilla ni volver a escribir los nombres o las fechas.
- La planilla debe permitir reconocer qué tipo de encuentro corresponde a cada fecha y evitar mezclar bajo el mismo nombre cultos, ayunos, devocionales y otras actividades.
- Debe poder consultarse por período y, cuando sea útil, filtrarse por tipo de actividad o grupo de personas.

### Relación con calendario y actividades

- El calendario/configuración es la fuente que genera cada encuentro real y su lista de asistencia.
- Un culto habitual genera automáticamente su ocurrencia únicamente en los días configurados.
- Un ayuno, devocional u otra actividad genera su propia lista bajo su nombre y tipo correctos.
- No debe crearse más de una lista para la misma ocurrencia del mismo encuentro.

### Problemas observados en las capturas actuales

- **Comités:** la pantalla “Comités y células” contiene en realidad células locales; los conceptos deben separarse.
- **Listas recientes:** hay varias filas duplicadas de “Culto congregacional” con la misma fecha y hora.
- **Clasificación de encuentros:** distintas actividades aparecen o pueden terminar tratadas como cultos genéricos.
- **Historial de asistencia:** existe una lista vertical de encuentros, pero falta una matriz clara por persona y fecha.
- **Toma de asistencia:** el modelo visual actual es adecuado, pero debe ampliarse ligeramente para facilitar su lectura y uso.

### Decisiones que se definirán al cerrar la recopilación

- Nombres definitivos de todos los comités nacionales y locales.
- Período visible por defecto en la planilla histórica: semana, mes u otro.
- Comportamiento de la matriz en teléfonos y pantallas pequeñas.
- Si las actividades especiales se crean exclusivamente desde Calendario o también desde Cultos y asistencia.

## Registro de implementación del lote 3

| Campo | Detalle |
| --- | --- |
| **Estado** | Completado |
| **Fecha** | 2026-10-19 |
| **Archivos modificados** | `app/src/components/CommitteesModule.tsx`, `app/src/CRM.tsx`, `app/src/local-data.ts`, `app/src/workspace.css` |
| **Verificación desktop (1440px)** | Aprobada (`verify-requisitos-2026-10-19.mjs`, `verify-recorridos.mjs`) |
| **Verificación móvil (360px / 390px)** | Aprobada sin desbordamientos horizontales (`verify-workspace-redesign.mjs`, `verify-requisitos-2026-10-19.mjs`) |

## Lote 4 — Correcciones generales para móvil y nuevo calendario

Fecha de registro: 2026-10-19

### Correcciones móviles para toda la aplicación

- La adaptación a teléfono debe revisarse en **todas las pestañas, módulos, formularios y ventanas modales**.
- Actualmente, formularios largos como Nuevo movimiento y Agregar persona vinculada quedan cortados o difíciles de completar.
- La zona fija de acciones con los botones Cancelar y Guardar ocupa demasiado espacio y tapa campos del formulario.
- En móvil debe cumplirse lo siguiente:
  - todos los campos deben poder verse y completarse;
  - el desplazamiento debe ser continuo y comprensible;
  - ningún campo debe quedar oculto detrás de la barra de acciones;
  - debe existir espacio inferior suficiente para llegar al último campo;
  - los botones deben caber completos y ser fáciles de pulsar;
  - el teclado del teléfono no debe impedir acceder al campo activo ni a la acción de guardar;
  - encabezado, contenido desplazable y acciones deben distribuirse según el alto real de la pantalla.
- En pantallas angostas, Cancelar y Guardar podrán ocupar todo el ancho o colocarse uno debajo del otro si eso mejora la legibilidad.
- La acción principal Guardar debe permanecer claramente identificable, pero no debe cubrir el formulario.
- El botón de cerrar no debe consumir una porción excesiva de la pantalla.
- Los controles nativos, incluida la carga de fotografías o archivos, deben adaptarse al ancho disponible sin desbordarse.
- Esta corrección no será exclusiva de los dos ejemplos: se aplicará al alta y edición de personas, finanzas, eventos, actividades, comités, células, informes y demás formularios.

### Estructura general del calendario

- El módulo Calendario dejará de ser únicamente una tabla de registros.
- Debe ofrecer una representación visual mensual parecida a la referencia proporcionada.
- Cada día debe indicar de manera sencilla si tiene actividades y cuántas existen.
- Al seleccionar un día se deben mostrar sus eventos o detalles.
- Debe permitirse navegar al mes anterior y al siguiente.
- Junto al calendario o debajo de él, según el tamaño de pantalla, debe aparecer una agenda de próximos eventos.
- Cada evento de la agenda puede mostrar:
  - fecha;
  - título;
  - categoría;
  - hora;
  - lugar o modalidad online;
  - descripción breve;
  - acceso al detalle.
- En móvil, el calendario y la agenda deben apilarse verticalmente sin cortes ni desplazamiento horizontal obligatorio.

### Previsualización del calendario en los paneles

- Los paneles que necesiten mostrar calendario deben incluir una **previsualización**, no una tabla completa de administración.
- La previsualización debe combinar:
  - un calendario mensual compacto;
  - próximos eventos destacados;
  - acceso al calendario completo.
- El contenido debe respetar el espacio y el rol actual: congregación, comité o Administración Nacional.
- Solo deben verse los eventos que correspondan a ese espacio y a los permisos de la persona.

### Gestión y listado de eventos

- Además de la vista de calendario, debe existir una vista administrativa de agenda para gestionar eventos.
- El listado puede incluir:
  - título;
  - fecha;
  - hora;
  - categoría;
  - público o alcance;
  - estado de visibilidad;
  - acciones para editar o eliminar.
- Debe evitarse mezclar la experiencia de consulta visual con una tabla excesivamente técnica; calendario/agenda y administración pueden ser vistas complementarias.

### Formulario para agregar un evento

- La creación de eventos debe seguir una estructura semejante a la referencia enviada.
- Campos iniciales previstos:
  - título de la actividad;
  - fecha;
  - hora;
  - lugar o enlace/modalidad online;
  - categoría;
  - descripción;
  - visibilidad pública;
  - opción de destacar el evento;
  - opción para mostrarlo en el calendario de la iglesia;
  - alcance o público destinatario, cuando corresponda.
- El formulario debe adaptarse al contexto: congregación, comité nacional o Administración Nacional.
- Al guardar, el evento debe aparecer automáticamente en el calendario, la agenda y los lugares donde corresponda según su alcance y visibilidad.
- El formulario también debe cumplir todas las reglas móviles anteriores y permitir llegar cómodamente a Cancelar y Guardar.

### Problemas observados en las capturas actuales

- **Nuevo movimiento:** el contenido tiene un área de desplazamiento reducida y la barra inferior ocupa una parte importante de la pantalla.
- **Agregar persona:** los botones inferiores permanecen por encima del contenido y dificultan llegar a los campos restantes.
- **Calendario actual:** solo muestra una tabla de registros y no permite comprender visualmente el mes.
- **Creación de eventos:** todavía no existe una experiencia completa con categoría, lugar, descripción, visibilidad, evento destacado y alcance.
- **Vista de panel:** falta una previsualización compacta del calendario acompañada de próximos eventos.

### Decisiones que se definirán al cerrar la recopilación

- Categorías definitivas de eventos.
- Reglas exactas de visibilidad entre calendario público, congregacional, de comité y nacional.
- Si los cultos habituales se administran desde el mismo calendario o desde una configuración separada que alimenta el calendario.
- Qué eventos admiten inscripción, asistencia o respuestas de congregaciones.
- Política para editar o cancelar un evento que ya tenga asistencia registrada.

## Registro de implementación del lote 4

| Campo | Detalle |
| --- | --- |
| **Estado** | Completado |
| **Fecha** | 2026-10-19 |
| **Archivos modificados** | `app/src/components/CalendarModule.tsx`, `app/src/components/OperationalHome.tsx`, `app/src/CRM.tsx`, `app/src/workspace.css`, `app/shared/catalog.mjs`, `app/server/store.mjs` |
| **Verificación desktop (1440px)** | Aprobada (`verify-requisitos-2026-10-19.mjs`, `verify-workspace-redesign.mjs`) |
| **Verificación móvil (360px / 390px)** | Aprobada en modales y grilla mensual sin cortes ni desbordamiento (`verify-requisitos-2026-10-19.mjs`, `verify-workspace-redesign.mjs`) |

## Lote 5 — Acabado visual, movimientos, presentación inicial y acceso

Fecha de registro: 2026-10-19

### Coherencia visual general

- Realizar una revisión visual completa de toda la aplicación.
- Ajustar colores, cuadros, tarjetas, bordes, sombras, tamaños y espacios para que todas las pantallas parezcan parte del mismo sistema.
- Mantener la identidad del Portal Nacional, pero mejorar la jerarquía visual y evitar pantallas sobrecargadas.
- Usar los colores de forma funcional y consistente para distinguir:
  - acciones principales y secundarias;
  - estados completados, pendientes, atrasados o con errores;
  - ingresos y egresos;
  - categorías de eventos;
  - congregaciones y comités cuando se necesite diferenciarlos.
- Garantizar suficiente contraste y legibilidad en textos, botones, etiquetas y fondos.
- Unificar estilos para títulos, subtítulos, métricas, filtros, tablas, formularios, alertas y ventanas modales.

### Cero superposiciones y adaptación correcta

- Ningún texto, botón, tarjeta, tabla, modal, menú, encabezado o barra de acciones debe superponerse con otro elemento.
- Revisar la aplicación en teléfono, tableta, portátil y escritorio.
- Las tablas extensas deben transformarse, resumirse o permitir desplazamiento controlado en pantallas pequeñas.
- Los menús, filtros y botones deben reorganizarse según el espacio disponible.
- Los textos largos, nombres de congregaciones y títulos de eventos deben ajustarse sin romper el diseño.
- Los estados de carga, listas vacías, errores y confirmaciones también deben conservar una presentación correcta.

### Interacciones y movimientos intuitivos

- Las transiciones y animaciones deben ayudar a comprender qué ocurrió al abrir, cerrar, guardar, cambiar de pantalla o desplegar información.
- Los movimientos deben ser suaves, breves y coherentes; no deben retrasar el trabajo cotidiano.
- Botones y elementos interactivos deben comunicar claramente sus estados: disponible, seleccionado, cargando, guardado o deshabilitado.
- Al guardar información debe existir una confirmación visible y comprensible.
- Al cambiar de módulo, abrir un detalle o volver atrás, la orientación del usuario debe mantenerse.
- Evitar animaciones excesivas o decorativas que distraigan.
- Respetar la preferencia del dispositivo para reducir movimiento cuando corresponda.

### Presentación y cinemática de inicio

- Mejorar la pantalla de presentación y la cinemática inicial para que el primer contacto con la aplicación se vea más cuidado y profesional.
- La entrada puede usar de manera breve el logotipo, el nombre del Portal Nacional y la identidad visual institucional.
- La cinemática debe ser fluida, liviana y corta.
- No debe reproducirse de manera molesta en cada navegación interna.
- Debe poder omitirse y no bloquear el acceso cuando la conexión o el dispositivo sean lentos.
- La transición entre presentación, inicio de sesión y aplicación debe sentirse continua.

### Panel de usuario y contraseña

- Rediseñar la pantalla de acceso para que sea clara, moderna, confiable y fácil de usar.
- Debe incluir de forma ordenada:
  - identidad y logotipo del Portal Nacional;
  - campo de usuario;
  - campo de contraseña;
  - opción para mostrar u ocultar la contraseña;
  - acción principal para iniciar sesión;
  - mensajes claros de error o credenciales incorrectas;
  - estado de carga durante el ingreso.
- Los campos y botones deben ser cómodos tanto en teléfono como en escritorio.
- Evitar que el teclado móvil tape el botón de ingreso.
- La pantalla no debe revelar información técnica ni indicar cuál de los dos datos ingresados es el incorrecto.
- Se definirá posteriormente si se necesitan opciones como recordar sesión o recuperación de acceso.

### Revisión visual final

- Antes de considerar terminada la implementación, revisar visualmente los flujos principales en distintos tamaños de pantalla.
- Confirmar que no haya contenido cortado, controles inaccesibles, desplazamientos innecesarios ni elementos superpuestos.
- Verificar que la experiencia sea comprensible sin necesidad de instrucciones técnicas.

## Registro de implementación del lote 5

| Campo | Detalle |
| --- | --- |
| **Estado** | Completado |
| **Fecha** | 2026-10-19 |
| **Archivos modificados** | `app/src/App.tsx`, `app/src/CRM.tsx`, `app/src/workspace.css` |
| **Verificación desktop (1440px)** | Aprobada (`verify-requisitos-2026-10-19.mjs`, `verify-all-criterios.mjs`) |
| **Verificación móvil (360px / 390px)** | Aprobada (`verify-requisitos-2026-10-19.mjs`, `verify-workspace-redesign.mjs`) |

## Lote 6 — Reestructura intuitiva, listas manejables y preparación para pruebas

Fecha de registro: 2026-10-19

### Reestructura, no solo ajustes de estilo

- El rediseño debe cambiar la organización y el flujo de uso de las pantallas; no alcanza con recolorear los mismos paneles y botones.
- La interfaz debe ser comprensible para alguien que nunca usó el Portal: cada pantalla debe ayudar a reconocer qué se puede hacer y cuál es el siguiente paso.
- Reducir la cantidad de botones visibles. Presentar una acción principal clara y reunir las acciones secundarias en lugares previsibles, como menús de contexto o la ficha del registro.
- Evitar controles escondidos en zonas que la persona no espera, incluidos botones de acción atrapados al final de formularios extensos.
- En cada sección explicar brevemente para qué sirve y dar nombres claros a las acciones.
- Mostrar primero tareas pendientes, registros recientes y acciones frecuentes; conservar el acceso al resto del contenido con navegación clara.

### Buscador de acciones y ayuda contextual

- Incorporar un buscador visible que permita encontrar tanto información como acciones del tipo “¿Qué necesitas hacer?”.
- Debe aceptar palabras cotidianas y sugerir destinos o acciones concretas, por ejemplo buscar una persona, registrar un ingreso, pasar asistencia o agregar un evento.
- Los resultados deben llevar directamente a la pantalla o formulario correspondiente y conservar el contexto actual (congregación, comité o espacio nacional) cuando aplique.
- La búsqueda no debe duplicar los menús: sirve como atajo para que una persona nueva descubra cómo hacer algo.

### Listas extensas, paginación y “Ver más”

- La captura del Calendario muestra una agenda larga con muchos registros seguida de una tabla completa; esta cantidad de contenido de golpe se siente interminable y difícil de recorrer.
- En agendas, personas, movimientos, informes, tareas y otras listas extensas:
  - mostrar una cantidad inicial razonable de registros;
  - incluir “Ver más” o paginación sencilla;
  - permitir buscar y filtrar antes de cargar o recorrer más;
  - conservar un resumen de cuántos resultados hay;
  - evitar mostrar dos listas redundantes con la misma información en una pantalla.
- Elegir entre “Ver más” y paginación según el tipo de contenido, priorizando que el usuario pueda ubicar su posición y volver a un registro.
- En móvil, cargar y mostrar listas de forma gradual para evitar pantallas demasiado largas y controles minúsculos.

### Móvil con estructura propia

- El modo teléfono debe reorganizar la interfaz según el ancho disponible, como una experiencia adaptable, y no limitarse a encoger la versión de escritorio.
- Reordenar secciones, controles, tablas, filtros, tarjetas y acciones para el uso táctil.
- Evitar diseños densos, sensación de mareo, scroll dentro de scroll y contenido útil cortado.
- Los formularios deben reservar espacio real para escribir; su contenido se desplaza de manera natural y los controles de guardar/cancelar no cubren los campos.
- En Inicio móvil debe existir un modo rápido realmente intuitivo, con pocas acciones frecuentes, un buscador de tareas y un siguiente paso sugerido.
- Evitar repetir las mismas estadísticas, listas o acciones en Inicio, módulos y subpestañas.

### Aplicación de las capturas reenviadas

- **Calendario:** el calendario mensual es una referencia visual, pero su agenda debe limitar los elementos iniciales y ofrecer “Ver más”; no debe convertirse en un flujo interminable junto con una segunda tabla duplicada.
- **Comités locales:** las tarjetas y su texto informativo tienen elementos pegados o superpuestos. Separar visualmente etiquetas y texto, permitir saltos de línea, usar espacios consistentes y reorganizar las tarjetas para móvil.
- **Comités locales:** mantener la relación con el comité nacional equivalente, pero presentarla como datos legibles y separados (comité local, equivalente nacional, responsable y métricas).

### Preparación para pruebas y carga de datos

- Dejar los flujos principales listos para que la usuaria pueda probarlos con datos reales o de ejemplo.
- Revisar cómo importar, validar, corregir y exportar datos antes de cargar información en una base definitiva.
- Preparar una estructura de datos coherente con congregaciones, comités nacionales/locales, personas, actividades, asistencias, finanzas, tareas, respuestas e informes.
- La conexión o migración a una base de datos definitiva se hará cuando se identifique el destino, las credenciales y el método de importación que se utilizarán.
- Antes de una carga real, debe ser posible revisar una vista previa y los errores de validación para evitar incorporar registros duplicados o mal vinculados.

## Estado de implementación del lote 6

Primera entrega lista para pruebas locales (2026-10-20). No se considera terminado el rediseño completo; quedan más pantallas y flujos de los lotes anteriores por revisar con la usuaria.

- El calendario ya separa la vista mensual/agenda de la lista administrativa; cada vista carga un bloque inicial y permite “Ver más”.
- Se añadió un buscador global de acciones que abre los formularios de ingreso, gasto, persona o evento, conservando el espacio activo. Administración Nacional no recibe el atajo de asistencia congregacional.
- Los directorios de personas y movimientos muestran registros gradualmente con “Ver más”.
- La previsualización de calendario en Inicio y paneles de comité ahora tiene estilos propios para la grilla, indicadores de actividad y tarjetas de próximos encuentros; se adapta a una columna en espacios angostos.
- En móviles, los formularios ocupan la pantalla y las acciones quedan después de los campos en el flujo del documento, sin una barra fija que los tape.
- Las tarjetas informativas de comités locales permiten saltos y separan jerarquía y texto para evitar superposiciones.
- La app está compilada para abrir desde `app/index.html`; sigue en almacenamiento local (IndexedDB al abrir el HTML y SQLite durante desarrollo local). No se conectó una base remota ni se cargaron datos reales.
- La configuración existente permite exportar libro de Excel/respaldo JSON y validar el respaldo antes de restaurarlo. La carga real debe probarse con una copia de los datos, cuando se elija el destino definitivo.

**Comprobación:** `npm run build`, `node scripts/verify-requisitos-2026-10-19.mjs` (lotes 1–6, incluidos 360/390 px y atajos repetidos) y `node scripts/visual-check.mjs` (paneles desktop y formulario financiero móvil a 390 px).
