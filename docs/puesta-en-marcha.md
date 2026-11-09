# Puesta en marcha · Portal Nacional IEANJESÚS

Guía paso a paso para pasar de "funciona en mi computadora" a "lo usan los pastores desde el celular".
Se hace una sola vez. Tiempo estimado: una tarde.

## Cómo funciona hoy y cómo va a funcionar

| | Hoy (preparación local) | Con base central |
|---|---|---|
| Dónde se guardan los datos | En cada navegador, por separado | En Supabase (internet), compartidos |
| Cómo se entra | Botón "Abrir preparación local" | Correo y contraseña de cada persona |
| Qué ve cada uno | Todo | El pastor, su iglesia; el comité, lo suyo; la Administración Nacional, todo |
| Dónde se abre | Archivo `app/index.html` | Una dirección web, instalable en el celular |

El mismo código sirve para las dos formas: la base central se activa sola cuando la compilación
tiene las claves de Supabase. Sin claves, sigue guardando en el dispositivo.

---

## Paso 1 · Crear la base de datos (Supabase, gratis)

1. Entrá a <https://supabase.com> y creá una cuenta (podés usar Google).
2. **New project** → nombre `portal-ieanjesus`, región **South America (São Paulo)**, una contraseña fuerte
   (guardala; no se usa en el Portal).
3. Cuando termine de crearse: **SQL Editor → New query**, pegá todo el contenido de
   [`app/supabase/schema.sql`](../app/supabase/schema.sql) y tocá **Run**.
   Tiene que decir *Success*. Se puede volver a ejecutar sin perder datos.
4. **Authentication → Sign In / Providers → Email**: desactivá **Confirm email**.
   (Así los pastores pueden crear su usuario sin esperar un correo. Nadie ve nada hasta que vos le
   asignás su espacio, así que es seguro.)
5. **Project Settings → API**: copiá **Project URL** y la clave **anon public**.
   ⚠️ La clave `service_role` **nunca** se pone en el Portal ni se comparte.

## Paso 2 · Subir el proyecto a GitHub

1. Creá una cuenta en <https://github.com> si no tenés.
2. **New repository** → nombre `portal-ieanjesus` → **Private** → *Create repository* (sin README).
3. En la computadora, desde la carpeta del proyecto (`APP NACIONAL OFICIAL`):

   ```bash
   git remote add origin https://github.com/TU-USUARIO/portal-ieanjesus.git
   git push -u origin master
   ```

   La primera vez Git abre una ventana para iniciar sesión en GitHub.

## Paso 3 · Publicar en internet

Elegí **una** de las dos opciones.

### Opción A · Netlify (recomendada: funciona con el repositorio privado, gratis)

1. Entrá a <https://app.netlify.com> con tu cuenta de GitHub.
2. **Add new site → Import an existing project → GitHub** → elegí `portal-ieanjesus`.
   Netlify lee solo la configuración de `netlify.toml`.
3. Antes de publicar, en **Environment variables** agregá:
   - `VITE_SUPABASE_URL` = la Project URL del paso 1
   - `VITE_SUPABASE_ANON_KEY` = la clave anon public
4. **Deploy**. En 2 o 3 minutos te da una dirección como `https://portal-ieanjesus.netlify.app`
   (se puede cambiar el nombre en *Site configuration → Change site name*).

### Opción B · GitHub Pages (requiere repositorio público o GitHub Pro)

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**: cargá
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Cada vez que hagas `git push`, se publica solo (pestaña **Actions** para ver el avance).

Después de publicar, en Supabase: **Authentication → URL Configuration → Site URL** = la dirección del Portal.

## Paso 4 · Primer administrador

1. Abrí la dirección del Portal → **Es mi primera vez: crear mi usuario** → tu correo y una contraseña.
2. En Supabase → **SQL Editor**, ejecutá (con tu correo):

   ```sql
   insert into public.memberships (user_id, space_type, role, display_name)
   select id, 'national_admin', 'Administración Nacional', 'Santiago Salas'
   from auth.users where email = 'TU-CORREO@gmail.com';
   ```

3. Volvé al Portal y entrá. Ya sos Administración Nacional. **Esto es lo único que se hace con SQL.**

## Paso 5 · Congregación Maldonado y sus usuarios

1. En el Portal: **Iglesias y personas → Iglesias → Nuevo registro** → Congregación Maldonado.
2. El pastor (y quien ayude: secretaría, tesorería) entra a la dirección del Portal y toca
   **Es mi primera vez: crear mi usuario**.
3. Vos, en **☰ → Configuración → Usuarios y permisos**: su correo, su nombre, espacio
   *Congregación Maldonado*, rol (Pastor, Secretaría, Tesorería) → **Dar acceso**.
4. Listo: cuando entre, va directo al Inicio de Maldonado y solo ve los datos de Maldonado.

Si ya cargaste datos en la preparación local: **Configuración → Exportar todos los registros (JSON)**
en esa computadora, y después, conectado como Administración Nacional, **Restaurar desde archivo**:
se suben a la base central sin borrar nada.

## Paso 6 · Instalarlo como aplicación en el celular

- **Android (Chrome):** al entrar aparece abajo "Instalá el Portal en tu celular" → **Instalar**.
  Si no aparece: menú ⋮ → *Agregar a pantalla principal*.
- **iPhone (Safari):** botón Compartir → **Agregar a inicio**.

Queda con el ícono del Portal, se abre a pantalla completa y, si no hay señal, abre la última versión
(para guardar datos sí necesita internet).

> ¿Y la Play Store? No hace falta para empezar: la app instalada desde el navegador funciona igual.
> Si más adelante se quiere publicar en la Play Store, este mismo Portal se empaqueta con
> Bubblewrap/Capacitor (cuenta de Google Play: USD 25, una sola vez).

---

## Cada vez que se hagan cambios

```bash
cd app
node scripts/probar.mjs
```

Compila y prueba todo (necesita Google Chrome). Si dice **Todas las pruebas pasaron**:

```bash
git add -A
git commit -m "Descripción del cambio"
git push
```

y Netlify / GitHub Pages publica la versión nueva sola. En el celular se actualiza al volver a abrir.

## Seguridad y cuidados

- La clave *anon public* es pública por diseño: lo que protege los datos son las reglas de
  `schema.sql` (cada usuario ve solo lo que le corresponde). No las borres.
- Los diezmos se anotan como total, sin nombres, y sus montos están ocultos por defecto.
- Las fotos se guardan comprimidas dentro de la base. El plan gratis de Supabase trae 500 MB:
  alcanza para empezar; si crece mucho, se pasan a Supabase Storage.
- Supabase hace copias de seguridad diarias en planes pagos. En el plan gratis, exportá un respaldo
  JSON desde Configuración **una vez por mes** y guardalo en Drive.
- Si un proyecto gratis de Supabase no se usa en 7 días se pausa: se reactiva desde su panel.

## Plan sugerido para la prueba en Maldonado (un mes)

1. **Semana 1:** registrar Maldonado, crear los usuarios del pastor y de quien ayude, importar el
   formulario de Google con los hermanos (Personas → Importar del formulario).
2. **Cada domingo:** pasar lista y anotar la ofrenda (2 minutos). A fin de mes, servicios fijos
   (Dinero → Servicios del mes).
3. **Fin de mes:** el informe mensual sale de lo anotado; se agregan las actividades con fotos y se envía.
4. **Al terminar el mes:** revisar en el panel nacional qué se usó y qué no, y anotar los cambios para
   la siguiente iglesia.
