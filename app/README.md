# Portal Nacional

Aplicación principal del CRM nacional de la iglesia cristiana en Uruguay.

## Ejecución y comandos

Para ejecutar scripts en este entorno local con Node 24:

```bash
& "C:\Users\sanwi\AppData\Local\OpenAI\Codex\runtimes\cua_node\cfb32733c877621e\bin\node.exe" scripts/build-portable.mjs
```

### Comandos de verificación
- **Compilar portable:** `node scripts/build-portable.mjs` (genera `app/index.html` autocontenido).
- **Pruebas unitarias del almacén:** `node --test server/store.test.mjs`
- **Pruebas de portabilidad y regresión:** `node scripts/check-portable.mjs`
- **Verificación de flujos nacionales:** `node scripts/verify-recorridos.mjs`
- **Verificación de criterios de aceptación (Sección 8):** `node scripts/verify-all-criterios.mjs`
- **Verificación visual y screenshots:** `node scripts/visual-check.mjs`

## Abrir directamente (Doble clic)
Haz doble clic en `index.html` (en la raíz de `APP NACIONAL` o en `app/index.html`).
La compilación incluye todo el JavaScript y CSS embebidos dentro de un único archivo HTML sin dependencias externas ni necesidad de servidor web `127.0.0.1`.

- La versión oficial comienza vacía y no carga perfiles ni registros ficticios.
- En modo archivo (`file://`): los datos quedan en este navegador con IndexedDB (`portal-nacional-oficial-v1`), separado de la copia de pruebas.
- En modo servidor local (`http://`): la API usa `data/portal-nacional-oficial.sqlite`, separado del almacenamiento anterior.
- La autenticación institucional y la conexión a una base central todavía no están implementadas. No cargues datos sensibles o reales hasta completar y probar esos controles.

## Características clave implementadas
1. **Regla de congregación según espacio activo:**
   - La congregación se asigna automáticamente al espacio activo al crear registros dentro de una iglesia local o lugar de predicación.
   - En lugares de predicación (ej. San Carlos), los registros conservan su origen y su congregación madre (ej. Maldonado) para consolidación.
   - Listados nacionales disponibles solo para Administración Nacional y Comités Nacionales.
2. **Formulario ágil de ingresos y egresos:**
   - Selector visual de dos botones grandes (`Ingreso` / `Egreso`).
   - Importe destacado en pesos uruguayos (`$ UYU`), concepto, descripción, comprobante fotográfico opcional con compresión WebP cliente y comité/destino.
   - Botón «Agregar más detalles» para desplegar culto o actividad relacionada, persona aportante, subcategoría y notas.
   - Botón de guardado contextual: «Guardar ingreso» o «Guardar egreso».
3. **Comités locales oficiales:**
   - 9 áreas congregacionales oficiales (Escuela Dominical, Jóvenes, Damas Dorcas, Caballeros, Misiones, Comunicaciones, Música, Obra Social y Junta Local).
   - Comités nacionales conservan los 7 oficiales confirmados con etiqueta «Damas Dorcas».
4. **Fichas de personas especializadas:**
   - Botón «Agregar amigo»: formulario rápido para contactos y visitas (nombre, apellido, género, nacimiento, celular, foto opcional).
   - Botón «Agregar persona vinculada»: ficha completa ministerial y familiar con vinculación a lugares de predicación locales y familias.
   - Conversión «Completar información y vincular» dentro de la ficha de amigo sin duplicar la persona.
   - Búsqueda y deduplicación modal para prevención de perfiles duplicados.
