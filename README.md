# Inicio rápido: catálogo de skills para Codex

Este paquete **no instala** automáticamente skills externas. Añade:

- [AGENTS.md](AGENTS.md): reglas del proyecto y uso eficiente del contexto.
- [selector-de-skills](.agents/skills/selector-de-skills/SKILL.md): única skill propia incluida; selecciona capacidades según la tarea.
- [Catálogo](.agents/skills/selector-de-skills/references/catalogo.md): orientación de diseño, calidad, seguridad y ahorro de tokens.
- [Ahorro de tokens](.agents/skills/selector-de-skills/references/ahorro-tokens.md): comparación investigada de Caveman, Graphify, RTK y GitNexus, límites y medición.
- [INSTALACION.md](INSTALACION.md): ejemplos voluntarios y comprobaciones posteriores.

## Instalación del paquete
1. Copia el paquete en la **raíz** de un repositorio nuevo. Conserva la carpeta oculta `.agents` y sus subcarpetas. Si ya existen instrucciones, combina el contenido sin sobrescribirlas.
2. Abre Codex desde la raíz del repositorio.
3. Ajusta el bloque `Configuración específica por proyecto` de `AGENTS.md`.
4. Comprueba que Codex descubre `selector-de-skills` en su selector de skills (`/skills` en CLI/extensión); si no aparece, reinicia la sesión.
5. Instala **por separado**, tras revisar sus fuentes y autorizarlo, solo las opciones necesarias. Comprueba detección y funcionamiento en tu entorno.

## Ahorro de tokens: criterio de esta base

La base propone empezar sin dependencias: búsquedas concretas, lecturas parciales, referencias bajo demanda y respuestas breves. Añadir instrucciones también consume contexto; instalar más skills no asegura ahorrar.

| Si el gasto viene de… | Primera opción | Opción adicional evaluable |
|---|---|---|
| Respuestas demasiado largas | Pedir claridad y concisión | Caveman |
| Releer relaciones entre muchos archivos | Buscar símbolos y reutilizar hallazgos vigentes | Graphify **o** GitNexus |
| Salidas largas de comandos | Mostrar el resumen y conservar errores completos | RTK |
| Reintentos y contexto desactualizado | Verificar fuente, alcance e índice | Corregir el proceso antes de sumar herramientas |

El detalle, las fuentes primarias revisadas el **2026-11-10** y un método de comparación están en [Ahorro de tokens](.agents/skills/selector-de-skills/references/ahorro-tokens.md). No se ejecutó un benchmark ni se certifica un porcentaje de ahorro. En este paquete de Markdown, la búsqueda directa es suficiente; no se genera un grafo.

## Prueba de selección (prompt)

> Voy a crear [descripción del producto]. Usa `selector-de-skills` y AGENTS.md para recomendar las skills que ya están instaladas y son pertinentes. Identifica las no instaladas. No instales dependencias ni ejecutes scripts externos sin mi aprobación. Propón la arquitectura inicial y un primer incremento verificable.

Para un proyecto existente:

> Usa $selector-de-skills para reducir consumo en [tarea]. Identifica si el gasto viene de lectura, respuesta o comandos. Lee solo la referencia pertinente. Reutiliza herramientas instaladas; no instales nada. Propón una comparación con la búsqueda directa y respuestas concisas, conservando pruebas y precisión.

## Limitación importante
Un archivo con enlaces de GitHub solo funciona como catálogo informativo. Una skill debe estar accesible y ser descubierta por el agente; invocarla requiere además herramientas y permisos adecuados. Codex carga inicialmente metadatos y lee las instrucciones completas cuando selecciona la skill; mantén las referencias fuera de la carga habitual. La coincidencia automática no está garantizada. Consulta la [documentación oficial de skills](https://learn.chatgpt.com/docs/build-skills) para las rutas e invocación de tu versión.

El catálogo no pretende certificar seguridad, licencias, actualidad ni compatibilidad de cada repositorio. Lee primero el README y los archivos ejecutables, especialmente si tienen hooks, scripts, procesos de instalación o automatización Git.
