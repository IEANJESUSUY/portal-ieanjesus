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
2. **New repository** → nombre `portal-ieanjesus` → **Public** → *Create repository* (sin README).
   Público es gratis con GitHub Pages. Se ve el código, **no los datos**: esos quedan en Supabase,
   protegidos por usuario. En el código no hay contraseñas ni datos de personas.
   (Si preferís el código oculto: repositorio privado + GitHub Pro, unos USD 4 por mes.)
3. En la computadora, desde la carpeta del proyecto (`APP NACIONAL OFICIAL`):

   ```bash
   git remote add origin https://github.com/TU-USUARIO/portal-ieanjesus.git
   git push -u origin master
   ```

   La primera vez Git abre una ventana para iniciar sesión en GitHub.

## Paso 3 · Publicar en internet (GitHub Pages, gratis)

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**: cargá
   - `VITE_SUPABASE_URL` = la Project URL del paso 1
   - `VITE_SUPABASE_ANON_KEY` = la clave anon public
3. Pestaña **Actions → Publicar el Portal → Run workflow** (la primera vez). En 2 o 3 minutos queda en
   `https://TU-USUARIO.github.io/portal-ieanjesus/`.
4. Desde ahí, cada `git push` publica solo. GitHub no cobra por publicación: podés hacer todos los
   cambios que quieras. Lo que guardás en tu computadora (commit) no se publica hasta que hagas push.

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

## Paso 5 · Congregación Maldonado y sus cuentas

Cada iglesia tiene tres cuentas:

| Cuenta | Cómo entra | Qué ve y qué hace |
|---|---|---|
| **Pastor** (y esposa, si se quiere) | Con **su Gmail** | Toda su iglesia. Crea y cambia las contraseñas de Secretaría y Tesorería. |
| **Secretaría** | Usuario `secretaria.maldonado` y contraseña | Personas, cultos y listas, informes, pedidos de comités. En Dinero anota ofrendas y gastos y ve los totales; **no anota diezmos ni ve su monto**. |
| **Tesorería** | Usuario `tesoreria.maldonado` y contraseña | Dinero completo (diezmos, comprobantes, servicios del mes) e informes para ver. No ve Personas ni las listas. |

Los comités nacionales tienen una cuenta cada uno (`comite.jovenes`) que ve todo lo del comité.
Las cuentas con usuario no dependen de una persona: si cambia la secretaria, se le da la misma cuenta
con una contraseña nueva. Los permisos valen también en la base de datos, no solo en la pantalla.

1. En el Portal: **Iglesias y personas → Iglesias → Nuevo registro** → Congregación Maldonado.
2. El pastor entra a la dirección del Portal y toca **Es mi primera vez: crear mi usuario** (con su Gmail).
3. Vos, en **☰ → Configuración → Usuarios y permisos → Acceso con correo**: su correo, su nombre,
   espacio *Congregación Maldonado*, rol *Pastor* → **Dar acceso**.
4. En la misma pantalla, **Cuenta con usuario**: espacio *Congregación Maldonado*, rol *Secretaría*.
   El usuario y una contraseña fácil se completan solos → **Crear cuenta** → **Enviar los datos por
   WhatsApp**. Lo mismo para *Tesorería*. (El pastor también puede hacerlo desde su Configuración.)
5. Si un pastor cambia de iglesia: en la lista, **Cambiar de iglesia**. Secretaría y Tesorería quedan.
6. Si alguien se olvida la contraseña: botón **Contraseña** al lado de su cuenta.

Si ya cargaste datos en la preparación local: **Configuración → Exportar todos los registros (JSON)**
en esa computadora, y después, conectado como Administración Nacional, **Restaurar desde archivo**:
se suben a la base central sin borrar nada.

## Paso 6 · Instalarlo como aplicación en el celular

- **Android (Chrome):** al entrar aparece abajo "Instalá el Portal en tu celular" → **Instalar**.
  Si no aparece: menú ⋮ → *Agregar a pantalla principal*.
- **iPhone (Safari):** botón Compartir → **Agregar a inicio**.

Queda con el ícono del Portal y se abre a pantalla completa.

**Sin señal (por ejemplo, en el templo):** se puede seguir pasando lista y anotando. Lo que se guarda
queda en el celular, arriba aparece "1 cambio guardado en este celular", y se envía solo cuando vuelve
la señal. El Portal también abre sin señal con los últimos datos que tenía.

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

y GitHub Pages publica la versión nueva sola. En el celular se actualiza al volver a abrir.

## Seguridad y cuidados

- La clave *anon public* es pública por diseño: lo que protege los datos son las reglas de
  `schema.sql` (cada usuario ve solo lo que le corresponde). No las borres.
- Los diezmos se anotan como total, sin nombres, y sus montos están ocultos por defecto.
- **Fotos:** se comprimen en el celular antes de subirse (WebP; actividades hasta 1280 px ≈ 100–180 KB,
  comprobantes ≈ 80–150 KB, fotos de personas ≈ 20–30 KB) y se guardan como archivos en el
  almacenamiento de Supabase (bucket privado `fotos`). En la base queda solo la referencia, así entrar
  al Portal es rápido y cada foto se baja recién cuando alguien la mira.
