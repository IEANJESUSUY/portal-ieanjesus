# Estado funcional — 10 de octubre de 2026

Referencia funcional: ChurchCRM (PHP/MySQL en `work/churchcrm-source`) e informes reales de comités nacionales (Jóvenes, Damas, Música, Comunicaciones).
La implementación es propia en React + TypeScript y Node/SQLite + IndexedDB portátil.

## Novedades implementadas en esta etapa

1. **Inicio de sesión conceptual y selector de espacios:**
   - Presentación breve de "Portal Nacional" con aviso claro de seguridad (modo demostración local).
   - Acceso con nombre de usuario y contraseña (el correo no es obligatorio).
   - Selector de espacio de trabajo tras ingresar: "¿A qué espacio quieres ingresar?" si tiene varios asignados (ej. pastor Maldonado, líder nacional de Jóvenes).
   - Cambio de espacio en caliente desde el encabezado sin cerrar sesión.
   - Perfiles de demostración para evaluación rápida con un solo clic.

2. **Alcance y segregación de espacios (sin selectores redundantes):**
   - **Administración nacional:** visualización global.
   - **Congregación local:** navegación y registros acotados a la propia iglesia sin selectores redundantes en cada formulario.
   - **Lugar de predicación:** panel acotado dependiente de una congregación madre (con opción de vista consolidada sin duplicar registros).
   - **Los 7 comités nacionales oficiales:** Escuela Dominical, Jóvenes, Damas, Obra Social, Misiones, Comunicaciones y Música.

3. **Ficha única nacional y prevención de duplicados:**
   - Buscador y deduplicador modal de personas antes de crear registros.
   - Visualización de coincidencias con fotografía, edad calculada, teléfono y congregación.
   - Selección directa de la ficha existente para vincularla a comités, lugares de predicación o eventos sin generar perfiles duplicados.

4. **Actividades nacionales y asignaciones a congregaciones:**
   - Formulario de creación de actividad nacional con comité automático, contador de caracteres (máx. 500) y modalidad de fecha (nacional común o local por congregación).
   - Distribución automática de asignaciones a todas las iglesias o seleccionadas.
   - Estados normalizados con texto y color: Pendiente, Iniciada, Enviada, Observada, Corregida, Aprobada.
   - Matriz de seguimiento en el panel del comité nacional con desglose por iglesia.

5. **Devolución congregacional con desglose financiero y compresión de fotos:**
   - Fecha local, evento/culto relacionado, asistencia y visitas.
   - Desglose económico para cultos misioneros: ofrendas premisioneras, ofrenda del culto, votos misioneros, otros ingresos y gastos.
   - Registro único: se visualiza en contabilidad local, devolución y panel del comité nacional sin duplicar movimientos.
   - Adjunto de hasta 2 fotografías comprimidas y optimizadas en el navegador a formato WebP.
   - Documento adjunto preparado para etapa posterior.

6. **Módulos especializados de comités (basados en informes reales):**
   - **Jóvenes:** Cultos misioneros, vigilias, líderes locales, ofrendas misioneras y comparativa histórica. Rango de edad configurable.
   - **Damas:** Programas Virtuosas y Mujeres Sabias, ofrendas Rayos de Luz, cultos premisioneros y cadenas de oración. Información familiar acotada.
   - **Música:** Directorio de músicos y vocalistas, capacitaciones virtuales y coro nacional.
   - **Comunicaciones:** Solicitudes de diseño gráfico (afiches, cumpleaños pastores, líneas gráficas), campañas y métricas de redes sociales con cálculo automático de crecimiento absoluto y porcentual.
   - **Escuela Dominical, Obra Social y Misiones:** Estructura compartida limpia (actividades, asignaciones, líderes, finanzas e informes) sin inventar campos especializados.

7. **Gráficos visibles con estados vacíos ("Sin datos todavía"):**
   - Tarjetas visibles con títulos, período, ejes o leyenda y etiqueta "Sin datos todavía" cuando no hay registros, explicando qué se mostrará al cargar datos.
   - Cero gráficos ficticios o barras inventadas.

8. **Informes cuatrimestrales (no trimestrales):**
   - Períodos cuatrimestrales (1º Ene–Abr, 2º May–Ago, 3º Sep–Dic) y selector manual Desde/Hasta.
   - Botón directo de impresión y exportación a PDF.

## Demostración vs. Requisitos de seguridad del servidor

- **Modo actual (demostración local):** Funciona abriendo `app/index.html` (IndexedDB) o mediante `npm run dev` (SQLite local). Permite validar la experiencia y el flujo de los espacios.
- **Requiere servidor para producción:**
  - Autenticación segura con hash de contraseñas (bcrypt/argon2) y sesiones/tokens HTTP-only.
  - Autorización y permisos forzados en el backend (las restricciones visuales del frontend no son una barrera de seguridad).
  - Almacenamiento centralizado compartido de base de datos y archivos multimedia.

## Cambios funcionales consolidados (12 de octubre de 2026)

