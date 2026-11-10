# Ahorro de tokens: selección y medición

Revisión documental: **2026-11-10**. Leer solo los apartados necesarios. Esta referencia orienta; no instala ni activa herramientas. No se han realizado benchmarks locales ni pruebas de integración de estas opciones.

## 1. Decisión rápida

La primera opción es búsqueda directa, contexto pertinente y respuesta concisa. Añade una capacidad solo si resuelve un gasto identificable. Las siguientes son recomendaciones de esta base, no resultados experimentales:

| Situación | Decisión | Razón para descartarla o posponerla |
|---|---|---|
| Respuestas extensas | Comparar concisión normal con Caveman | Sus instrucciones pueden costar más que el texto eliminado |
| Muchas preguntas sobre relaciones de código | Reutilizar un índice vigente de Graphify; evaluar construirlo si se repetirá el uso | Una búsqueda aislada no amortiza preparación y mantenimiento |
| Navegación e impacto de cambios | GitNexus como alternativa de grafo | Resolver licencia y dependencias; no duplicar el índice por rutina |
| Mucho texto de comandos | Evaluar RTK | Recuperar salida original si el filtro elimina evidencia necesaria |
| Proyecto pequeño o este paquete Markdown | Usar `rg` y lecturas puntuales | No necesita indexación semántica ni herramientas adicionales |

## 2. Caveman: salida breve