- Si un proyecto gratis de Supabase no se usa en 7 días se pausa: se reactiva desde su panel.

## Planes y espacio

| | Gratis | Pro (USD 25/mes) |
|---|---|---|
| Datos (textos y números) | 500 MB | 8 GB |
| Fotos | 1 GB | 100 GB |
| Copias de seguridad diarias | No | Sí (7 días) |

Uso estimado por iglesia: unos 4 MB de datos y 36 MB de fotos por año.

- **Prueba en Maldonado:** el plan gratis alcanza de sobra.
- **Varias iglesias o datos reales para quedarse:** pasar a Pro y dejar activado el **tope de gasto**
  (Billing → Spend cap), así nunca se cobra más de lo del plan. Con 30 iglesias alcanza para décadas.
- **Si algún día se acerca al límite** (Supabase avisa por correo): borrar del almacenamiento las fotos
  de años ya guardados en Drive, o sumar espacio (cuesta centavos por GB).

## Respaldo automático en Google Drive

El programa [`drive/RespaldoDrive.gs`](../drive/RespaldoDrive.gs) corre en la cuenta de Google de la
iglesia y, **todos los días a las 3 de la mañana**, actualiza la carpeta *APP NACIONAL* de Drive:

| Subcarpeta | Qué tiene |
|---|---|
| **1. Dinero** | Planilla *Dinero AAAA*: resumen por mes de cada iglesia y comité (diezmos, ofrendas, gastos, saldo), totales del año, todos los movimientos y los servicios (luz, agua, internet…) |
| **2. Informes** | Planilla *Informes AAAA* con cada informe y sus números; subcarpeta *PDF del año* para los PDF |
| **3. Iglesias** | Planilla *Iglesias y comités*: personas, de la iglesia, visitas, bautizados y células por iglesia |
| **4. Respaldos** | Copia completa de los datos: una por mes (se guardan todas) y la más reciente |

Usa una **llave de respaldo que solo permite leer** (función `drive_export` de `schema.sql`): no puede
cambiar ni borrar nada. La versión del programa en GitHub no tiene llaves.

Instalarlo (una sola vez):
1. Con el Gmail de la iglesia, entrá a <https://script.google.com> → **Nuevo proyecto**. Nombre: *Respaldo Portal*.
2. Borrá lo que aparece y pegá el programa **con las llaves ya puestas** (te lo da Claude; no lo
   compartas). Guardá con el disquete.
3. Arriba, elegí la función **instalar** → **Ejecutar** → *Revisar permisos* → elegí la cuenta de la
   iglesia → *Configuración avanzada → Ir a Respaldo Portal* → **Permitir**.
4. Listo: aparecen las 4 subcarpetas. Para ver todo al día en cualquier momento: función
   **actualizar** → Ejecutar.

## Copia de los informes en Google Drive (una vez por año, o cuando quieras)

1. **Informes → Informes del año**: elegí el año → **Descargar en PDF**.
2. En la ventana que se abre, destino **Guardar como PDF** → Guardar.
3. Subí ese PDF a Drive, a *APP NACIONAL / 2. Informes / PDF del año*.

Sale un solo PDF con todos los informes enviados de ese año (planilla oficial, actividades con sus fotos
y anexo). La Administración Nacional descarga los de todas las iglesias; cada pastor, los de la suya.
Además conviene exportar el respaldo completo (Configuración → Exportar todos los registros) una vez por
mes y guardarlo en la misma carpeta. Ese respaldo guarda todos los datos; las fotos quedan en el
almacenamiento de Supabase y, las de los informes, también dentro del PDF del año.

## Mensajes de WhatsApp a varios hermanos

En **Personas**, elegí a quiénes (Todos, De la iglesia, Visitas, Faltan seguido…) → **Mensaje por WhatsApp**:

- Escribí el mensaje una vez (o elegí uno de ejemplo). `{nombre}` se cambia por el nombre de cada uno.
- **Empezar a enviar**: se abre WhatsApp con el mensaje listo para cada persona; tocás enviar y volvés
  para la siguiente. (WhatsApp no permite que una app mande a muchos de golpe sin su servicio pago.)
- **Guardar contactos en el celular**: descarga un archivo con todos; al abrirlo en el teléfono se
  guardan, y en WhatsApp se arma una **lista de difusión** para mandar a todos de una vez.

## Plan sugerido para la prueba en Maldonado (un mes)

1. **Semana 1:** registrar Maldonado, crear los usuarios del pastor y de quien ayude, importar el
   formulario de Google con los hermanos (Personas → Importar del formulario).
2. **Cada domingo:** pasar lista y anotar la ofrenda (2 minutos). A fin de mes, servicios fijos
   (Dinero → Servicios del mes).
3. **Fin de mes:** el informe mensual sale de lo anotado; se agregan las actividades con fotos y se envía.
4. **Al terminar el mes:** revisar en el panel nacional qué se usó y qué no, y anotar los cambios para
   la siguiente iglesia.