1. **Ficha de personas (Amigo vs. Persona vinculada):**
   - Distinción entre **Amigo** (registro rápido: nombre, apellido, género, nacimiento y celular) y **Persona vinculada** (ficha completa con congregación, lugar de predicación, familia, vínculo, bautismo, comité/responsabilidad, foto y notas).
   - Botón «Completar información» para ampliar la ficha sin duplicarla. Se retiraron campos innecesarios (correo, teléfono fijo, ciudad, departamento, fecha de ingreso, calificación).

2. **Familias independientes:**
   - Fichas familiares con barrio/zona (obligatorio), dirección opcional, teléfono familiar e integrantes.
   - Nexos familiares inter-familia (`familyLinks`).

3. **Cultos habituales (`serviceSchedules`):**
   - Configuración única de horarios habituales para abrir rápidamente la lista del día en «Cultos y asistencia».

4. **Módulo de Informes e Informe Mensual (`monthlyReports`):**
   - Períodos rápidos (semanal, mensual, bimestral, cuatrimestral y personalizado).
   - Generador de informe mensual congregacional para la Administración Nacional con guardado local/borrador e impresión/PDF.

5. **Finanzas y Comités:**
   - Tarjetas KPI de ingresos, egresos y saldo.
## Cambios funcionales consolidados (12 de octubre de 2026 - Actualización 2)

1. **Regla de congregación según el espacio activo:**
   - La congregación se asigna automáticamente al espacio activo al crear registros dentro de una iglesia local o lugar de predicación.
   - Se eliminaron los selectores vacíos y redundantes en formularios de personas, familias, finanzas, cultos, eventos y grupos locales.
   - En lugares de predicación, los registros quedan adscritos al lugar activo y conservan su congregación madre para consolidaciones.
   - Los listados nacionales de congregaciones quedan reservados exclusivamente para la Administración Nacional y Comités Nacionales.

2. **Formulario de ingresos y egresos rediseñado (Finanzas):**
   - Modal ágil tipo aplicación moderna de gastos con botones grandes para seleccionar «Ingreso» o «Egreso».
   - Campos esenciales breves: Concepto, Descripción/referencia, Fecha actual editable, Importe destacado en pesos uruguayos (`$ UYU`), Comprobante con captura/compresión WebP opcional y Comité/destino local.
   - Botón «Agregar más detalles» para desplegar culto o actividad relacionada, persona aportante, subcategoría y notas.
   - Botón dinámico: «Guardar ingreso» o «Guardar egreso».
   - Tabla financiera con badges direccionales, conceptos, descripciones, importes destacados con color/signo y comprobante.

3. **Comités locales oficiales:**
   - 9 áreas congregacionales oficiales: Escuela Dominical, Jóvenes, Damas Dorcas, Caballeros, Misiones, Comunicaciones, Música, Obra Social y Junta Local.
   - Damas Dorcas y Caballeros separados. Junta Local definida como área congregacional.
   - Nivel nacional conserva los 7 comités confirmados con etiqueta actualizada «Damas Dorcas».

4. **Separación de «Agregar amigo» y «Agregar persona vinculada»:**
   - Dos acciones diferenciadas y visibles en `/personas`.
   - «Agregar amigo»: formulario rápido para contactos y visitas (nombre, apellido, género, nacimiento, celular, foto y congregación automática).
   - «Agregar persona vinculada»: ficha completa ministerial y familiar.
   - Conversión «Completar información y vincular» dentro de la ficha de amigo sin duplicar la persona ni alterar su ID.
   - Tabla de personas con foto, nombre completo, chip de estado (`Amigo`, `Persona vinculada`, `Inactivo`), celular, edad y responsabilidad.

5. **Lugares de predicación dependientes:**
   - El selector de lugares de predicación en personas solo muestra aquellos dependientes de la congregación activa.

## Verificación automatizada

- `node --test server/store.test.mjs`: Pasa al 100% (validaciones, esquemas, persistencia, compatibilidad).
- `node scripts/build-portable.mjs`: Compila `app/index.html` autocontenido.
- `node scripts/check-portable.mjs`: Pasa en Chrome (flujo file://, persistencia, formularios especializados, ancho móvil 390px sin desbordamiento horizontal).
- `node scripts/verify-recorridos.mjs`: Pasa al 100% los 5 recorridos obligatorios de flujos nacionales.
- `node scripts/verify-all-criterios.mjs`: Pasa al 100% los 6 recorridos de aceptación A, B, C, D, E y F especificados en la Sección 8.
- `node scripts/visual-check.mjs`: Pasa al 100% (comprobación visual y ausencia de scroll horizontal).

## Ideas pendientes de aprobación

1. **Plantillas recurrentes de actividades nacionales:** Permitir a comités como Jóvenes o Damas duplicar actividades con sus asignaciones para el siguiente cuatrimestre sin volver a escribir instrucciones.
2. **Historial de observaciones en entregas:** Mantener un hilo de comentarios entre el comité y el secretario/pastor cuando una entrega es "Observada" antes de ser corregida.
3. **Exportación de matriz de asignaciones a Excel/CSV:** Permitir al comité nacional descargar el estado de cumplimiento de todas las iglesias para reuniones directivas.
4. **Subida de comprobante bancario en devoluciones:** Campo específico para adjuntar foto de la transferencia del dinero enviado al comité nacional.