La [skill auténtica](https://github.com/JuliusBrussee/caveman/blob/main/skills/caveman/SKILL.md) modifica el estilo de respuesta. Conserva términos técnicos, idioma, números, comandos y negaciones. El código y los textos persistidos fuera del chat requieren redacción normal salvo petición específica. No es necesario imitar mala gramática para ser breve.

El propio autor distingue **skill de respuesta** de motor/proxy: la primera no comprime entrada, archivos ni razonamiento. Su [informe de medición](https://github.com/JuliusBrussee/caveman/blob/main/docs/HONEST-NUMBERS.md) publica una mediana de **3% menos salida** frente a pedir concisión, en diez preguntas, una ejecución y reglas anteriores. El informe no demuestra equivalencia técnica ni ahorro neto general. La cabecera publicitaria del proyecto no sustituye esa comparación.

Elegir solo `caveman` si aporta valor medible. No cargar variantes, compresión de memoria, proxy o selección automática de modelos por defecto. No reescribir instrucciones del usuario ni eliminar restricciones para acortar el contexto. Una consulta de estado no activa el estilo.

## 3. Graphify: recuperar contexto por relaciones

El [proyecto oficial](https://github.com/Graphify-Labs/graphify) combina una herramienta con una skill para Codex. No confundir el paquete **`graphifyy`** con el nombre del comando **`graphify`**. Su [skill de Codex](https://github.com/Graphify-Labs/graphify/blob/v8/graphify/skill-codex.md) contempla búsqueda directa cuando no hay grafo y la pregunta es puntual.

Procedimiento recomendado por esta base:

1. Si existe índice, comprueba alcance y frescura antes de consultarlo. Si no existe, evalúa cuántas consultas repetidas justificarían crearlo.
2. Limita el corpus. Para código, considera extracción local con `--code-only`; excluye secretos, dependencias, binarios y salidas generadas del alcance de indexación.
3. Consulta símbolos concretos con presupuesto acotado; abre los fragmentos fuente relevantes. Un grafo orienta la búsqueda, no demuestra por sí solo que una relación inferida sea correcta.
4. Actualiza cuando cambie el código; evita reconstrucciones, visualizaciones, wikis, modo profundo y servicios que la tarea no necesita.

Según la [guía de consumo](https://docs.graphify.com/open-source/features/honest-token-savings), el análisis de código es local; documentos, PDF e imágenes usan extracción semántica con modelos. También los `.md` pueden generar gasto. Comprueba proveedor y contenido permitido antes de esa extracción. No equipares el producto Cloud con el CLI local.

El [CLI](https://docs.graphify.com/open-source/configuration/cli) documenta `graphify query "simbolo" --budget 1000`; el presupuesto limita esa respuesta, no toda la sesión. Su benchmark compara consultas con leer el corpus completo: para decidir, compara también contra una búsqueda directa competente e incluye construcción y mantenimiento del índice.

## 4. RTK: reducir salidas de terminal

[RTK](https://github.com/rtk-ai/rtk) filtra salidas de comandos antes de que lleguen al agente. Es un binario con integración ejecutable. Conviene evaluarlo cuando pruebas, logs o diffs dominan el contexto; no añade una capacidad útil a una salida que ya es mínima.

La [matriz del autor](https://github.com/rtk-ai/rtk/blob/develop/docs/guide/getting-started/supported-agents.md) documenta Codex CLI y hooks nativos de Windows. Comprueba versión, host y comandos interceptados en tu instalación: una guía para CLI no prueba funcionamiento en cualquier aplicación. Mantén acceso al original, códigos de salida y errores decisivos; si el resumen resulta insuficiente, vuelve al comando original.

`rtk gain` sirve como indicador del ámbito que procesa; no representa todo el consumo del agente. No atribuyas a reducción de cuota o factura el porcentaje de salida filtrada. Esta base no requiere proxy de tráfico, enrutamiento de modelos ni integración global.

## 5. GitNexus: alternativa para código

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) indexa símbolos, llamadas, dependencias y flujos, y los expone por CLI/MCP. Su [documentación de integración](https://github.com/abhigyanpatwari/GitNexus/blob/main/gitnexus/README.md) incluye Codex. Considerarlo para consultas de impacto y navegación de código cuando esas funciones justifican sus dependencias.

La [licencia revisada](https://github.com/abhigyanpatwari/GitNexus/blob/main/LICENSE) es **PolyForm Noncommercial**: verificar condiciones antes de adoptarlo en un proyecto comercial. `analyze` también puede instalar integraciones y escribir `AGENTS.md`/`CLAUDE.md`; `--index-only` separa la indexación de esas escrituras. `setup` modifica configuración de editores. No ejecutarlos como consultas inocuas.

Elegir un sistema de grafo primero. Añadir un segundo solo si resuelve una necesidad que el primero no cubre y su coste se justifica. No hay evidencia local para declarar a GitNexus universalmente mejor que Graphify.

## 6. Contexto eficiente sin instalaciones

- Localiza nombres con `rg --files -g ...` y símbolos con `rg -n -g ...`; limita carpetas y abre después los fragmentos pertinentes. En PowerShell, usa `Select-String` si `rg` no está disponible.
- No vuelques archivos completos por rutina. Si una salida se trunca o no resuelve la pregunta, afina o amplía la lectura; truncar no constituye una búsqueda completa.
- Carga una referencia o sección cuando cambie la decisión. Evita copiar catálogos y manuales completos en `AGENTS.md` o en la descripción de una skill.
- Reutiliza resultados vigentes y registra solo decisiones duraderas si hace falta continuidad. Un resumen debe conservar restricciones, evidencia, pendientes y referencias a la fuente; no crear memorias por cada interacción.
- Ejecuta las verificaciones necesarias y conserva evidencia de fallos. El ahorro no justifica omitir pruebas, esconder errores o delegar trabajo sin necesidad.

La [documentación oficial de skills](https://learn.chatgpt.com/docs/build-skills) y la [especificación](https://agentskills.io/specification) sustentan separar metadatos, instrucciones y referencias. Esta base aplica esa carga progresiva; no cambia configuración personal de Codex ni desactiva capacidades instaladas.

## 7. Cómo comprobar el ahorro

Usa tareas representativas con el mismo estado inicial, modelo, esfuerzo, alcance y criterios de aceptación. Separa tareas breves de exploración repetida. La base de comparación debe usar búsquedas acotadas y concisión normal, no lectura indiscriminada.

| Registrar en ambos modos | Para qué |
|---|---|
| Tokens de entrada, salida y razonamiento, si el host los informa | Distinguir dónde cambia el consumo; no sumar contadores que ya incluyen razonamiento |
| Caché y coste informado | Evitar tratar tokens en caché como ahorro de tokens o coste equivalente |
| Preparación, indexación, instrucciones añadidas y actualizaciones | Incluir el coste inicial y de mantenimiento |
| Tiempo, reintentos y lecturas adicionales | Detectar ahorro aparente que desplaza el trabajo |
| Pruebas, exactitud y requisitos conservados | Comprobar que el resultado sigue siendo útil |

Para el mismo contador y alcance: `ahorro (%) = 100 × (base - alternativa) / base`, con base mayor que cero. Un resultado negativo significa mayor consumo. Para coste monetario utiliza los importes reales o la tarifa aplicable por categoría, no la suma de tokens como si costaran igual.

Incluye el coste inicial una vez al evaluar varias tareas; separa primer uso de usos posteriores y compara condiciones de caché equivalentes. Repite tareas si es viable y reporta variación y tamaño de muestra. No sumes porcentajes de Caveman, Graphify y RTK: sus efectos pueden solaparse.

Si el entorno no ofrece contadores reales, registra bytes, líneas o estimaciones como **aproximaciones**, sin convertirlos en tokens facturados. Sin mediciones comparables, concluye «ahorro no medido». Menos texto no permite prometer mayor cuota de una suscripción.
