# Análisis inicial de ChurchCRM para APP Nacional

Fecha de revisión: 6 de octubre de 2026.

Repositorio revisado: `ChurchCRM/CRM`, versión declarada `7.8.0`, revisión
`b54fc2f`. El proyecto utiliza licencia MIT. Su código se descargó únicamente
como referencia en `work/churchcrm-source/` y está excluido del repositorio de
APP Nacional.

## Conclusión

ChurchCRM contiene una base muy valiosa para estudiar y adaptar, pero no debe
copiarse entero dentro de APP Nacional. Está orientado principalmente a una
congregación y conserva partes antiguas junto con módulos modernos. APP Nacional
necesita desde el comienzo una organización multiiglesia, permisos por ámbito y
una experiencia mucho más sencilla para teléfonos.

La estrategia recomendada es reutilizar conceptos, modelos y algoritmos
seleccionados; reconstruir la interfaz y adaptar la lógica al nivel nacional.

## Elementos comprobados en el código

### Personas y familias

ChurchCRM incluye:

- Nombre, apellidos y tratamiento.
- Dirección y localidad.
- Teléfono particular, laboral y celular.
- Correos electrónicos.
- Fecha de nacimiento.
- Fecha de membresía.
- Clasificación y rol familiar.
- Familia vinculada.
- Fecha de alta, baja y última edición.
- Campos personalizados.
- Fotografía individual y familiar.
- Búsqueda y directorio fotográfico.

Para APP Nacional se conservará el concepto de persona y familia, agregando la
pertenencia histórica a una iglesia local y cargos con ámbito nacional, local,
comité o célula.

### Fotografías

ChurchCRM guarda las fotografías como archivos en el servidor. Al subirlas:

- valida el formato;
- reduce la imagen a un máximo de 600 × 600 píxeles;
- conserva la proporción;
- guarda una versión PNG;
- relaciona el archivo con el identificador de la persona o familia.

En APP Nacional conviene mantener la reducción automática, pero usar
almacenamiento de objetos y formatos más eficientes, como WebP, para evitar que
las fotos ocupen espacio innecesario. Deben existir límites separados para:

- fotografía de perfil;
- comprobantes financieros;
- fotografías de actividades e informes.

### Cultos, eventos y asistencia

ChurchCRM ya posee:

- eventos y tipos de evento;
- eventos recurrentes;
- grupos asociados a un evento;
- lista de integrantes del grupo;
- entrada y salida individual;
- fecha y hora de asistencia;
- registro de quién realizó el ingreso o la salida;
- asistencia de toda una familia;
- historial de asistencia por persona;
- estadísticas de eventos asistidos;
- kiosco de ingreso.

Su API devuelve una lista de personas con nombre, fotografía, función y estado
de asistencia. Esto coincide con la pantalla solicitada para APP Nacional:
cuadrícula de hermanos con fotografía y una casilla o botón para marcar presencia.

APP Nacional debe simplificarlo para los cultos:

1. Crear o seleccionar el culto.
2. Mostrar la lista de la iglesia.
3. Buscar por nombre o teléfono.
4. Marcar presente o ausente con un toque.
5. Agregar una visita sin abandonar la pantalla.
6. Mostrar totales de adultos, jóvenes, niños y visitas.
7. Registrar la ofrenda del mismo culto.
8. Guardar quién tomó la asistencia y cuándo.

También debe permitirse registrar únicamente cantidades cuando una iglesia no
quiera pasar lista persona por persona.

### Finanzas

ChurchCRM contiene una estructura considerable:

- fondos o categorías de donación;
- promesas y pagos;
- movimientos anónimos o asociados a una familia;
- múltiples fondos en un mismo pago;
- depósitos abiertos y cerrados;
- métodos de pago;
- cierre de depósitos;
- conteo de denominaciones de efectivo;
- exportación CSV, OFX y PDF;
- historial por familia;
- reportes fiscales y financieros.

Para APP Nacional deben separarse claramente tres conceptos:

1. **Ofrenda del culto:** total recibido en una reunión, normalmente anónimo.
2. **Diezmo o aporte personal/familiar:** movimiento privado asociado a una
   persona o familia, visible solamente para tesorería autorizada.
3. **Otros ingresos y gastos:** actividades, compras, ayudas, mantenimiento y
   movimientos nacionales.

