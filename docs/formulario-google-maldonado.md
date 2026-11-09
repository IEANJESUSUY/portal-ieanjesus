# Formulario de Google · Congregación Maldonado

Formulario para que cada hermano, amigo o visita cargue sus datos. Las respuestas se pasan al Portal con
**Personas → Importar del formulario**.

> Importante: escribí las preguntas **con el mismo texto** que aparece acá. El Portal reconoce cada columna
> por esas palabras (Nombre, Apellidos, Celular, nacimiento, Sexo, bautizado, año, fecha, célula, Barrio, Autorización).

## Título y descripción

**Título:** Datos de la Iglesia · IEANJESÚS Maldonado

**Descripción:**
> ¡Dios te bendiga! Queremos conocerte y acompañarte mejor. Completá tus datos: lleva menos de 2 minutos.
> Si sos menor de 18 años, pedile a tu papá o a tu mamá que lo complete con vos.

## Sección 1 · Tus datos

| # | Pregunta (texto exacto) | Tipo | Obligatoria |
|---|---|---|---|
| 1 | Nombre | Respuesta corta | Sí |
| 2 | Apellidos | Respuesta corta | Sí |
| 3 | Celular | Respuesta corta | Sí |
| 4 | Fecha de nacimiento | Fecha (con año) | Sí |
| 5 | Sexo | Opción múltiple: **Hombre** / **Mujer** | Sí |
| 6 | Barrio | Respuesta corta | Sí |
| 7 | ¿A qué célula vas? | Desplegable (lista de abajo) | Sí |
| 8 | ¿Estás bautizado/a? | Opción múltiple: **Sí** / **No** | Sí |

**Opciones de la pregunta 7** (copiar tal cual):

- Barrio Hipódromo
- La Milagrosa
- Cerro Pelado
- Centro
- Cuñetti
- Ciudad de Rocha
- Maldonado Nuevo
- Barrio Norte
- Ninguna todavía

**Pregunta 8:** en los tres puntitos de la pregunta elegí **"Ir a la sección según la respuesta"**:
- **Sí** → ir a la Sección 2 (Tu bautismo)
- **No** → ir a la Sección 3 (Autorización)

## Sección 2 · Tu bautismo

| # | Pregunta (texto exacto) | Tipo | Obligatoria |
|---|---|---|---|
| 9 | ¿En qué año te bautizaste? | Respuesta corta · validación: Número, entre 1940 y 2026 | No |
| 10 | Si te acordás, ¿cuál fue la fecha exacta de tu bautismo? | Fecha | No |

Si la persona solo pone el año, el Portal lo guarda como fecha aproximada ("2010 (aprox.)").
Sirve para los filtros de bautizados, pero no se cuenta en el informe de ningún mes.

## Sección 3 · Autorización

| # | Pregunta (texto exacto) | Tipo | Obligatoria |
|---|---|---|---|
| 11 | Autorización | Casillas, una sola opción: **Acepto que la iglesia guarde mis datos para contactarme y acompañarme** | Sí |

## Configuración del formulario

- **No** activar "Recopilar correos" ni "Limitar a 1 respuesta" (las dos obligan a iniciar sesión en Google y mucha gente abandona).
- **No** pedir foto (también obliga a iniciar sesión).
- Mensaje de confirmación: *"¡Gracias! Ya tenemos tus datos. Dios te bendiga."*

## Mensaje para el grupo de WhatsApp

> 🙏 ¡Hola, hermanos! Estamos actualizando los datos de la iglesia para acompañarlos mejor.
> Les pedimos completar este formulario (menos de 2 minutos). Si tienen amigos o visitas que vienen a la
> iglesia o a la célula, compártanselo también. ¡Dios les bendiga!
> 👉 [enlace del formulario]

## Cómo pasar las respuestas al Portal

1. En Google Forms: **Respuestas → Ver en Hojas de cálculo**.
2. En la hoja: **Archivo → Descargar → Valores separados por comas (.csv)**.
3. En el Portal (Congregación Maldonado): **Personas → Importar del formulario** → elegir el archivo.
4. Revisar la lista y tocar **Agregar personas**.

Qué hace el Portal al importar:

- **Bautizado = Sí** → entra como **De la iglesia**. **Bautizado = No** → entra como **Visita**. Después el pastor lo
  cambia en la ficha si hace falta.
- Anota a cada persona en su **célula**. Si la célula todavía no existe en el Portal, ofrece crearla.
- **No repite personas:** si ya hay alguien con el mismo celular o el mismo nombre, lo marca como "Ya está cargada".
  Se puede importar el mismo archivo cada semana: solo entran los nuevos.
- Quien no marcó la autorización **no se importa**.
