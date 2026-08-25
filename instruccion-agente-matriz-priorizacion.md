# Instrucción de desarrollo — Vista "Matriz de priorización"

> Para el agente de código que trabaja sobre el proyecto de seguimiento de actividades del CDE.
> Adjuntar junto a este documento el archivo de referencia visual `matriz-priorizacion.html`.

---

## 0. Reglas de trabajo (leer antes de escribir código)

1. **Primero reconoce, después construye.** Antes de crear o modificar cualquier archivo, recorre el proyecto e infórmame por escrito de: dónde vive el modelo de datos de las actividades, cómo se persisten hoy, cómo se registran las vistas o pantallas existentes, y qué convenciones de nombres, estilos y estructura de carpetas se usan.
2. **No inventes estructura.** La vista nueva debe integrarse con el patrón que ya existe en el proyecto, no imponer uno nuevo. Si el proyecto ya tiene un enrutador, un módulo de estado o una hoja de estilos común, úsalos.
3. **Detente y pregunta** ante cualquiera de estas situaciones, en lugar de asumir: el modelo de datos no coincide con el contrato de la sección 3; no existe un campo equivalente a `célula`; la persistencia actual no permite escribir un campo nuevo; o hay más de una forma razonable de registrar la vista.
4. **Sin dependencias externas.** HTML, CSS y JavaScript nativos. Prohibido agregar librerías, paquetes, CDN o llamadas a red externas: el entorno es corporativo bancario y el navegador puede tener bloqueo de dominios. Tampoco fuentes tipográficas remotas.
5. **Alcance cerrado.** Implementa exactamente lo que está en este documento. Cualquier mejora que se te ocurra la propones al final como lista, no la incorporas.
6. **Cambios acotados.** No refactorices código existente que no sea estrictamente necesario para esta vista. Si crees que hace falta un refactor, propónlo por separado.

---

## 1. Contexto

El proyecto es la aplicación de seguimiento de actividades y objetivos del Centro de Excelencia de Datos y Analítica Avanzada. El equipo (~22 personas organizadas en células) prioriza con el marco de **grandes rocas, piedras y arena**.

Hoy la aplicación permite registrar actividades con hitos, responsables, fechas y notas de seguimiento. Falta una vista de análisis que muestre la cartera completa distribuida en una matriz de dos ejes.

## 2. Objetivo

Construir una vista nueva, **Matriz de priorización**, que ubique cada actividad en un cuadrante formado por los ejes de importancia y urgencia, permita filtrar por célula y abrir el detalle de cualquier actividad.

Esta vista es de **análisis y clasificación**, no de edición: no duplica el formulario de actividades.

### Los cuatro cuadrantes

| Posición | Cuadrante | Ejes | Prioridad derivada | Lectura de gestión |
|---|---|---|---|---|
| Superior derecho | **Rocas** | Importante + urgente | Gran roca | Foco de la gerencia |
| Superior izquierdo | **Piedras 1** | Importante, no urgente | Piedra | Construye capacidad futura |
| Inferior derecho | **Piedras 2** | Urgente, no importante | Piedra | Candidatas a delegar o acotar |
| Inferior izquierdo | **Arena** | Ni importante ni urgente | Arena | Se atiende con lo que sobre |

El eje de importancia crece hacia arriba y el de urgencia hacia la derecha. La disposición en pantalla debe respetar exactamente esas posiciones.

## 3. Cambio en el modelo de datos

Agregar a la entidad **Actividad** un campo:

```
cuadrante: 'rocas' | 'piedras1' | 'piedras2' | 'arena' | null
```

Consideraciones:

- **Asignación manual.** El cuadrante lo define el usuario; no se calcula a partir de otros campos.
- **`null` es un estado válido**, no un error: significa "sin clasificar". Toda actividad existente queda en `null` tras el cambio, y esa es la migración esperada. No inventes un valor por defecto ni infieras el cuadrante desde el campo de prioridad actual.
- La etiqueta roca / piedra / arena se **deriva** del cuadrante según la tabla de la sección 2. No la guardes duplicada.
- Si el proyecto ya tiene un campo de prioridad de tres valores, indícame cómo conviven ambos antes de tocarlo. No lo elimines por tu cuenta.

Contrato de lectura que asume la vista:

```js
{
  id, nombre, celula, responsable,
  estado,        // no iniciada | en curso | en riesgo | bloqueada | completada | cancelada
  cuadrante,     // rocas | piedras1 | piedras2 | arena | null
  objetivo, descripcion,
  hitos: [{ nombre, responsable, fechaCompromiso, estado }],
  notas: [{ fecha, autor, texto }]
}
```

Si el modelo real difiere, **no cambies el modelo**: adapta la vista y repórtame las diferencias.

## 4. Requisitos funcionales

**Matriz**
- RF-01. Cuadrícula 2x2 con los cuatro cuadrantes en las posiciones de la sección 2, con rótulos de eje visibles (importancia en vertical, urgencia en horizontal).
- RF-02. Cada cuadrante muestra su nombre, el conteo de actividades visibles y la lista de actividades que le corresponden.
- RF-03. Cada actividad se representa con una tarjeta que muestra nombre, porcentaje de avance y la fecha del próximo hito pendiente. Si esa fecha ya pasó, se destaca como vencida.
- RF-04. El avance se calcula como hitos completados sobre hitos totales. Sin hitos, el avance es 0 %.
- RF-05. Un cuadrante sin actividades muestra un mensaje que explica que no hay resultados con los filtros aplicados; no queda en blanco.