El cierre mensual debe impedir modificaciones silenciosas. Toda corrección debe
dejar usuario, fecha, motivo y valores anteriores.

### Informes

ChurchCRM incluye directorios, reportes de grupos, asistencia, depósitos,
promesas, familias, etiquetas, fotografías y otros documentos PDF.

APP Nacional necesita informes propios:

- semanal y mensual por iglesia;
- cuatrimestral pastoral;
- consolidado nacional;
- asistencia por tipo de reunión;
- crecimiento, visitas y seguimiento;
- ofrendas, diezmos, ingresos y gastos;
- actividad de comités;
- células, únicamente donde estén habilitadas;
- fotografías y documentos adjuntos.

## Matriz de aprovechamiento

| Área | Decisión | Motivo |
|---|---|---|
| Personas y familias | Adaptar | El modelo es amplio y probado. |
| Fotografías | Adaptar la lógica | La validación y reducción sirven; cambiaremos el almacenamiento. |
| Lista de asistencia | Adaptar fuertemente | ChurchCRM ya tiene lista, fotografías y check-in. |
| Historial por persona | Adaptar | Es directamente útil para seguimiento pastoral. |
| Eventos recurrentes | Adaptar | Sirve para cultos, ayunos, vigilias y reuniones. |
| Ofrendas y depósitos | Adaptar conceptos | La contabilidad local requiere nombres y flujos más sencillos. |
| Diezmos | Diseñar para APP Nacional | Deben tener privacidad, cierres y permisos propios. |
| Reportes PDF | Reutilizar patrones | Los informes nacionales y cuatrimestrales serán nuevos. |
| Kiosco | Evaluar después | Puede servir para autoasistencia, pero no es prioritario. |
| Interfaz completa | Reconstruir | Debe ser móvil, clara y específica para Uruguay. |
| Multiiglesia nacional | Construir | ChurchCRM no está organizado alrededor de este nivel. |
| Permisos por ámbito | Construir | Necesitamos nacional, iglesia, comité y célula. |

## Seguridad y privacidad

- No guardar diagnósticos médicos en observaciones generales.
- Las notas pastorales, si se habilitan, deben estar separadas y muy restringidas.
- Los diezmos personales no deben ser visibles para secretaría ni responsables
  que no pertenezcan a tesorería.
- Cada usuario debe tener una cuenta individual.
- Las fotografías y teléfonos no deben quedar accesibles públicamente.
- Los cambios financieros requieren auditoría.
- Una iglesia no debe poder consultar personas o finanzas de otra, salvo que un
  cargo nacional tenga autorización expresa.

## Almacenamiento de imágenes

El plan gratuito actual de Supabase indica 1 GB de archivos, no 5 GB. Puede
alcanzar para un prototipo y para fotografías de perfil bien comprimidas, pero
no es adecuado como garantía permanente para muchas fotografías de eventos,
comprobantes e informes.

El plan Pro indica actualmente 100 GB de almacenamiento de archivos incluidos.
Estos límites deben volver a comprobarse antes de contratar o publicar.

Recomendación inicial:

- foto de perfil: máximo 600 × 600 y aproximadamente 150–300 KB;
- comprobantes: compresión automática y máximo configurable;
- fotos de informes: límite por informe y carga múltiple controlada;
- conservar miniaturas para las listas;
- registrar en la base de datos solo la información del archivo, no la imagen;
- realizar copias de seguridad de base de datos y archivos por separado.

## Próximo prototipo

La siguiente ampliación debe concentrarse en un flujo completo y realista:

1. Crear un hermano con fotografía tomada o elegida desde el teléfono.
2. Mostrarlo inmediatamente en el directorio de su iglesia.
3. Crear un culto.
4. Abrir la lista visual de miembros.
5. Marcar presentes con casillas grandes.
6. Agregar visitas.
7. Registrar ofrenda.
8. Cerrar el culto.
9. Consultar el historial en el perfil del hermano.
10. Ver los resultados en el tablero y el informe mensual.

## Referencias

- Repositorio: https://github.com/ChurchCRM/CRM
- Licencia: https://github.com/ChurchCRM/CRM/blob/master/LICENSE
- Precios y límites actuales de Supabase: https://supabase.com/pricing

