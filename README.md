# Inicio rápido: catálogo de skills para Codex

Este paquete **no instala** automáticamente skills externas. Añade:

- `AGENTS.md`: instrucciones generales aplicables a este proyecto.
- `.agents/skills/selector-de-skills/SKILL.md`: skill propia de selección.
- `.agents/skills/selector-de-skills/references/catalogo.md`: catálogo comentado de **18 repositorios/soluciones**.
- `INSTALACION.md`: ejemplos de instalación voluntaria y verificación.

## Instalación del paquete
1. Extrae el ZIP en la **raíz** de un repositorio nuevo. Conserva la carpeta oculta `.agents` y sus subcarpetas.
2. Abre Codex desde la raíz del repositorio.
3. Ajusta el bloque `Configuración específica por proyecto` de `AGENTS.md`.
4. Usa `/skills` para verificar si Codex descubre `selector-de-skills`; si no aparece, reinicia la sesión.
5. Instala **por separado**, tras revisar sus fuentes, las skills externas que realmente utilizarás. Comprueba después con `/skills`.

## Prueba de selección (prompt)

> Voy a crear [descripción del producto]. Usa `selector-de-skills` y AGENTS.md para recomendar las skills que ya están instaladas y son pertinentes. Identifica las no instaladas. No instales dependencias ni ejecutes scripts externos sin mi aprobación. Propón la arquitectura inicial y un primer incremento verificable.

## Limitación importante
Un archivo con enlaces de GitHub solo funciona como catálogo informativo. Codex carga una skill externa cuando **está instalada o accesible como skill válida**, su `name/description` coincide con la tarea y el entorno permite ejecutar sus procedimientos. La selección automática es probabilística; puedes invocar explícitamente una skill con `$nombre-skill` o `/skills`.

El catálogo no pretende certificar seguridad, licencias, actualidad ni compatibilidad de cada repositorio. Lee primero el README y los archivos ejecutables, especialmente si tienen hooks, scripts, procesos de instalación o automatización Git.