**Clasificación**
- RF-06. Las actividades con `cuadrante = null` se listan en una bandeja **Sin clasificar** debajo de la matriz. La bandeja se oculta cuando no hay ninguna.
- RF-07. El usuario puede arrastrar una tarjeta a cualquier cuadrante, y también de vuelta a la bandeja. Al soltarla, el cambio se persiste de inmediato con el mecanismo de guardado que ya use el proyecto y la vista se refresca.
- RF-08. El arrastre no puede ser la única forma de clasificar: el panel de detalle debe ofrecer un control para cambiar el cuadrante desde teclado.

**Filtros**
- RF-09. Filtro por célula, de selección múltiple, con una opción "Todas". Las células se derivan de los datos, no se codifican en duro.
- RF-10. Búsqueda por texto sobre nombre de actividad y responsable.
- RF-11. Los filtros afectan simultáneamente a la matriz, a los conteos y al indicador de distribución.

**Detalle**
- RF-12. Al hacer clic en una tarjeta se abre el detalle de la actividad: ficha (responsable, célula, objetivo, estado, avance, descripción), tabla de hitos con nombre, responsable, fecha de compromiso y estado, y la bitácora de notas ordenada de la más reciente a la más antigua.
- RF-13. Los hitos vencidos y no completados se destacan visualmente en la tabla.
- RF-14. El detalle se cierra con la tecla Escape, con un botón explícito y haciendo clic fuera del panel.
- RF-15. Si la aplicación ya tiene una pantalla de detalle de actividad, ofrece además un enlace hacia ella en vez de reimplementar la edición.

**Indicador de distribución**
- RF-16. En el encabezado, una barra que muestra el porcentaje de actividades por cuadrante sobre el conjunto filtrado, con su leyenda. Es la lectura de gestión de la vista: permite ver cuánto del esfuerzo del equipo está cayendo en el cuadrante urgente–no importante.

## 5. Requisitos no funcionales

- RNF-01. Sin dependencias externas de ningún tipo (ver regla 4).
- RNF-02. Accesibilidad: navegación completa por teclado, foco visible, roles ARIA correctos en el panel de detalle, y estados de los filtros expuestos con `aria-pressed`.
- RNF-03. Respetar `prefers-reduced-motion`.
- RNF-04. Responsive: por debajo de ~720 px los cuadrantes se apilan en una columna manteniendo el orden Rocas, Piedras 1, Piedras 2, Arena.
- RNF-05. Todo texto proveniente de los datos debe escaparse antes de insertarse en el DOM. No construir HTML concatenando contenido sin sanear.
- RNF-06. La vista debe funcionar con cero actividades, con actividades sin hitos y con actividades sin notas, sin lanzar errores en consola.
- RNF-07. Interfaz completamente en español, sentence case, sin tecnicismos del sistema en las etiquetas visibles.
- RNF-08. Estética institucional bancaria: sobria, densa, legible; azul marino como color base y un color propio por cuadrante usado con moderación. Si el proyecto ya tiene variables de estilo, reutilízalas en lugar de definir nuevas.

## 6. Criterios de aceptación

La entrega se considera completa cuando, sobre el proyecto real:

1. La vista queda registrada y accesible desde la navegación existente de la aplicación.
2. Al abrirla con datos existentes, todas las actividades aparecen en la bandeja **Sin clasificar** y ninguna se pierde.
3. Arrastrar una actividad a un cuadrante persiste el cambio, y al recargar la página la actividad sigue en ese cuadrante.
4. Filtrar por una célula reduce simultáneamente las tarjetas visibles, los conteos por cuadrante y la barra de distribución.
5. Los porcentajes de la barra de distribución suman 100 % sobre las actividades clasificadas del conjunto filtrado.
6. Clic en cualquier tarjeta abre el detalle con la información correcta de esa actividad, incluidos hitos y notas.
7. Toda la interacción anterior es posible únicamente con teclado.
8. Consola limpia: sin errores ni advertencias al cargar, filtrar, clasificar y abrir el detalle.
9. No se modificó ningún archivo ajeno a esta funcionalidad, salvo los estrictamente necesarios para registrar la vista y agregar el campo `cuadrante`.

## 7. Entregables

1. Los archivos de la vista, ubicados según la convención del proyecto.
2. El cambio en el modelo de datos y en la persistencia.
3. Un resumen de qué archivos creaste, cuáles modificaste y por qué.
4. La lista de supuestos que tuviste que tomar y de puntos donde el proyecto real difiere de este documento.
5. Al final, y por separado, tus propuestas de mejora fuera de alcance.

---

## 8. Referencia visual

El archivo `matriz-priorizacion.html` es un prototipo funcional autónomo del resultado esperado. Úsalo como referencia de disposición, comportamiento y estilo. **No lo copies tal cual al proyecto**: su lógica de datos es un adaptador de ejemplo y debe reemplazarse por la del proyecto real.
