# Portal Nacional · aplicación

React + TypeScript + Vite. Todo el texto y los comentarios están en español rioplatense.

## Comandos (desde esta carpeta)

| Qué | Comando |
|---|---|
| Archivo único para abrir con doble clic (`app/index.html`) | `node scripts/build-portable.mjs` |
| Versión web para publicar e instalar (`app/dist-web/`) | `node scripts/build-web.mjs` |
| Compilar y correr **todas** las pruebas (necesita Google Chrome) | `node scripts/probar.mjs` |
| Servidor de desarrollo con base SQLite local | `npx vite` |

Las pruebas están en `pruebas/` (Playwright): primer uso sin datos, congregación en el celular,
personas e importación del formulario, informe sobre la planilla oficial, panel nacional y comités,
y la base central contra un Supabase simulado. Las capturas quedan en `../tmp/pruebas/`.

## Dónde se guardan los datos

`src/CRM.tsx → api()` elige solo:

1. **Base central (Supabase)** si la compilación tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   (ver `.env.example`). Entrada con correo y contraseña; permisos por congregación y comité
   definidos en `supabase/schema.sql`. Código: `src/cloud.ts`.
2. **Navegador (IndexedDB)** al abrir el archivo único sin base central. Código: `src/local-data.ts`.
3. **SQLite local** con `npx vite` (desarrollo). Código: `server/`.

Las reglas para guardar (validación, asistencia única por culto, etc.) están en `prepareRecord`
(`src/local-data.ts`) y `shared/catalog.mjs`, y las usan las tres formas.

## Mapa del código

- `src/App.tsx`, `src/components/Sidebar.tsx`, `src/navigation.ts`: estructura y menú de 5 secciones por espacio.
- `src/components/QuickMode.tsx`: Inicio de cada congregación (pasar lista, anotar dinero y personas, pedidos).
- `src/components/NationalDashboard.tsx`: panel nacional con indicadores y semáforo.
- `src/components/ReportStudio.tsx`: informe mensual sobre la planilla oficial (editar, imprimir).
- `src/components/PeopleImport.tsx`: importar el formulario de Google.
- `src/finance.ts`: rubros de dinero y gastos fijos.
- `src/components/CloudLogin.tsx`, `src/components/UsersAdmin.tsx`: entrada y permisos con base central.
- `public/manifest.webmanifest`, `public/sw.js`, `src/components/InstallPrompt.tsx`: app instalable.
