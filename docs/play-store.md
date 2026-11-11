# Publicar el Portal en la Play Store

El Portal ya funciona como aplicación instalada desde el navegador (Chrome → *Instalar*). Para que además
aparezca en la Play Store se empaqueta la misma página como **app de Android (TWA)**: la app de la tienda
abre el Portal a pantalla completa, sin barra del navegador. Cada cambio que se sube a GitHub llega
también a la app de la tienda, sin publicar versiones nuevas (salvo que cambie el ícono o el nombre).

## Lo que ya está listo en el Portal

| Requisito de Google | Estado |
|---|---|
| Manifiesto de app (nombre, íconos 192/512, ícono adaptable *maskable*, colores, `id`) | ✅ `app/public/manifest.webmanifest` |
| Funciona sin señal (service worker) | ✅ `app/public/sw.js` |
| HTTPS | ✅ GitHub Pages |
| **Política de privacidad** con dirección pública | ✅ `https://ieanjesusuy.github.io/portal-ieanjesus/privacidad.html` |
| **Borrar cuenta y datos** desde la app y desde una página web | ✅ Configuración → *Borrar mi cuenta y mis datos*, y `privacidad.html#borrar-cuenta` |
| Aceptar la política al crear el usuario | ✅ casilla obligatoria en "Es mi primera vez" |
| Sin publicidad, sin rastreo, sin cookies | ✅ |

## Antes de empezar: qué tipo de cuenta de Google Play

Se paga **USD 25 una sola vez** en <https://play.google.com/console>. Hay dos tipos, y la diferencia importa:

- **Organización** (recomendado para la iglesia): pide un **número D-U-N-S** (gratis, se pide en
  <https://www.dnb.com/duns/get-a-duns.html>, tarda 1 a 4 semanas) y datos de la iglesia como
  institución. **Se publica directo.**
- **Personal**: no pide D-U-N-S, pero Google exige una **prueba cerrada con al menos 12 personas
  durante 14 días seguidos** antes de poder publicar. Con los pastores de la prueba se puede cumplir,
  pero hay que organizarlo.

## Pasos (cuando se decida publicar)

1. **Dominio para la app.** Android verifica que la app y la página son del mismo dueño con un archivo
   en la *raíz* del dominio (`/.well-known/assetlinks.json`). Con GitHub Pages se hace creando un
   segundo repositorio llamado `IEANJESUSUY.github.io` (Claude lo crea). Si más adelante se compra un
   dominio propio (por ejemplo `portal.ieanjesus.uy`), se usa ese.
2. **Generar la app** con [PWABuilder](https://www.pwabuilder.com): pegar la dirección del Portal →
   *Package for stores* → *Android* → nombre del paquete `uy.ieanjesus.portal`. Descarga un `.aab`
   y un archivo `assetlinks.json` con la huella de la firma.
   **Guardar el archivo de firma (`.keystore`) y su contraseña en un lugar seguro**: sin él no se puede
   actualizar nunca más la app.
3. Subir `assetlinks.json` al repositorio `IEANJESUSUY.github.io` en `.well-known/`.
4. En la Play Console: *Crear app* → subir el `.aab` y completar la ficha (ver abajo).

## Respuestas para la ficha de la Play Console

- **Categoría:** Productividad. **Público objetivo:** mayores de 18 (la usan pastores y encargados).
  **Contiene anuncios:** No. **Compras:** No.
- **Acceso a la app:** la app pide usuario. Dar a Google una cuenta de prueba de solo lectura
  (crear una cuenta "revision.google" en una congregación de prueba sin datos reales).
- **Seguridad de los datos (Data safety):**
  - Recopila: nombre, correo, teléfono, dirección aproximada (barrio), fecha de nacimiento, creencias
    religiosas (pertenencia a la iglesia), fotos, información financiera de la iglesia (totales).
  - Uso: *Funcionalidad de la app* y *Administración de la cuenta*. No se comparten con terceros.
    No es publicidad ni análisis.
  - Cifrado en tránsito: **Sí**. El usuario puede pedir que se borren los datos: **Sí** (enlace de
    `privacidad.html#borrar-cuenta`).
- **Política de privacidad:** `https://ieanjesusuy.github.io/portal-ieanjesus/privacidad.html`
- **Capturas:** al menos 2 del celular (Inicio, Personas, Pasar lista, Informe).

## Ley de datos de Uruguay (hacer antes de cargar datos reales)

Los datos de pertenencia a una iglesia son **datos sensibles** (Ley 18.331). Además del consentimiento
expreso de cada persona (ya está en el formulario de inscripción y en la política):

- **Inscribir la base de datos** en la URCDP (gratis, en línea):
  <https://www.gub.uy/unidad-reguladora-control-datos-personales/> → *Inscripción de bases de datos*.
  Se declara: responsable (IEANJESÚS Uruguay), finalidad (gestión de la iglesia), tipos de datos y que se
  guardan en Supabase (Estados Unidos) con consentimiento.
- Guardar las respuestas del formulario de Google con el consentimiento (son la prueba).
